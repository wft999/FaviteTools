odoo.define('favite_common.WidgetMapRaw', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var WidgetMap = require('favite_common.WidgetMap');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');
var Coordinate = require('favite_common.coordinate');

var QWeb = core.qweb;
var _t = core._t;


var WidgetMapRaw = WidgetMap.extend({
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
        	core.bus.on('hawkeye_change', self, self._onHawkeyeChange);

        	return $.when();
        });
    },
    
    showMap: function(){
    	var self = this;
    	var dim = {width:self.$('.oe_content').width(),height:self.$('.oe_content').height()};
    	
    	if(self.map){
    		while(this.map.polylines && this.map.polylines.length){
    			var p = this.map.polylines.pop()
    			p.clear();
    			delete p.points;
    		}

    		this.map.clear();
    	}else{
    		var dim = {width:self.$('.oe_content').width(),height:self.$('.oe_content').height()};
        	self.map  = new fabric.Canvas(self.$el.find('canvas')[0],{hoverCursor:'default',stopContextMenu:true});
    		
    		self.map.setDimensions(dim);
    		self.map.on('mouse:move',self._onMouseMove.bind(self));    		
			self.map.on('mouse:out', self._onMouseOut.bind(self));  
			self.map.on('mouse:up', self._onMouseUp.bind(self));
			self.map.on('mouse:down',self._onMouseDown.bind(self));
			self.map.on('mouse:wheel',self._onMouseWheel.bind(self));
			
			self.map.on('object:moving',_.debounce(self._onObjectMoving.bind(self), 100));
			self.map.on('object:moved',self._onObjectMoved.bind(self));
			self.map.on('selection:updated',self._onObjectSelect.bind(self));
			self.map.on('selection:created',self._onObjectSelect.bind(self));
			
			var dMapRatioX = self.ratio.x;
	    	var dMapRatioY = self.ratio.y;
	    	var dMapLeft = self.offset.x;
	    	var dMapBottom = self.offset.y;
	    	self.coord = new Coordinate(self.cameraConf,dMapRatioX,dMapRatioY,dMapLeft,dMapBottom);
			
			self.map.polylines = [];
    	}
    	
    	var first_block = this.hawkeyeObj.blocks[0][0];
		var last_block = this.hawkeyeObj.blocks[this.hawkeyeObj.blocks.length-1][this.hawkeyeObj.blocks[0].length-1];
		var width = last_block.iRange_Right - first_block.iRange_Left;
		var height = last_block.iRange_Top - first_block.iRange_Bottom;
		
		this.size = {x:width,y:height};
		this.offset = {x:first_block.iRange_Left,y:first_block.iRange_Bottom};
		
		if(self.coord){
			delete self.coord;
		}
		
		var dMapRatioX = self.ratio.x;
    	var dMapRatioY = self.ratio.y;
    	var dMapLeft = self.offset.x;
    	var dMapBottom = self.offset.y;
    	self.coord = new Coordinate(self.cameraConf,dMapRatioX,dMapRatioY,dMapLeft,dMapBottom);
		
		var defs = [];
		for(var i = 0; i < self.hawkeyeObj.blocks.length; i++){
			for(var j = 0; j < self.hawkeyeObj.blocks[i].length; j++){
				var b = self.hawkeyeObj.blocks[i][j];

	        	var src = self.image_path + '/Image/IP'+(b['iIPIndex']+1)+'/jpegfile/AoiL_IP'+b['iIPIndex']+'_scan'+b['iScanIndex']+'_block'+b['iBlockIndex']+'.jpg';
	        	var image = new fabric.Image();
	        	image.set({
        			left: b.iRange_Left - first_block.iRange_Left,
        			top: height - (b.iRange_Top - first_block.iRange_Bottom),
        			flipY:true,
        			hasControls:false,
        			lockMovementX:true,
        			lockMovementY:true,
        			selectable:false });

	        	image.def = $.Deferred();
	        	image.setSrc(src, function(img){
	        		if(img.width > 0 && img.height > 0){
		        		self.map.add(img);
	        		}
	        		
	        		img.def.resolve();
	        	});
	        	defs.push(image.def);
			}
		}
		
		$.when(...defs).then(function(){
			var p = self._geo2map(self.hawkeyeObj.point);
			self.map.viewportTransform[4] = (-p.x + dim.width/2)*self.map.getZoom();
		    self.map.viewportTransform[5] = (-p.y + dim.height/2)*self.map.getZoom();
		    self.map.requestRenderAll();
		    
		    self._drawObjects();
	    })

    },
    
    _onHawkeyeChange(obj){
    	
    	
    	this.hawkeyeObj = obj;
    	this.showMap();
    	
    	console.log(obj.blocks)
    }
    
    
});


widgetRegistry.add('subview_raw', WidgetMapRaw);
return WidgetMapRaw;

});