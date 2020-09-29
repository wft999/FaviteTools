odoo.define('favite_bif.GspWidgetMapRaw', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var GspWidgetMap = require('favite_bif.GspWidgetMap');
var Raw = require('favite_common.WidgetMapRaw');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');
var Canvas = require('favite_common.Canvas');
var QWeb = core.qweb;
var _t = core._t;


var WidgetMapRaw = Raw.extend(GspWidgetMap,{
    events: {
//        'keydown.canvas-map': '_onKeydown'
    },

    init: function(){
    	this.offset = {x:0,y:0};
    	this.ratio = {x:1,y:1};
    	this.map_type = "raw";
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
        	
        	return $.when();
        });
    },
    
    _drawObjects: function(){
    	this._super.apply(this, arguments);
    	this._drawPeriod();
    },
    
    _drawPeriod:function(){    
    	if(this.period)
    		return;
    	if(!this.map)
    		return;
    	if(!this.image)
    		return;
    	
    	this.period = new Canvas.Period({ 
 			left: this.image.width/2, 
 			top: this.image.height/2,
 			visible:false
 			});
    	this.map.add(this.period);
    	this.period.bringToFront();
    	
    },
    
});


widgetRegistry.add('subview_favite_bif_gsp_raw', WidgetMapRaw);

});