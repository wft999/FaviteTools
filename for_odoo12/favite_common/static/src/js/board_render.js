odoo.define('favite_common.BoardRender', function (require) {
"use strict";

var core = require('web.core');
var config = require('web.config');
var local_storage = require('web.local_storage');

var FormRenderer = require('web.FormRenderer');

var Dialog = require('web.Dialog');

var _t = core._t;
var _lt = core._lt;
var QWeb = core.qweb;

return FormRenderer.extend({
	events: _.extend({}, FormRenderer.prototype.events, {
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
        var baseKey = this.getParent().modelName + '_' + this.state.data.id + '_';
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
        this._super.apply(this, arguments);

    },

    _renderTagBoard: function (node) {
        var self = this;
        this.$el.addClass('o_dashboard');
        
        node.columns = [];
        for (var i = 0; i < 3; i++) {
            node.columns.push({
                tag: 'column',
                attrs: {},
                children: []
            });
        }
        
        var baseKey = this.getParent().modelName + '_' + this.state.data.id + '_';
        node.attrs.layout = local_storage.getItem(baseKey+'layout') || "2-1";
        
        var $html = $('<div>').append($(QWeb.render('favite_common.DashBoard', {node: node})));

        _.each([0,1,2],function(col_id){
        	var actions = local_storage.getItem(baseKey + col_id) || "";
        	_.each(actions.split(','),function(action_id){
        		if (action_id == '')
        			return;
        		
        		var action = _.find(node.children,act => act.tag == 'action' && act.attrs.id == action_id)
        		if(action){
        			action.ready = true;
            		$html.find('.oe_dashboard_column.index_' + col_id).append(self._renderNode.bind(self)(action));
        		}
        		
        	});
        });
        _.each(node.children,function(action){
        	if(action.tag != 'action')
        		return;
        	if(action.ready)
        		return;

        	$html.find('.oe_dashboard_column.index_0').append(self._renderNode.bind(self)(action));
        });

        $html.find('.oe_dashboard_column').sortable({
            connectWith: '.oe_dashboard_column',
            handle: '.oe_header',
            scroll: false
        }).bind('sortstop', function () {
            self.trigger_up('save_dashboard');
        });

        return $html;
    },
    
    _renderTagAction: function (node) {
        var self = this;
        
        var baseKey = this.getParent().modelName + '_' + this.state.data.id + '_';
        node.attrs.fold = local_storage.getItem(baseKey + node.attrs.id + '_fold') || "false";
        node.attrs.fold = eval(node.attrs.fold.toLowerCase())

        var $html = $(QWeb.render('favite_common.DashBoard.action', {action: node}));
        _.each(node.children,function(child){
        	$html.find('.oe_content').append(self._renderNode.bind(self)(child))
        });
        
        //老的child仍然在__parentedChildren中
        var id = _.findLastIndex(self.__parentedChildren,{map_type:node.attrs.id});
        if(id != -1){
        	var map = self.__parentedChildren[id];
        	$html.on('click', '.oe_header button',map.onButtonsClick.bind(map) );
        }
        	
        
        return $html;
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
        
        this.trigger_up('save_dashboard');
    },
    /**
     * @private
     * @param {MouseEvent} event
     */
    _onCloseAction: function (event) {
        var self = this;
        var $container = $(event.currentTarget).parents('.oe_action:first');
        $container.toggle();
        this.trigger_up('save_dashboard');
    },


});


});
