odoo.define('lm_gate.GatewayRender', function (require) {
"use strict";

var core = require('web.core');
var config = require('web.config');
var local_storage = require('web.local_storage');

var BasicRenderer = require('web.FormRenderer');
var Dialog = require('web.Dialog');
var widgetRegistry = require('web.widget_registry');


var _t = core._t;
var _lt = core._lt;
var QWeb = core.qweb;

return BasicRenderer.extend({
	events: _.extend({}, BasicRenderer.prototype.events, {		
        'click .oe_dashboard_column .oe_fold': '_onFoldClick',
        'click .oe_dashboard_column .oe_close': '_onCloseAction',
    }),

    init: function () {
        this._super.apply(this, arguments);
    },

    start: function () {
        this._super.apply(this, arguments);
    },


    /**
     * @override
     */
    on_attach_callback: function () {
    	var self = this;
        this._super.apply(this, arguments);        
    },

    _renderView: function () {
        var self = this;
        this.$el
        .addClass('o_dashboard')
//        .removeClass('table-responsive')
        .empty();
        
        var layout =  "1-2";
        var $board = $(QWeb.render('lm_gate.DashBoard', {layout}));
        this.$el.append($board);
        
        var defs = [];
        var subviews = [{id:'thumb',string:'Gateway'},{id:'info',string:'Detail'}];

        _.each(subviews,function(subview,i){
        	if(subview.ready)
        		return;
        	
        	var parent = $board.find('.oe_dashboard_column.index_'+i);
        	defs.push(self._renderSubview(subview,parent));
        });
        
        return $.when(...defs);
    },
    
    _renderSubview: function (subview,parent) {
        var self = this;  
        var baseKey = this.getParent().getBaseKey();
        
        var Widget = widgetRegistry.get('subview_' + baseKey + subview.id) || widgetRegistry.get('subview_' + subview.id);
        var w = _.extend(new Widget(this),subview);
        w.fold =  false;
    	this.widgets.push(w);
    	

        if(subview.id == 'info'){
        	self.infoWidget = w;
        	
            var defs = [];
            this.defs = defs;
            var $form = this._renderNode(this.arch).addClass(this.className + ' oe_content');
            delete this.defs;

            return $.when.apply($, defs).then(function () {
            	return w.appendTo(parent).then(function(){
            		self.infoWidget.$el.find('div.o_form_view.oe_content').append($form.removeClass('o_form_view oe_content'));
            		//self.infoWidget.$el.append($form);
                    self._updateView($form);
                    if (self.state.res_id in self.alertFields) {
                        self.displayTranslationAlert();
                    }
            	})
            	
            }, function () {
                $form.remove();
            }).then(function(){
                if (self.lastActivatedFieldIndex >= 0) {
                    self._activateNextFieldWidget(self.state, self.lastActivatedFieldIndex);
                }
            });
        	
        }else if(subview.id == 'thumb'){
        	this.thumbWidget = w;
        	return w.appendTo(parent);
        }
    },
    
    _updateView: function ($form) {
        var self = this;

        // Set the new content of the form view, and toggle classnames

        $form.toggleClass('o_form_nosheet', !this.has_sheet);
        if (this.has_sheet) {
            this.$el.children().not('.oe_chatter')
                .wrapAll($('<div/>', {class: 'o_form_sheet_bg'}));
        }
        $form.toggleClass('o_form_editable', this.mode === 'edit');
        $form.toggleClass('o_form_readonly', this.mode === 'readonly');

        // Enable swipe for mobile when formview is in readonly mode and there are multiple records
        if (config.device.isMobile && this.mode === 'readonly' && this.state.count > 1) {
            this._enableSwipe();
        }

        // Attach the tooltips on the fields' label
        _.each(this.allFieldWidgets[this.state.id], function (widget) {
            var idForLabel = self.idsForLabels[widget.name];
            // We usually don't support multiple widgets for the same field on the
            // same view but it is the case with the new settings view on V11.0.
            // Therefore, we need to retrieve the correct label since it could be
            // displayed multiple times on the view, otherwise, for example the
            // enterprise label will be displayed as many times as the field
            // exists on settings.
            var $widgets = self.$('.o_field_widget[name=' + widget.name + ']');
            var $label = idForLabel ? self.$('.o_form_label[for=' + idForLabel + ']') : $();
            $label = $label.eq($widgets.index(widget.$el));
            if (config.debug || widget.attrs.help || widget.field.help) {
                self._addFieldTooltip(widget, $label);
            }
            if (widget.attrs.widget === 'upgrade_boolean') {
                // this widget needs a reference to its $label to be correctly
                // rendered
                widget.renderWithLabel($label);
            }
        });
    },
    
  //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------
    
    /**
     * @private
     * @param {MouseEvent} event
     */
    _onFoldClick: function (event) {
        var $e = $(event.currentTarget);
        var $action = $e.closest('.oe_action');
        var id = $action.data('id');

        $e.toggleClass('oe_minimize oe_maximize');
        $action.find('.oe_content').toggleClass('oe_folded');
        
        //this.saveBoard();

    },
    /**
     * @private
     * @param {MouseEvent} event
     */
    _onCloseAction: function (event) {
        var self = this;
        var $container = $(event.currentTarget).parents('.oe_action:first');
        $container.toggle();
        //this.saveBoard();
    },


});


});
