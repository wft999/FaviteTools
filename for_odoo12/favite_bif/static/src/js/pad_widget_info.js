odoo.define('favite_bif.PadWidgetInfo', function (require) {
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
    
    _onMapSelectChange:function(src){
    	if(this.getParent() !== src.getParent())
    		return
    		
    	var curPolyline = src.map.curPolyline;
    },
    
});

widgetRegistry.add('subview_favite_bif_pad_info', WidgetInfo);
return WidgetInfo;

});