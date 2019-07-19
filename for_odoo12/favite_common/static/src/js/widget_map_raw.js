odoo.define('favite_common.WidgetMapRaw', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var WidgetMap = require('favite_common.WidgetMap');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');

var QWeb = core.qweb;
var _t = core._t;


var WidgetMapRaw = WidgetMap.extend({
    events: {
//        'keydown.canvas-map': '_onKeydown'
    },

    init: function(){
    	this.map_type = "raw";
    	this.blocks = [
    			[{iIPIndex:0,iScanIndex:0,iBlockIndex:0},{iIPIndex:0,iScanIndex:0,iBlockIndex:1}],
    			[{iIPIndex:0,iScanIndex:1,iBlockIndex:0},{iIPIndex:0,iScanIndex:1,iBlockIndex:1}]
    		]
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
        	
        	return self._LoadImage();
        });
    },
    
    
    _LoadImage(){
    	var self = this;
		var tempCanvas = new fabric.StaticCanvas();
		var first_block = this.blocks[0][0];
		var last_block = this.blocks[this.blocks.length-1][this.blocks[0].length-1];
		var width = last_block.iRange_Right - first_block.iRange_Left + 1;
		var height = last_block.iRange_Top - first_block.iRange_Bottom + 1;
		tempCanvas.setDimensions({width,height});
		
		this.offset = {x:first_block.iRange_Left,y:first_block.iRange_Bottom};
		
		var defs = [];
		for(var i = 0; i < self.blocks.length; i++){
			for(var j = 0; j < self.blocks[i].length; j++){
				var b = self.blocks[i][j];

	        	var src = self.image_path + '/Image/IP'+(b['iIPIndex']+1)+'/jpegfile/AoiL_IP'+b['iIPIndex']+'_scan'+b['iScanIndex']+'_block'+b['iBlockIndex']+'.jpg';
	        	var image = new fabric.Image();

	        	image.def = $.Deferred();
	        	image.setSrc(src, function(img){
	        		img.set({
	        			left: b.iRange_Left - first_block.iRange_Left,
	        			top: height - (b.iRange_Top - first_block.iRange_Top),
	        			hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false });
	        		tempCanvas.add(img);
	        		img.def.resolve();
	        	});
	        	defs.push(image.def);
			}
		}
		
		
	    
	    
/*	    tempCanvas.add(markImage);
	    markImage.left = -pad.panelpad.imgStartX +2;
	    markImage.top = -markImage.height + tempCanvas.height + 2;
	    markImage.setCoords();*/
	    
	    return $.when(...defs).then(function(){
	    	tempCanvas.renderAll();
		    
		    
		    var img = new Image();
		    var def = $.Deferred();
		    img.onload = function() {
		    	self.image = new fabric.Image(img, {left: 0,top: 0,hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false });
		    	//self.image.set({left: 0,top: 0,hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false });
		    	self.showMap();
		    	def.resolve();
		    }

		    img.src = tempCanvas.toDataURL();
		    
		    return $.when(def);
	    })
	    
    },
    
    _onHawkeyeChange(p){
    	this.coord.GetRectIntersectionInfoInBlockMapMatrix(p.x - 1000,p.y - 1000,p.x + 1000,p.y + 1000,true);
    	if(this.coord.bmpBlockMapPara.m_BlockMap.length == 0){
    		this.do_warn(_t('Incorrect Operation'),_t('Width  or height is 0!'),false);
    	}	
    	
    	var imgWidth = _.reduce(this.coord.bmpBlockMapPara.m_BlockMap, function(memo, block){ 
    		return memo + (block[0]&&block[0].bHasIntersection?block[0].iInterSectionWidth:0); 
    		}, 0);
    	var imgHeight = _.reduce(this.coord.bmpBlockMapPara.m_BlockMap[0], function(memo, block){ 
    		return memo  + (block&&block.bHasIntersection?block.iInterSectionHeight:0); 
    		}, 0);
    	
    	if(imgWidth == 0 || imgHeight == 0){
    		this.do_warn(_t('Incorrect Operation'),_t('Width  or height is 0!'),false);
    		return;
    	}
    	
    	this.blocks = this.coord.bmpBlockMapPara.m_BlockMap;
    	this._LoadImage();
    	
    	console.log(this.coord.bmpBlockMapPara.m_BlockMap)
    }
    
    
});


widgetRegistry.add('subview_raw', WidgetMapRaw);
return WidgetMapRaw;

});