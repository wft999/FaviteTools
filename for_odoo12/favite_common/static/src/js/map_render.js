odoo.define('favite_common.MapRender', function (require) {
"use strict";

var core = require('web.core');
var config = require('web.config');
var local_storage = require('web.local_storage');

var BasicRenderer = require('web.BasicRenderer');
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
     * @param {string} layout
     */
    changeLayout: function (layout) {
        var $dashboard = this.$('.oe_dashboard');
        var current_layout = $dashboard.attr('data-layout');
        if (current_layout !== layout) {
            var clayout = current_layout.split('-').length,
                nlayout = layout.split('-').length,
                column_diff = clayout - nlayout;
            if (column_diff > 0) {
                var $last_column = $();
                $dashboard.find('.oe_dashboard_column').each(function (k, v) {
                    if (k >= nlayout) {
                        $(v).find('.oe_action').appendTo($last_column);
                    } else {
                        $last_column = $(v);
                    }
                });
            }
            $dashboard.toggleClass('oe_dashboard_layout_' + current_layout + ' oe_dashboard_layout_' + layout);
            $dashboard.attr('data-layout', layout);
        }
    },
    
    saveBoard: function () {
        var self = this;
        var baseKey = this.getParent().getBaseKey();
        local_storage.setItem(baseKey+'layout',this.$('.oe_dashboard').attr('data-layout'))
        
        var col_id = 0;
        this.$('.oe_dashboard_column').each(function () {
        	var actions = [];
            $(this).find('.oe_action').each(function () {
            	var actionID = $(this).attr('data-id');
            	actions.push(actionID);

                var actionFold = $(this).find('.oe_content').hasClass('oe_folded');
                local_storage.setItem(baseKey + actionID+'_fold', actionFold);
            });
            
            local_storage.setItem(baseKey + col_id, actions.join(','))
            col_id++;
        });
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
        

        var baseKey = this.getParent().getBaseKey();
        var layout = local_storage.getItem(baseKey+'layout') || "2-1";
        var $board = $(QWeb.render('favite_common.DashBoard', {layout}));
        this.$el.append($board);
        
        var defs = [];
        var subviews = [{id:'thumb'},{id:'raw'},{id:'info',string:'Info'}];
        _.each([0,1,2],function(col_id){
        	var str = local_storage.getItem(baseKey + col_id) || "";
        	_.each(str.split(','),function(subview_id){
        		if (subview_id == '')
        			return;
        		
        		var subview = _.find(subviews,subview => subview.id == subview_id)
        		if(subview){
        			subview.ready = true;

        			var parent = $board.find('.oe_dashboard_column.index_' + col_id);
        			defs.push(self._renderSubview(subview,parent));
        		}
        		
        	});
        });
        _.each(subviews,function(subview){
        	if(subview.ready)
        		return;
        	
        	var parent = $board.find('.oe_dashboard_column.index_0');
        	defs.push(self._renderSubview(subview,parent));
        });

        $board.find('.oe_dashboard_column').sortable({
            connectWith: '.oe_dashboard_column',
            handle: '.oe_header',
            scroll: false
        }).bind('sortstop', function () {
            self.saveBoard();
        });
        
        return $.when(...defs);
    },
    
    _renderSubview: function (subview,parent) {
        var self = this;  
        var baseKey = this.getParent().getBaseKey();
        
        var Widget = widgetRegistry.get('subview_' + baseKey + subview.id) || widgetRegistry.get('subview_' + subview.id);
        var w = _.extend(new Widget(this),subview);
        w.fold = local_storage.getItem(baseKey + subview.id + '_fold') || "false";
    	w.fold = eval(w.fold.toLowerCase())
    	
    	this.widgets.push(w);

        if(subview.id == 'info'){
        	this.infoWidget = w;
        	//this.infoWidget.$el.find('.oe_content').append(self._renderTree.bind(self)());
        }else if(subview.id == 'raw'){
        	this.rawWidget = w;
        }else if(subview.id == 'thumb'){
        	this.thumbWidget = w;
        }
        
        return w.appendTo(parent);

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
        
        this.saveBoard();

    },
    /**
     * @private
     * @param {MouseEvent} event
     */
    _onCloseAction: function (event) {
        var self = this;
        var $container = $(event.currentTarget).parents('.oe_action:first');
        $container.toggle();
        this.saveBoard();
    },


});


});
