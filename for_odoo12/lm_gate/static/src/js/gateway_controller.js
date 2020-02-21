odoo.define('lm_gate.GatewayController', function (require) {
"use strict";

var core = require('web.core');
var config = require('web.config');
var BasicController = require('web.FormController');
var Dialog = require('web.Dialog');
var local_storage = require('web.local_storage');

var _lt = core._lt;
var _t = core._t;
var qweb = core.qweb;

return BasicController.extend({
	custom_events: _.extend({}, BasicController.prototype.custom_events, {
        //switch_botton_click:'_onSwitchBottonClick',
    }),
    events: {

    },
    
    init: function (parent, model, renderer, params) {

        this._super.apply(this, arguments);

    },
    
    start: function () {
        var self = this;

        return $.when(
            this._super.apply(this, arguments)
        ).then(function () {

            return $.when();
        });
    },
    
    getBaseKey: function(){
    	return this.modelName.replace('.','_') + '_' ;
    },
    
    _confirmSave: function (id) {
    	var self = this;
        if (id === this.handle) {
            if (this.mode === 'readonly') {
                return this.reload().then(function(){
                	
                });
            } else {

            	self._updateButtons();
                return this._setMode('readonly');
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
		
		if(event.data.changes)
			this._super.apply(this, arguments);
    },
    
    discardChanges: function(){
    	var self = this;
    	return this._super.apply(this, arguments).done(function(){
        	self.mode = 'readonly';
        	
        	self._updateButtons();
        	
        	_.invoke(self.renderer.widgets, 'updateState', null);
    	});
    },
    
    _onDiscard: function () {
        this.discardChanges();
    },
    
    _onSave: function (ev) {
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
        params = _.extend({viewType: 'gateway', mode: this.mode, noRender: false}, params);
        return this._super(params, options);
    },
    
    _update: function () {
    	var title = this.getTitle();
        this.set('title', title);
        this._updateButtons();
        this._updateSidebar();
        return this._super.apply(this, arguments).then(this.autofocus.bind(this));
    },
    
    
    _updateSidebar: function () {
        if (this.sidebar) {
            //this.sidebar.do_toggle(this.mode === 'readonly');
        }
    },
    
    _updateButtons: function () {
        if (this.$buttons) {
        	var edit_mode = (this.mode === 'edit');
            this.$buttons.find('.o_form_buttons_edit')
                         .toggleClass('o_hidden', !edit_mode);
            this.$buttons.find('.o_form_buttons_view')
            				.toggleClass('o_hidden', edit_mode);
            
        	this.$buttons.find('.o_form_button_save')
        				 .toggleClass('o_hidden', !this.isDirty());
//        	this.$buttons.find('.o_form_button_cancel')
//			 			 .toggleClass('o_hidden', !this.isDirty());
         }
    },
    
    _confirmChange: function() {
    	this._super.apply(this, arguments);
    	this._updateButtons();
    },
    
    renderButtons: function ($node) {
        this.$buttons = $('<div/>');

        this.$buttons.append(qweb.render("GatewayView.buttons", {widget: this}));
        this.$buttons.on('click', '.o_form_button_edit', this._onEdit.bind(this));
        this.$buttons.on('click', '.o_form_button_save', this._onSave.bind(this));
        this.$buttons.on('click', '.o_form_button_cancel', this._onDiscard.bind(this));

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

            this.renderButtons(elements.$buttons);
            //this.renderSidebar(elements.$sidebar);
            //this.renderSelect(elements.$searchview_buttons);
            // remove the unnecessary outer div
            elements = _.mapObject(elements, function($node) {
                return $node && $node.contents();
            });
           // elements.$switch_buttons = this._renderSwitchButtons();
        }

        return elements;
    },
    

  //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------


});

});