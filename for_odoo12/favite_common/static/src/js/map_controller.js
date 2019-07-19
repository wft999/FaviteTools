odoo.define('favite_common.MapController', function (require) {
"use strict";

var core = require('web.core');
var config = require('web.config');
var BasicController = require('web.BasicController');
var Dialog = require('web.Dialog');
var local_storage = require('web.local_storage');

var _lt = core._lt;
var _t = core._t;
var qweb = core.qweb;

return BasicController.extend({
	custom_events: _.extend({}, BasicController.prototype.custom_events, {
        switch_botton_click:'_onSwitchBottonClick',
    }),
    events: {

    },
    
    init: function (parent, model, renderer, params) {
    	this.changeStack = [];
    	this.changeStackIndex = -1;
        this._super.apply(this, arguments);

    },
    
    start: function () {
        var self = this;

        return $.when(
            this._super.apply(this, arguments)
        ).then(function () {
            $('.o_control_panel .o_cp_switch_buttons').removeClass('btn-group');

            return $.when();
        });
    },
    
    _confirmSave: function (id) {
    	var self = this;
        if (id === this.handle) {
            if (this.mode === 'readonly') {
                return this.reload().then(function(){
                	
                });
            } else {
            	self.changeStack = [{geo:self.renderer.state.data.geo}];
            	self.changeStackIndex = 0;
            	self._updateButtons();
                return this._setMode('edit');
            }
        } else {
            var record = this.model.get(this.handle);

            var containsChangedRecord = function (value) {
                return _.isObject(value) &&
                    (value.id === id || _.find(value.data, containsChangedRecord));
            };

            var changedFields = _.findKey(record.data, containsChangedRecord);
            return this.renderer.confirmChange(record, record.id, [changedFields]);
        }
    },
    
    _onFieldChanged: function (event) {
		if(event.data.redo ){
			if(this.changeStack.length > this.changeStackIndex + 1)
				event.data.changes = this.changeStack[++this.changeStackIndex];
		}else if(event.data.undo){
			if(this.changeStackIndex > 0 && this.changeStack.length > this.changeStackIndex)
				event.data.changes = this.changeStack[--this.changeStackIndex];
		}else if(event.data.noundo){

		}else{
			this.changeStack.push(event.data.changes);
			this.changeStackIndex++;
		}
		
		if(event.data.changes)
			this._super.apply(this, arguments);
    },
    
    discardChanges: function(){
    	var self = this;
    	return this._super.apply(this, arguments).done(function(){
    		self.changeStack = [{geo:self.renderer.state.data.geo}];
            self.changeStackIndex = 0;
        	self.mode = 'edit';
        	
        	self._updateButtons();
        	
        	_.invoke(self.renderer.widgets, 'updateState', null);
    	});
    },
    
    _onRedo: function(){
    	this.trigger_up('field_changed', {
            dataPointID: this.renderer.state.id,
            redo:true
        });
    },
    
    _onUndo: function(){
    	this.trigger_up('field_changed', {
            dataPointID: this.renderer.state.id,
            undo:true
        });
    },
    
    _onDiscard: function () {
        this.discardChanges();
    },
    
    _onSave: function (ev) {
    	this.changeStack = [];
    	this.changeStackIndex = -1;
        
        ev.stopPropagation(); // Prevent x2m lines to be auto-saved
        var self = this;
        this._disableButtons();
        this.saveRecord().always(function () {
            self._enableButtons();
        }).done(function(){
        	
        });
    },
    
    _onEdit: function () {
        this._setMode('edit');
    },
    
    
    update: function (params, options) {
    	options = _.extend({reload : false}, options);
        params = _.extend({viewType: 'map', mode: this.mode, noRender: true}, params);
        return this._super(params, options);
    },
    
    _update: function () {
    	var title = this.getTitle();
        this.set('title', title);
        this._updateButtons();
        this._updateSidebar();
        return this._super.apply(this, arguments).then();
    },
    
    
    _updateSidebar: function () {
        if (this.sidebar) {
            //this.sidebar.do_toggle(this.mode === 'readonly');
        }
    },
    
    _updateButtons: function () {
        if (this.$buttons) {
//            this.$buttons.find('.o_form_buttons_edit')
//                         .toggleClass('o_hidden', !this.isDirty());
        	this.$buttons.find('.o_form_button_save')
        				 .toggleClass('o_hidden', !this.isDirty());
        	this.$buttons.find('.o_form_button_cancel')
			 			 .toggleClass('o_hidden', !this.isDirty());
            this.$buttons.find('.o_form_button_redo')
                         .toggleClass('o_hidden', !(this.changeStack.length > this.changeStackIndex + 1));
            this.$buttons.find('.o_form_button_undo')
            			.toggleClass('o_hidden', !(this.changeStackIndex > 0 && this.changeStack.length > this.changeStackIndex));
        }
    },
    
    _confirmChange: function() {
    	this._super.apply(this, arguments);
    	this._updateButtons();
    },
    
    _getSource: function (req, resp) {
    	var types = Object.keys(this.renderer.state.data.geo);
    	types = _.filter(types,t=>_.has(this.renderer.state.data.geo[t],'objs'));
    	var source = _.map(_.difference(types,this.curSelect),function(item){
    		return {
    			label: item,
                value: item
                };
    	});

    	resp(source)
    },
    
    _onSelect: function (event, ui) {
        event.stopImmediatePropagation();
        event.preventDefault();

        var item = ui.item;
        if(!_.contains(this.curSelect,item.value)){
        	this.curSelect.push(item.value);
            this.renderSelect();
            this._updateMap();
        }
        
        return false;
    },
    
    getBaseKey: function(){
    	return this.modelName.replace('.','_') + '_' ;
    },
    
    _onUpdateColor: function (ev) {
        ev.preventDefault();
        var $target = $(ev.currentTarget);
        var color = $target.data('color');
        var id = $target.data('id');
        var $tag = this.$select.find(".badge[data-id='" + id + "']");
        var currentColor = $tag.data('color');
        if (color === currentColor) { return; }
        
        $tag.data('color',color);
        $tag.removeClass('o_tag_color_'+currentColor);
        $tag.addClass('o_tag_color_'+color);
        
        var baseKey = this.getBaseKey();
        local_storage.setItem(baseKey+id,color);
        this._updateMap();
    },
    
    _updateMap: function(){
    	var self = this;
    	var sel = {};
    	_.each(this.curSelect,function(item){
        	var baseKey = self.getBaseKey(); ;
        	sel[item] = local_storage.getItem(baseKey+item) || 'yellow';
        });
    	this.renderer.thumbWidget.updateMap(sel);
    	this.renderer.rawWidget.updateMap(sel);
    },
    
    renderSelect: function ($node) {
    	var self = this;
    	$node = $node || $('.o_cp_buttons');
    	this.$select && this.$select.remove();
    	
        this.$select = $('<div class="o_field_many2manytags o_input o_field_widget"/>');
        
        var types = Object.keys(this.renderer.state.data.geo);
    	types = _.filter(types,t=>_.has(this.renderer.state.data.geo[t],'objs'));

    	this.curSelect = this.curSelect || types;
        this.$select.append(qweb.render("FieldMany2ManyTag", {
            colorField: 'color',
            elements: _.map(self.curSelect,function(item){
            	var baseKey = self.getBaseKey();
                var color = local_storage.getItem(baseKey+item) || 'yellow';
            	return {id:item,color:color,display_name:item};
            }),
            hasDropdown: true,
            readonly: false,
        }));
        
        this.$select.appendTo($node);
        this.$select.find('.o_delete').click(function(event){
        	event.stopImmediatePropagation();
            event.preventDefault();
        	var index = $(event.target).parent().data('index');
        	self.curSelect.splice(index,1);
        	self.renderSelect();
        	self._updateMap();
        })
        
        _.each(this.$select.find('a.dropdown-toggle'),function(a){
        	var tagID = $(a).parent().data('id');
        	var $color_picker = $(qweb.render('colorpicker', {
                'tag_id': tagID,
            }));

            $(a).after($color_picker);
            $color_picker.dropdown();
            $color_picker.attr("tabindex", 1).focus();
            $color_picker.find('a').click(self._onUpdateColor.bind(self));
        });
        
        
        var $many2one = $('<div class="o_field_widget o_field_many2one"></div>');
        $many2one.append(qweb.render("FieldMany2One", {
        	widget:{
        		mode:'edit',
        		nodeOptions:{barcode_events:'no'},
        		attrs:{tabindex:-1,autofocus:false,placeholder:''},
        		noOpen:true,
        		idForLabel:''
        	}
        }))
        
        var $input = $many2one.find('input');
        
        $input.autocomplete({
        	source: $.proxy( this, "_getSource" ),
            select: $.proxy( this, "_onSelect" ),
            focus: function (event) {
                event.preventDefault(); // don't automatically select values on focus
            },
            close: function (event) {
                if (event.which === $.ui.keyCode.ESCAPE) {
                    event.stopPropagation();
                }
            },
            autoFocus: true,
            html: true,
            minLength: 0,
            delay: this.AUTOCOMPLETE_DELAY,
        });
        $input.autocomplete("option", "position", { my : "left top", at: "left bottom" });
        $input.click(function(){
        	if (this.autocomplete("widget").is(":visible")) {
        		this.autocomplete("close");
            } else {
            	this.autocomplete("search", ''); // search with the empty string
            }
        }.bind($input));
        

        $many2one.appendTo(this.$select);
    },

    
    renderButtons: function ($node) {
        this.$buttons = $('<div/>');

        this.$buttons.append(qweb.render("MapView.buttons", {widget: this}));
        this.$buttons.on('click', '.o_form_button_save', this._onSave.bind(this));
        this.$buttons.on('click', '.o_form_button_cancel', this._onDiscard.bind(this));
        this.$buttons.on('click', '.o_form_button_redo', this._onRedo.bind(this));
        this.$buttons.on('click', '.o_form_button_undo', this._onUndo.bind(this));
        this._assignSaveCancelKeyboardBehavior(this.$buttons.find('.o_form_buttons_edit'));
        this.$buttons.find('.o_form_buttons_edit').tooltip({
            delay: {show: 200, hide:0},
            title: function(){
                return qweb.render('SaveCancelButton.tooltip');
            },
            trigger: 'manual',
        });
        this._updateButtons();
        
        this.$buttons.appendTo($node);
    },
    
    _assignSaveCancelKeyboardBehavior: function ($saveCancelButtonContainer) {
        var self = this;
        $saveCancelButtonContainer.children().on('keydown', function(e) {
            switch(e.which) {
                case $.ui.keyCode.ENTER:
                    e.preventDefault();
                    self.saveRecord.apply(self);
                    break;
                case $.ui.keyCode.ESCAPE:
                    e.preventDefault();
                    self._discardChanges.apply(self);
                    break;
                case $.ui.keyCode.TAB:
                    if (!e.shiftKey && e.target.classList.contains("btn-primary")) {
                        $saveCancelButtonContainer.tooltip('show');
                        e.preventDefault();
                    }
                    break;
            }
        });
    },
    
    _renderControlPanelElements: function () {
        var elements = {};

        if (this.withControlPanel) {
            elements = {
                $buttons: $('<div>'),
                $sidebar: $('<div>'),
                $pager: $('<div>'),
                $searchview_buttons:$('<div>')
            };

            this.renderButtons(elements.$searchview_buttons);
            //this.renderSidebar(elements.$sidebar);
            this.renderSelect(elements.$buttons);
            // remove the unnecessary outer div
            elements = _.mapObject(elements, function($node) {
                return $node && $node.contents();
            });
            elements.$switch_buttons = this._renderSwitchButtons();
        }

        return elements;
    },
    
    _renderSwitchButtons: function () {
        var self = this;
        var buttons =[
        	[
        		//{accessKey:'l',icon:'fa-window-maximize',type:'maximize'},
        	],
        	[
        		//{accessKey:'l',icon:'fa-th-large',type:'layout'},
        		
        	]
        ];

        
        var baseKey = this.getBaseKey();
        var layout = local_storage.getItem(baseKey+'layout') || "2-1";
        var $switchButtons = $(qweb.render('favite_common.ControlPanel.SwitchButtons', {
        	buttons: buttons,
        	currentLayout:layout
        }));
        // create bootstrap tooltips
        _.each(buttons, function (button) {
            $switchButtons.filter('.o_cp_switch_' + button.type).tooltip();
        });
        // add onclick event listener
        var $switchButtonsFiltered = $switchButtons.find('button');
        $switchButtonsFiltered.click(_.debounce(function (event) {
            var buttonType = $(event.target).data('button-type');
            self.trigger_up('switch_botton_click', {button_type: buttonType});
        }, 200, true));
        
        $switchButtons.find('li').click(_.debounce(function (event) {
        	var layout = $(this).attr('data-layout');
            self.renderer.changeLayout(layout);
            self.renderer.saveBoard();
            
            $switchButtons.find('li i').addClass('o_hidden');
            $(this).find('i').removeClass('o_hidden');

        }, 200, true));

        if (config.device.isMobile) {
            // set active view's icon as view switcher button's icon
            var activeView = _.findWhere(buttons, {type: this.buttonType});
            $switchButtons.find('.o_switch_view_button_icon').addClass('fa fa-lg ' + activeView.icon);
        }

        return $switchButtons;
    },

  //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------
    _onSwitchBottonClick:function(event) {
    	event.stopPropagation();
    	if(event.data.button_type == 'layout'){
    		var currentLayout = this.$('.oe_dashboard').attr('data-layout');
    		this._changeLayout({currentLayout:currentLayout});
    	}else if(event.data.button_type == 'maximize'){
    		
    	}
    },
    
    _changeLayout: function (data) {
        var self = this;
        var dialog = new Dialog(this, {
        	size: 'medium',
            title: _t("Choose layout"),
            $content: qweb.render('favite_common.DashBoard.layouts', _.clone(data))
        });
        dialog.opened().then(function () {
            dialog.$('li').click(function () {
                var layout = $(this).attr('data-layout');
                self.renderer.changeLayout(layout);
                self.renderer.saveBoard();
                dialog.close();
            });
        });
        dialog.open();
    },


});

});