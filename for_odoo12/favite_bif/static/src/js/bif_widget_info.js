odoo.define('favite_bif.WidgetInfo', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var Widget = require('web.Widget');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');

//var InfoMask = require('favite_gmd.InfoMask');
//var InfoMark = require('favite_gmd.InfoMark');
var InfoBlock = require('favite_bif.InfoBlock');


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
    	var self = this;
    	self.geo = {};
    	$.extend(true,self.geo,this.getParent().state.data.geo);
    },
    
    _onMapSelectChange:function(curPolyline){
    	this.geo = {};
    	$.extend(true,this.geo,this.getParent().state.data.geo);
    	
    	this.widget_info && this.widget_info.destroy();
    	this.widget_info = null;
    	if(curPolyline){
    		var oid = _.findIndex(this.geo[curPolyline.type].objs,o=>{return _.isEqual(o.points,curPolyline.obj.points)});
    		if(curPolyline.type == 'block'){
    			this.widget_info = new InfoBlock(this, curPolyline,this.geo,oid);
    			this.widget_info.appendTo('.bif_info');
    		}
    	}
    },
    
});

widgetRegistry.add('subview_favite_bif_bif_info', WidgetInfo);
return WidgetInfo;

});