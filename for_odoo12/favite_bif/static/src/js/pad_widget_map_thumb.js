odoo.define('favite_bif.PadWidgetMapThumb', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');
var widgetRegistry = require('web.widget_registry');

var PadWidgetMap = require('favite_bif.PadWidgetMap');
var Thumb = require('favite_common.WidgetMapThumb');
var framework = require('web.framework');
var Coordinate = require('favite_common.coordinate');
var QWeb = core.qweb;
var _t = core._t;


var WidgetMapThumb = Thumb.extend(PadWidgetMap,{
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
        	return self.LoadPanelMap();
        });
    },
    
    start: function () {
        var self = this;
        return this._super.apply(this, arguments).then(function () {
        	self.showMap();
    		self._drawHawk();
    		self._drawCorner();
    		self._drawMark();
        	return $.when();
        });
    },
    
    updateMap: function(sel){
    	var visible = sel.hasOwnProperty('mark');
    	this.mainmarkShow.forEach(function(obj){
    		obj.visible = visible;
 		});
    	
    	visible = sel.hasOwnProperty('submark');
    	this.submarkShow.forEach(function(obj){
    		obj.visible = visible;
 		});
    	
    	this._super.apply(this, arguments);
    },
    
    _showMark:function(markImg,obj,markShow,polyline){
    	var self = this;
    	
		var tempCanvas = new fabric.StaticCanvas();
	    tempCanvas.setDimensions({
	      width: obj.blocks[0].iInterSectionWidth+6,
	      height:_.reduce(obj.blocks, function(memo, block){return (memo + (block.iInterSectionHeight?block.iInterSectionHeight:0));}, 0)+6
	    });
	    
	    tempCanvas.add(markImg);
	    markImg.left = -obj.imgStartX +2;
	    markImg.top = -markImg.height + tempCanvas.height + 2;
	    markImg.setCoords();
	    
	    
	    tempCanvas.add(new fabric.Rect({
	    	left:3,
	    	top:3,
	    	width:tempCanvas.width -6,
	    	height:tempCanvas.height -6,
	    	fill:false,
	    	strokeWidth:3,
	    	stroke:'yellow'
	    }));
	    
	    tempCanvas.renderAll();
	    
	    var img = new Image();
	    img.onload = function() {
	    	var show = new fabric.Image(img, {
	    		left: polyline.points[0].x > (self.image.width/2)? (polyline.points[0].x - tempCanvas.width):(polyline.points[1].x),
	    		top: polyline.points[1].y > (self.image.height/2)? (polyline.points[1].y - tempCanvas.height):(polyline.points[0].y),
	    		hasControls: false,
	    	});
	    	markShow.push(show)
	    	self.map.add(show);
	    	self.map.renderAll();
	    }
	    img.src = tempCanvas.toDataURL();
    },
    
    _drawMark:function(){
    	var self = this;
    	if(!self.map || !self.map.polylines)
    		return;
    	
    	if(self.submarkShow){
    		self.submarkShow.forEach(function(obj){
    			self.map.remove(obj);
     		});
    		self.submarkShow = null;
		}
    	if(self.mainmarkShow){
    		self.mainmarkShow.forEach(function(obj){
    			self.map.remove(obj);
     		});
    		self.mainmarkShow = null;
		}
    	
    	self.submarkShow = new Array();
    	self.mainmarkShow = new Array();
    	
    	if(this.getParent().state.data.subMark_attachment_id){
    		var d = new Date();
    		var src = '/web/content/'+ this.getParent().state.data.subMark_attachment_id.res_id+'?t='+ d.getTime();
    		fabric.Image.fromURL(src, function(markImg) {
    			markImg.originX = 'left';
    			markImg.originY = 'top';
    			var imgStartX = 0;
    			
    			self.map&&self.map.polylines.forEach(function(p){
    	        	if(p.type != "submark")
    	        		return;
    	        	
    	        	p.obj.imgStartX = imgStartX;
    	        	self._showMark(markImg,p.obj,self.submarkShow,p);
    	        	imgStartX += p.obj.blocks[0].iInterSectionWidth;
            	});
    		});
    	}
    	
    	if(this.getParent().state.data.mainMark_attachment_id){
    		var d = new Date();
    		var src = '/web/content/'+ this.getParent().state.data.mainMark_attachment_id.res_id+'?t='+ d.getTime();
    		fabric.Image.fromURL(src, function(markImg) {
    			markImg.originX = 'left';
    			markImg.originY = 'top';
    			var imgStartX = 0;
    			
    			self.map&&self.map.polylines.forEach(function(p){
    	        	if(p.type != "mark")
    	        		return;
    	        	
    	        	p.obj.imgStartX = imgStartX;
    	        	self._showMark(markImg,p.obj,self.mainmarkShow,p);
    	        	imgStartX += p.obj.blocks[0].iInterSectionWidth;
            	});
    		});
    	}
    	
    	
    },
 
});

widgetRegistry.add('subview_favite_bif_pad_thumb', WidgetMapThumb);
return WidgetMapThumb;

});