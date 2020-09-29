odoo.define('favite_common.WidgetMapRaw', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var WidgetMap = require('favite_common.WidgetMap');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');
var Coordinate = require('favite_common.coordinate');
var Canvas = require('favite_common.Canvas');

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
        	core.bus.on('hawkeye_change', self, self._onHawkeyeChange.bind(self));

        	return $.when();
        });
    },
    
    showMap: function(){
    	var self = this;
    	var data = this.getParent().state.data;
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
        	self.map  = new fabric.Canvas(self.$el.find('canvas')[0],{hoverCursor:'default',stopContextMenu:true,imageSmoothingEnabled:false});
    		
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
			
			self.map.polylines = [];
    	}
    	
    	var strBlocks = JSON.stringify(this.hawkeyeObj.blocks);
    	var first_block = this.hawkeyeObj.blocks[0][0];
		var last_block = this.hawkeyeObj.blocks[this.hawkeyeObj.blocks.length-1][this.hawkeyeObj.blocks[0].length-1];
		var imgWidth = _.reduce(this.hawkeyeObj.blocks, function(memo, block){ 
    		return memo + (block[0]&&block[0].bHasIntersection?block[0].iInterSectionWidth:0); 
    		}, 0);
    	var imgHeight = _.reduce(this.hawkeyeObj.blocks[0], function(memo, block){ 
    		return memo  + (block&&block.bHasIntersection?block.iInterSectionHeight:0); 
    		}, 0);
		
		this.size = {x:imgWidth,y:imgHeight};
		this.offset = {
				x:first_block.iRange_Left + first_block.iInterSectionStartX,
				y:first_block.iRange_Bottom + first_block.iInterSectionStartY
				};
		
		if(self.coord){
			delete self.coord;
		}
		
		var dMapRatioX = self.ratio.x;
    	var dMapRatioY = self.ratio.y;
    	var dMapLeft = self.offset.x;
    	var dMapBottom = self.offset.y;
    	self.coord = new Coordinate(self.cameraConf,dMapRatioX,dMapRatioY,dMapLeft,dMapBottom);
    	
    	var image = new fabric.Image();
    	var id = data.gmd_id ? data.gmd_id.res_id : data.id;
    	image.setSrc('/gmd/'+id+'/image'+imgWidth+'X'+imgHeight+'?strBlocks='+strBlocks, function(img) {
    		if(img.width == 0 || img.height == 0){
    			self.do_warn(_t('Incorrect Operation'),_t('Image is not exsit!'),false);
    			return;
    		}
        	if(self.image !== undefined)
        		delete self.image;

    		self.image = img;
    		self.image.set({left: 0,top: 0,hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false,hasBorders:false });
    		self.map.add(img);
    		var p = self._geo2map(self.hawkeyeObj.point);
			self.map.viewportTransform[4] = (-p.x + dim.width/2)*self.map.getZoom();
		    self.map.viewportTransform[5] = (-p.y + dim.height/2)*self.map.getZoom();
		    
		    
		    self._drawObjects();
		    
		    self.map.requestRenderAll();
        });
    },
    
    _onHawkeyeChange:function(obj){
    	if(this.getParent() !== obj.src.getParent())
    		return
    		
    	this.hawkeyeObj = obj;
    	this.showMap();
    	console.log(obj.blocks)
    },
    

    

});


widgetRegistry.add('subview_raw', WidgetMapRaw);
return WidgetMapRaw;

});