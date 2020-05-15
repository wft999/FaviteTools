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

var PANEL_MAP_MARGIN = 10000;
var PANEL_MAP_RATE = 1/10;
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
        	var pos = self.cameraConf['image.dm.resizerate'].split(',');
        	self.ratio.x = 1/parseFloat(pos[0]);
        	self.ratio.y = 1/parseFloat(pos[1]);
        	
        	var dMapRatioX = self.ratio.x;
        	var dMapRatioY = self.ratio.y;
        	var dMapLeft = self.offset.x;
        	var dMapBottom = self.offset.y;
        	self.coord = new Coordinate(self.cameraConf,dMapRatioX,dMapRatioY,dMapLeft,dMapBottom);
        	
        	return $.when();
        });
    },
    
    start: function () {
        var self = this;
        
        return this._super.apply(this, arguments).then(function () {
        	return $.when();
        });
    },
    
    showMap: function(){
    	var self = this;

    	self.map  = new fabric.Canvas(self.$el.find('canvas')[0],{hoverCursor:'default',stopContextMenu:true,imageSmoothingEnabled:false});
    	self.map.add(self.image);

		self.resetMap();
		
		self.map.on('mouse:move',self._onMouseMove.bind(self));    		
		self.map.on('mouse:out', self._onMouseOut.bind(self));  
		self.map.on('mouse:up', self._onMouseUp.bind(self));
		self.map.on('mouse:down',self._onMouseDown.bind(self));
		self.map.on('mouse:wheel',self._onMouseWheel.bind(self));
		self.map.on('mouse:dblclick',self._onMouseDblclick.bind(self));
		
		this.map.on('object:moving',_.debounce(this._onObjectMoving.bind(this), 100));
		self.map.on('object:moved',self._onObjectMoved.bind(self));
		self.map.on('selection:updated',this._onObjectSelect.bind(this));
		self.map.on('selection:created',this._onObjectSelect.bind(this));
		
		self.map.polylines = [];
		self._drawObjects();
    },
    
    LoadPanelMap(){
    	var self = this;
    	self.image = new fabric.Image();
    	
    	var data = this.getParent().state.data;
    	var points = data.geo.panel.objs[0].points;
    	var left = Math.min(points[0].x,points[1].x) - PANEL_MAP_MARGIN;
    	var right = Math.max(points[0].x,points[1].x) + PANEL_MAP_MARGIN;
    	var top = Math.min(points[0].y,points[1].y) - PANEL_MAP_MARGIN;
    	var bottom = Math.max(points[0].y,points[1].y) + PANEL_MAP_MARGIN;
    	self.coord.GetRectIntersectionInfoInBlockMapMatrix(left,top,right,bottom,true);
    	if(self.coord.bmpBlockMapPara.m_BlockMap.length == 0 || self.coord.bmpBlockMapPara.m_BlockMap[0].length == 0){
    		self.do_warn(_t('Incorrect Operation'),_t('Width  or height is 0!'),false);
    		return $.when();
    	}
		var imgWidth = _.reduce(self.coord.bmpBlockMapPara.m_BlockMap, function(memo, block){ 
    		return memo + (block[0]&&block[0].bHasIntersection?block[0].iInterSectionWidth:0); 
    		}, 0);
    	var imgHeight = _.reduce(self.coord.bmpBlockMapPara.m_BlockMap[0], function(memo, block){ 
    		return memo  + (block&&block.bHasIntersection?block.iInterSectionHeight:0); 
    		}, 0);
    	var strBlocks = JSON.stringify(self.coord.bmpBlockMapPara.m_BlockMap);
    	
		var first_block = self.coord.bmpBlockMapPara.m_BlockMap[0][0];
		self.offset = {
				x:first_block.iRange_Left + first_block.iInterSectionStartX,
				y:first_block.iRange_Bottom + first_block.iInterSectionStartY
				};
    	
    	self.size = {x:imgWidth*PANEL_MAP_RATE,y:imgHeight*PANEL_MAP_RATE};
		self.ratio.x = PANEL_MAP_RATE;
    	self.ratio.y = PANEL_MAP_RATE;
		if(self.coord){
			delete self.coord;
		}
		
		var dMapRatioX = self.ratio.x;
    	var dMapRatioY = self.ratio.y;
    	var dMapLeft = self.offset.x;
    	var dMapBottom = self.offset.y;
    	self.coord = new Coordinate(self.cameraConf,dMapRatioX,dMapRatioY,dMapLeft,dMapBottom);

    	var def = $.Deferred();
    	var src = '/gmd/'+((data.gmd_id && data.gmd_id.res_id)|| data.id)+'/panel/'+data.geo.panel.objs[0].name+'/image';
    	//var src = self.image_path + '/'+data.geo.panel.objs[0].name +'.jpg';
    	self.image.setSrc(src, function(img){
    		if(img.width && img.height){
    			self.image.set({left: 0,top: 0,hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false,hasBorders:false });
        		def.resolve();
    		}else{
	    		self._rpc({
	                model: 'favite_gmd.gmd',
	                method: 'generate_panel_map',
	                args: [data.gmd_id.res_id,data.geo.panel.objs[0].name, imgWidth,imgHeight,strBlocks],
	            }).then(function (res) {
	            	self.image.setSrc(src, function(img){
	            		self.image.set({left: 0,top: 0,hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false,hasBorders:false });
	            	});
	            });
    		}
    	});
    	
    	
    	return $.when(def);
    },
    
    LoadGlassMap(){
    	var self = this;
    	
    	self.image = new fabric.Image();

    	var data = this.getParent().state.data;
    	//var src = self.image_path + '/glass.bmp';
    	var src = '/gmd/'+((data.gmd_id && data.gmd_id.res_id)|| data.id)+'/glass/image';

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
 			coord:this.glass.coord,
 			strokeWidth : 1/this.map.getZoom()
 			});
    	this.map.add(this.hawkeye);
    	this.hawkeye.bringToFront();
    },
    
    _drawCorner:function(){    
    	var left = 0;
    	var top = 0;
		switch(this.glass.corner){
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
 			cornerType:this.glass.corner
 			});
    	this.map.add(this.corner);
    	this.corner.bringToFront();
    },

});

widgetRegistry.add('subview_thumb', WidgetMapThumb);
return WidgetMapThumb;

});