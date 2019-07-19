odoo.define('favite_common.WidgetMapThumb', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');
var widgetRegistry = require('web.widget_registry');

var WidgetMap = require('favite_common.WidgetMap');
var framework = require('web.framework');
var Canvas = require('favite_common.Canvas');
var QWeb = core.qweb;
var _t = core._t;


var WidgetMapThumb = WidgetMap.extend({
    events: {
//        'keydown.canvas-map': '_onKeydown'
    },

    init: function(){
    	this.map_type = "thumb";
        return this._super.apply(this, arguments);
    },
   
    willStart: function () {
    	var self = this;
        return this._super.apply(this, arguments).then(function () {
        	return self._LoadImage();
            
        });
    },
    
    start: function () {
        var self = this;
        return this._super.apply(this, arguments).then(function () {
        	
        	self.showMap();
    		self._drawHawk();
        	return $.when();
        });
    },
    
    _LoadImage(){
    	var self = this;
    	self.image = new fabric.Image();

    	var src = self.image_path + '/glass.bmp';
    	var def = $.Deferred();
    	self.image.setSrc(src, function(img){
    		img.set({left: 0,top: 0,hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false });
    		
    		def.resolve();
    	});
    	
    	
    	return $.when(def);
    },
    
    _drawHawk:function(){    	
    	this.hawkeye = new Canvas.Hawkeye({ 
 			left: this.image.width/2, 
 			top: this.image.height/2,
 			width:100,
 			height:100,
 			});
    	this.map.add(this.hawkeye);
    	this.hawkeye.bringToFront();
    },

});

widgetRegistry.add('subview_thumb', WidgetMapThumb);
return WidgetMapThumb;

});