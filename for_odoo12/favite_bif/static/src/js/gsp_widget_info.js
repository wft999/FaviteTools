odoo.define('favite_bif.GspWidgetInfo', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');
var dialogs = require('web.view_dialogs');

var Widget = require('web.Widget');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');

var QWeb = core.qweb;
var _t = core._t;

var WidgetZone = Widget.extend({
	template: 'favite_gsp.info_zone',
    events: {
    	'change input': '_onDataChange',
    	
    },

    _onDataChange: function(e){
    	var name = $(e.currentTarget).attr('name');
    	this.geo[this.curPolyline.type].objs[this.obj_id][name] = $(e.currentTarget)[0].value;
    	
    	this.trigger_up('field_changed', {
            dataPointID: this.getParent().getParent().state.id,
            changes:{geo:this.geo},
            noundo:true
        });
    },

    init: function(parent,curPolyline, geo,obj_id,readonly){
    	this.geo = geo;
    	this.obj_id = obj_id;
    	this.curPolyline = curPolyline;
    	this.readonly = readonly;

        return this._super.apply(this, arguments);
    },
   
    willStart: function () {
    	var self = this;
        return this._super.apply(this, arguments).then(function () {
            return $.when();
        });
    },
    
    start: function () {
        var self = this;
        return this._super.apply(this, arguments).then(function () {
        	self.$('input[name="level"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['level'] || 15;
        	self.$('input[name="darktol"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['darktol'] || 15;
        	self.$('input[name="brighttol"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['brighttol'] || 15;
        	self.$('input[name="longedgeminsize"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['longedgeminsize'] || 0;
        	self.$('input[name="longedgemaxsize"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['longedgemaxsize'] || 0;
        	self.$('input[name="shortedgeminsize"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['shortedgeminsize'] || 0;
        	self.$('input[name="shortedgemaxsize"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['shortedgemaxsize'] || 0;
        	return $.when();
        });
    },
});

var WidgetInfo = Widget.extend({
	template: 'favite_gsp.info',
    events: {

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
    
    updateState: function(state){
    	if(!this.getParent())
    		return;
    	
    	var self = this;
    	self.geo = {};
    	$.extend(true,self.geo,this.getParent().state.data.geo);
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
    		return;
    		
    	var readonly = this.getParent().mode == 'readonly'
    	var curPolyline = src.map.curPolyline;
    	this.geo = {};
    	$.extend(true,this.geo,this.getParent().state.data.geo);
    	
    	this.widget_info && this.widget_info.destroy();
    	this.widget_info = null;
    	this.$('.gsp_info').empty();
    	if(curPolyline){
    		var oid = _.findIndex(this.geo[curPolyline.type].objs,o=>{return _.isEqual(o.points,curPolyline.obj.points)});
    		if(curPolyline.type == 'zone'){
    			this.widget_info = new WidgetZone(this, curPolyline,this.geo,oid,readonly);
    			this.widget_info.appendTo('.gsp_info');
    		}
    	}
    },
    
});

widgetRegistry.add('subview_favite_bif_gsp_info', WidgetInfo);
return WidgetInfo;

});