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

var Coordinate = require('favite_common.coordinate');


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
        var pos = self.cameraConf['image.dm.resizerate'].split(',');
    	self.ratio.x = 1/parseFloat(pos[0]);
    	self.ratio.y = 1/parseFloat(pos[1]);
        return this._super.apply(this, arguments).then(function () {
        	self.showMap();
    		self._drawHawk();
    		self._drawCorner();
        	return $.when();
        });
    },
    
    showMap: function(){
    	var self = this;
    	
    	var dMapRatioX = self.ratio.x;
    	var dMapRatioY = self.ratio.y;
    	var dMapLeft = self.offset.x;
    	var dMapBottom = self.offset.y;
    	self.coord = new Coordinate(self.cameraConf,dMapRatioX,dMapRatioY,dMapLeft,dMapBottom);
    	
    	self.map  = new fabric.Canvas(self.$el.find('canvas')[0],{hoverCursor:'default',stopContextMenu:true});
    	self.map.add(self.image);

		self.resetMap();
		
		self.map.on('mouse:move',self._onMouseMove.bind(self));    		
		self.map.on('mouse:out', self._onMouseOut.bind(self));  
		self.map.on('mouse:up', self._onMouseUp.bind(self));
		self.map.on('mouse:down',self._onMouseDown.bind(self));
		self.map.on('mouse:wheel',self._onMouseWheel.bind(self));
		
		this.map.on('object:moving',_.debounce(this._onObjectMoving.bind(this), 100));
		self.map.on('object:moved',self._onObjectMoved.bind(self));
		self.map.on('selection:updated',this._onObjectSelect.bind(this));
		self.map.on('selection:created',this._onObjectSelect.bind(this));
		
		self.map.polylines = [];
		self._drawObjects();
    },
    
    _LoadImage(){
    	var self = this;
    	self.image = new fabric.Image();

    	var src = self.image_path + '/glass.bmp';

    	var def = $.Deferred();
    	self.image.setSrc(src, function(img){
    		img.set({left: 0,top: 0,hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false,hasBorders:false });
    		self.size = {x:img.width,y:img.height};

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
 			coord:this.geo.glass.coord
 			});
    	this.map.add(this.hawkeye);
    	this.hawkeye.bringToFront();
    },
    
    _drawCorner:function(){    
    	var left = 0;
    	var top = 0;
		switch(this.geo.glass.corner){
		case 1:
			left = this.image.width;
			top = 0;
			break;
		case 2:
			left = 0;
			top = 0;
			break;
		case 3:
			left = 0;
			top = this.image.height;
			break;
		case 4:
			left = this.image.width;
			top = this.image.height;
			break;
		}
    	this.corner = new Canvas.Corner({ 
    		left,
    		top,
 			cornerType:this.geo.glass.corner
 			});
    	this.map.add(this.corner);
    	this.corner.bringToFront();
    },

});

widgetRegistry.add('subview_thumb', WidgetMapThumb);
return WidgetMapThumb;

});