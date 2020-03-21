odoo.define('favite_bif.WidgetInfo', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');
var dialogs = require('web.view_dialogs');

var Widget = require('web.Widget');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');


var QWeb = core.qweb;
var _t = core._t;


var WidgetInfo = Widget.extend({
	template: 'favite_bif.info',
    events: {
    	'click tbody td.o_data_cell': '_onCellClick',
    },

    init: function(){
    	this.fold = false;
    	this.widget_info = null;
    	
    	
        return this._super.apply(this, arguments);
    },
   
   
    willStart: function () {
    	var self = this;
        return this._super.apply(this, arguments).then(function () {
        	self.geo = {};
        	$.extend(true,self.geo,self.getParent().state.data.geo);
            return $.when();
        });
    },
    
    start: function () {
        var self = this;
        return this._super.apply(this, arguments).then(function () {
        	core.bus.on('map_select_change', self, self._onMapSelectChange);
        	
        	
        	return $.when();
        });
    },
    
    destroy: function(){	
    	core.bus.off('map_select_change', this, this._onMapSelectChange);
    	this._super.apply(this, arguments);
    },
    
    
    updateState: function(state){
    	var self = this;
    	if(!this.getParent())
    		return;
    	self.geo = {};
    	$.extend(true,self.geo,this.getParent().state.data.geo);
    	self.$('td.o_data_cell').prop('special_click', true);
    },
    
    _openPanel: function () {
        var self = this;
        this._rpc({
            model: 'favite_bif.panel',
            method: 'get_formview_action',
            args: [[130]],
        })
        .then(function (action) {
            self.trigger_up('do_action', {action: action});
        });
    },
    
    _openPanelDialog: function () {
        var self = this;
        this._rpc({
                model: 'favite_bif.panel',
                method: 'get_formview_id',
                args: [[110]],
            })
            .then(function (view_id) {
                new dialogs.FormViewDialog(self, {
                    res_model: 'favite_bif.panel',
                    res_id: 110,
                    title: _t("Open: ") + self.string,
                    view_id: view_id,
                    readonly: false,
                }).open();
            });
    },
    
    _onMapSelectChange:function(src){
    	if(this.getParent() !== src.getParent())
    		return
    		
    	var curPolyline = src.map.curPolyline;
    	if(curPolyline /*&& this.geo[curPolyline.type]*/){
    		var oid = _.findIndex(this.geo[curPolyline.type].objs,o=>{return _.isEqual(o.points,curPolyline.obj.points)});
    		if(curPolyline.type == 'panel'){
    			//this._openPanel();
    		}
    	}
    },
    
    _onCellClick: function (event) {
        // The special_click property explicitely allow events to bubble all
        // the way up to bootstrap's level rather than being stopped earlier.
//        if (this.getParent().mode == 'readonly' || $(event.target).prop('special_click')) {
//            return;
//        }
    	event.stopPropagation();
        var $td = $(event.currentTarget);
        var $tr = $td.parent();
        var rowIndex = this.$('.o_data_row').index($tr);
        var fieldIndex = Math.max($tr.find('.o_data_cell').not('.o_list_button').index($td), 0);

        var record = this.getParent().state.data.panel_ids.data[rowIndex];
        
        this.getParent().thumbWidget.map.polylines.forEach(function(p){
        	var sel = p.obj.name == record.data.name;
        	p.focus(sel);
        	p.select(sel);
        })
        this.getParent().thumbWidget.map.renderAll();
    },
    
});

widgetRegistry.add('subview_favite_bif_bif_info', WidgetInfo);
return WidgetInfo;

});