odoo.define('favite_common.TreeRender', function (require) {
"use strict";

var core = require('web.core');
var config = require('web.config');
var local_storage = require('web.local_storage');

var ListRenderer = require('web.ListRenderer');
var Dialog = require('web.Dialog');
var widgetRegistry = require('web.widget_registry');


var _t = core._t;
var _lt = core._lt;
var QWeb = core.qweb;

return ListRenderer.extend({
	events: _.extend({}, ListRenderer.prototype.events, {
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
        var baseKey = this.getParent().modelName + '_';
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
    
    _renderTree: function () {
        var self = this;

        // destroy the previously instantiated pagers, if any
        _.invoke(this.pagers, 'destroy');
        this.pagers = [];

        var displayNoContentHelper = !this._hasContent() && !!this.noContentHelp;
        // display the no content helper if there is no data to display
        if (displayNoContentHelper) {
            return this._renderNoContentHelper();
        }

        var $table = $('<table>').addClass('o_list_view table table-sm table-hover table-striped');

        this._computeAggregates();
        $table.toggleClass('o_list_view_grouped', this.isGrouped);
        $table.toggleClass('o_list_view_ungrouped', !this.isGrouped);
        this.hasHandle = this.state.orderedBy.length === 0 ||
            this.state.orderedBy[0].name === this.handleField;
        if (this.isGrouped) {
            $table
                .append(this._renderHeader(true))
                .append(this._renderGroups(this.state.data))
                .append(this._renderFooter());
        } else {
            $table
                .append(this._renderHeader())
                .append(this._renderBody())
                .append(this._renderFooter());
        }
        if (this.selection.length) {
            var $checked_rows = this.$('tr').filter(function (index, el) {
                return _.contains(self.selection, $(el).data('id'));
            });
            $checked_rows.find('.o_list_record_selector input').prop('checked', true);
        }
        return $table;
    },

    _renderView: function () {
        var self = this;
        this.$el
        .addClass('o_dashboard')
        .removeClass('table-responsive')
        .empty();
        

        var baseKey = this.getParent().modelName + '_' ;
        var layout = local_storage.getItem(baseKey+'layout') || "2-1";
        var $board = $('<div>').append($(QWeb.render('favite_common.DashBoard', {layout})));
        this.$el.append($board);

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
        			self._renderSubview(subview,parent);
        		}
        		
        	});
        });
        _.each(subviews,function(subview){
        	if(subview.ready)
        		return;

        	var parent = $board.find('.oe_dashboard_column.index_0');
			self._renderSubview(subview,parent);
        });

        $board.find('.oe_dashboard_column').sortable({
            connectWith: '.oe_dashboard_column',
            handle: '.oe_header',
            scroll: false
        }).bind('sortstop', function () {
            self.saveBoard();
        });

        return $.when();
    },
    
    _renderSubview: function (subview,parent) {
        var self = this;  
        var baseKey = this.getParent().modelName + '_';
        
        var Widget = widgetRegistry.get('subview_' + subview.id);
        var w = _.extend(new Widget(this),subview);
        w.fold = local_storage.getItem(baseKey + subview.id + '_fold') || "false";
    	w.fold = eval(w.fold.toLowerCase())
    	w.appendTo(parent);

        if(subview.id == 'info'){
        	this.infoWidget = w;
        	this.infoWidget.$el.find('.oe_content').append(self._renderTree.bind(self)())
        }else if(subview.id == 'raw'){
        	this.rawWidget = w;
        }else if(subview.id == 'thumb'){
        	this.thumbWidget = w;
        }

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
