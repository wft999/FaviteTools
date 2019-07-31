odoo.define('padtool.Hawkmap2', function (require) {
"use strict";

var core = require('web.core');
var Widget = require('web.Widget');
var Mycanvas = require('padtool.Canvas');
var Dialog = require('web.Dialog');
var framework = require('web.framework');
var QWeb = core.qweb;
var _t = core._t;

var CROSSHAIR = "url(http://localhost/padtool/static/jpg/crosshair.png) 8 8,crosshair";
var HAWK_WIDTH = 600;
var HAWK_HEIGHT = 600;
var MAX_sIZE = 50000000;
var Hawkmap = Widget.extend({
    template: 'Hawkmap',
    events: {
        'mousedown .panel-heading': '_on_headMousedown',
        'click a.close': '_on_close',
        'click button.fa-mouse-pointer':'_onButtonSelectMode', 
        'click button.fa-search-plus':'_onButtonSelectMode', 
        'click button.fa-search-minus':'_onButtonSelectMode', 
        'click button.fa-edit':'_onButtonSelectMode', 
        'click button.fa-copy':'_onButtonSelectMode', 
        'click button.fa-cut':'_onButtonCut', 
    },

    init: function(parent,option){
    	this._x = this._y = 0;
    	this.handle = ".panel-heading";
    	this.minZoom = 1;
    	this.parent = parent;
        return this._super.apply(this, arguments);
    },
    
    start: function(){
    	this.map  = new fabric.Canvas('hawk',{
    		hoverCursor:'default',
    		stopContextMenu:true,
    		imageSmoothingEnabled:false
    		});
    	this.map.pads = new Array();
    	this.map.isPanel = false;
    	this.map.on('object:moving',_.debounce(this._onObjectMoving.bind(this), 100));
    	this.map.on('object:modified',this._onObjectModified.bind(this));
    	this.map.on('mouse:move',_.debounce(this._onMouseMove.bind(this), 100));    		
		
		this.map.on('mouse:up', this._onMouseUp.bind(this));
		this.map.on('mouse:down',this._onMouseDown.bind(this));
		
		//this.map.on('mouse:over',this._onMouseOver.bind(this));
		this.map.on('mouse:out', this._onMouseOut.bind(this));
		this.map.on('mouse:dblclick',this._onMouseDblclick.bind(this));
		
		this.map.on('selection:updated',this._onObjectSelect.bind(this));
		this.map.on('selection:created',this._onObjectSelect.bind(this));
		this.map.on('object:moved',this._onObjectMoved.bind(this));
    },
    
    destroy: function(){	
    	if(this.map){
    		this.map.clear();
    		delete this.map;
    	}
    	this._super.apply(this, arguments);
    },
    
    showImage: function(zoom){
    	this.map.clear();
    	this.image = null;
    	var left = this.parent.hawkeye.left - this.parent.hawkeye.scaleX*this.parent.hawkeye.width/2;
    	var right = this.parent.hawkeye.left + this.parent.hawkeye.scaleX*this.parent.hawkeye.width/2;
    	var top = this.parent.hawkeye.top - this.parent.hawkeye.scaleY*this.parent.hawkeye.height/2;
    	var bottom = this.parent.hawkeye.top + this.parent.hawkeye.scaleY*this.parent.hawkeye.height/2;
    	
    	if(left < 0) left = 0;
    	if(right > this.parent.image.width) right = this.parent.image.width;
    	if(top < 0) top = 0;
    	if(bottom > this.parent.image.height ) bottom = this.parent.image.height;
    	
    	this.parent.tmpCoordinate.GetRectIntersectionInfoInScanMapMatrix(left,this.parent.image.height-bottom,right,this.parent.image.height-top);
    	if(this.parent.tmpCoordinate.smpScanMapPara.m_ScanMap.length == 0){
    		return
    	}	
    	
    	var imgWidth = _.reduce(this.parent.tmpCoordinate.smpScanMapPara.m_ScanMap, function(memo, block){ 
    		return memo + (block[0]&&block[0].bHasIntersection?block[0].iInterSectionWidth:0); 
    		}, 0);
    	var imgHeight = _.reduce(this.parent.tmpCoordinate.smpScanMapPara.m_ScanMap[0], function(memo, block){ 
    		return memo  + (block&&block.bHasIntersection?block.iInterSectionHeight:0); 
    		}, 0);
    	
    	if(imgWidth == 0 || imgHeight == 0){
    		this.do_warn(_t('Incorrect Operation'),_t('Width  or height is 0!'),false);
    		return;
    	}
    		
    	
    	var self = this;
    	var image = new fabric.Image();
    	var strBlocks = JSON.stringify(this.parent.tmpCoordinate.smpScanMapPara.m_ScanMap);
    	console.log(strBlocks+'\n');
    	image.setSrc('/padtool/'+this.parent.glassName+'/curlimage'+imgWidth+'X'+imgHeight+'?strBlocks='+strBlocks, function(img) {
    		if(img.width == 0 || img.height == 0){
    			self.do_warn(_t('Incorrect Operation'),_t('Image is not exsit!'),false);
    			return;
    		}
        	if(self.image !== undefined)
        		delete self.image;

    		self.image = img;
        	
    		var x;
	 		var y;
        	if(zoom == undefined){
        		x= 0;
        		y = 0;
        		zoom = Math.max(HAWK_WIDTH/img.width,HAWK_HEIGHT/img.height);
        		self.minZoom = zoom;
        		self.map.setZoom(zoom);
        		self.map.setDimensions({width:img.width*zoom,height:img.height*zoom});
        	}else{
    	 		self.map.setZoom(zoom);
        		self.map.setDimensions({width:img.width*zoom,height:img.height*zoom});
        		x = self.map.width/2 - HAWK_WIDTH/2;
    	 		y = self.map.height/2 - HAWK_HEIGHT/2;
        	}
    		
    		if(self.map.width <= HAWK_WIDTH)
    			self.$(".canvas-map")[0].style.width = 1+self.map.width + 'px';
    		else
    			self.$(".canvas-map")[0].style.width = 1+HAWK_WIDTH + 'px';
    		
    		if(self.map.height <= HAWK_HEIGHT)
    			self.$(".canvas-map")[0].style.height = 1+self.map.height + 'px';
    		else
    			self.$(".canvas-map")[0].style.height = 1+HAWK_HEIGHT + 'px';
    		
    		self.$('div.canvas-map').scrollTop(y);
	 		self.$('div.canvas-map').scrollLeft(x);

    		self.eyeLeft = left;
    		self.eyeTop = top;
			self.drawPad();
        });
    	
    	
    	var hidden = false;
    	this.$el.find('.fa-edit').toggleClass('o_hidden',hidden);
    	this.$el.find('.fa-copy').toggleClass('o_hidden',hidden);
    	
    },
    
    drawPad:function(){
    	var self = this;
    	self.map.clear();
    	self.map.pads = new Array();
    	self.map.add(self.image.set({hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false}));
 		
    	this.parent.map.pads.forEach(function(obj){
    		var isCurPad = self.map.curPad && self.map.curPad.panelpad && self.map.curPad.panelpad == obj;
    		var left = self.parent.hawkeye.left - self.parent.hawkeye.scaleX*self.parent.hawkeye.width/2;
        	var right = self.parent.hawkeye.left + self.parent.hawkeye.scaleX*self.parent.hawkeye.width/2;
        	var top = self.parent.hawkeye.top - self.parent.hawkeye.scaleY*self.parent.hawkeye.height/2;
        	var bottom = self.parent.hawkeye.top + self.parent.hawkeye.scaleY*self.parent.hawkeye.height/2;
        	if((!isCurPad) && (!obj.intersectsWithRect(left,right,top,bottom)))
    			return;

    		var points = obj.points;
    		var pad = new Mycanvas.MyPolyline(self.map,obj.padType);

    		for(var i = 0; i < points.length; i++){
    			if(points[i].ux){
    				var tmp = self.parent.tmpCoordinate.UMCoordinateToScanMapMatrixCoordinate(points[i].ux,points[i].uy);
    				if(tmp.dOutputX == undefined){
    					var x = (points[i].x - self.eyeLeft)/self.parent.padConf[self.parent.panelName].panel_map_ratio_x;
        				var y= (points[i].y - self.eyeTop)/self.parent.padConf[self.parent.panelName].panel_map_ratio_y;
        				pad.points.push({x,y});
    				}else{
    					var x = tmp.dOutputX;
    					var y = self.image.height - tmp.dOutputY;

    					pad.points.push({x,y});
    				}
    				
    			}else{
    				pad.points.push({
        				x: (points[i].x - self.eyeLeft)/self.parent.padConf[self.parent.panelName].panel_map_ratio_x,
        				y: (points[i].y - self.eyeTop)/self.parent.padConf[self.parent.panelName].panel_map_ratio_y,
        			});
    			}
    		}
    		pad.update();
    		pad.panelpad = obj;
    		obj.hawkpad = pad;
    		if(self.map.curPad && self.map.curPad.panelpad && self.map.curPad.panelpad == obj){
    			self.map.curPad = pad;
    		}
    	});

		self.map.forEachObject(function(obj){
    		if(obj.type == 'cross')
    			obj.bringToFront();
    	});
		
		this._updateForMode();
    },
    
    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    _onObjectMoved: function(opt){
    	if(opt.target.type !== 'activeSelection'){
    		return;
    	}
    	
    	var zoom = this.map.getZoom();
    	var offsetX = (opt.e.offsetX - this.map.startPointer.x)/zoom;
		var offsetY = (opt.e.offsetY - this.map.startPointer.y)/zoom;
		
		var {dOutputX:ux1, dOutputY:uy1} = this.parent.tmpCoordinate.ScanMapMatrixCoordinateToUMCoordinate(opt.e.offsetX/zoom,this.image.height-opt.e.offsetY/zoom);
		var {dOutputX:ux2, dOutputY:uy2} = this.parent.tmpCoordinate.ScanMapMatrixCoordinateToUMCoordinate(this.map.startPointer.x/zoom,this.image.height-this.map.startPointer.y/zoom);
		var offsetXum = ux1 - ux2;
		var offsetYum = uy1 - uy2;
		
		var self = this;
		this.map.pads.forEach(function(pad){
			if(pad.padType != self.pad.curType)
				return;
			if(!pad.panelpad.selected)
				return;
			
			self.parent.register(pad.panelpad);
			var tmpPoints = _.clone(pad.panelpad.points);
			for(var i = 0; i < pad.points.length; i++){
    			pad.points[i].x += offsetX;
    			pad.points[i].y += offsetY;

    			pad.panelpad.points[i].ux += offsetXum;
    			pad.panelpad.points[i].uy += offsetYum;
    			let {dOutputX:x2, dOutputY:y2} = self.parent.coordinate.UMCoordinateToGlassMapCoordinate(pad.panelpad.points[i].ux,pad.panelpad.points[i].uy);
    			pad.panelpad.points[i].x = x2;
    			pad.panelpad.points[i].y = self.parent.image.height - y2;
    		}	
	    		
			pad.update();
    		pad.panelpad.update();
			self.parent.pad.isModified = true;	
		});
		
    },
    _onObjectSelect: function(opt){
    	if(opt.target.pad && opt.target.type === 'cross'){
    		this.curPad = opt.target.pad;
    		this._isSelectCross = true;
    		this._updateForMode();
    		
        	this.$el.find('.fa-cut').toggleClass('o_hidden',false);
        	this.map.renderAll();
    	}else{
    		this._isSelectCross = false;
    	}
    },

    _animate: function () {
    	var objs = this.map.getActiveObjects();
		if(objs.length && objs[0].animateColor){
			objs[0].animateColor();
			objs[0].dirty = true;
			this.map.renderAll();
		}
        
        setTimeout(this._animate.bind(this), 500);
      },
     
     _onObjectModified: function(opt){

     },
     
    _onObjectMoving: function(opt){
    	if(this.map.hoverCursor !== 'default')
    		return;
    	if(opt.target.type != "cross")
    		return;
    	
    	this._isSelectCross = true;

		{
			opt.target.pad.points[opt.target.id].x = opt.target.left;
			opt.target.pad.points[opt.target.id].y = opt.target.top;
			if(opt.target.pad){
	    		opt.target.pad.update();
	    		opt.target.pad.updateCross(true);
	    	}
			this.parent.register(opt.target.pad.panelpad);
			var {dOutputX:ux2, dOutputY:uy2} = this.parent.tmpCoordinate.ScanMapMatrixCoordinateToUMCoordinate(opt.target.left,this.image.height-opt.target.top);
			opt.target.pad.panelpad.points[opt.target.id].ux = ux2;
			opt.target.pad.panelpad.points[opt.target.id].uy = uy2;
			let {dOutputX:x2, dOutputY:y2} = this.parent.coordinate.UMCoordinateToGlassMapCoordinate(ux2,uy2);
			opt.target.pad.panelpad.points[opt.target.id].x = x2;
			opt.target.pad.panelpad.points[opt.target.id].y = this.parent.image.height - y2;
			opt.target.pad.panelpad.update();
			
			this.parent.pad.isModified = true;
		}
    	
    	this.map.renderAll();
    	this.parent.map.renderAll();
    	opt.e.stopPropagation();
        opt.e.preventDefault();
    },
    
    _onMouseDown:function(opt){
    	this.map.startPointer = opt.pointer;
    },
	_onMouseMove:function(opt){
/*		if(this.image){
			var x = opt.e.offsetX;
			var y = opt.e.offsetY;
			var zoom = this.map.getZoom();
			let {dOutputX:ux,dOutputY:uy} = this.parent.coordinate.ScanMapMatrixCoordinateToUMCoordinate(x/zoom,this.image.height-y/zoom);
			let {iIP, iScan} = this.parent.coordinate.JudgeIPScan_UM(ux,uy);
			let {dCustomerPointX:cx, dCustomerPointY:cy} = this.parent.coordinate.UmCoordinateToCustomerCoordinate(ux,uy);
			
			$(".map-info").text("IP("+iIP+") Scan("+iScan+") image("+Math.round(x/zoom)+","+Math.round(y/zoom)+") window("+x+","+y+") um("+Math.round(ux)+','+Math.round(uy) + ") Customer("+Math.round(cx)+","+Math.round(cy)+")");
		}*/
		
    	opt.e.stopPropagation();
        opt.e.preventDefault();
    		
	},
	_onMouseOut:function(opt){
		$(".map-info").text("");

	},
	
	_zoom:function(delta,x,y){
		var zoom = this.map.getZoom();
		var x1 = x / zoom;
   	 	var y1 = y / zoom;
   	 	var div = this.$('div.canvas-map').length? this.$('div.canvas-map'): this.$el;
		
   	 	zoom = zoom + delta;
   	 	zoom = Math.floor(zoom*10)/10;
   	 	if (zoom <= this.minZoom) zoom = this.minZoom;
   	 	if(MAX_sIZE < (this.image.width*zoom*this.image.height*zoom)){
   	 		let {dOutputX:ux1, dOutputY:uy1} = this.parent.tmpCoordinate.ScanMapMatrixCoordinateToUMCoordinate(x1,this.image.height-y1);
   	 		let {dOutputX:x2, dOutputY:y2} = this.parent.coordinate.UMCoordinateToGlassMapCoordinate(ux1,uy1);
   	 		this.parent.hawkeye.left = x2;
   	 		this.parent.hawkeye.top = this.parent.image.height - y2;
   	 		this.parent.hawkeye.width -= this.parent.hawkeye.width/10;
   	 		this.parent.hawkeye.height -= this.parent.hawkeye.height/10;
   	 		this.parent.hawkeye.setCoords();
   	 		this.parent.map.renderAll();
   	 		this.showImage(zoom);
   	 	}else{
   	 		x = x1 * zoom - (x - div.scrollLeft());
   	 		y = y1 * zoom - (y - div.scrollTop());
		
   	 		this.map.setZoom(zoom);
   	 		this.map.setDimensions({width:this.image.width*zoom,height:this.image.height*zoom});
   	 		
   	 		this.$('div.canvas-map').scrollTop(y);
   	 		this.$('div.canvas-map').scrollLeft(x);
   	 		
   	 	}
    },
    
    _onMouseUp:function(opt){
    	if(this.image == null)
    		return;
    	if(this.isGoaModified){
    		this.isGoaModified = false;
    		return;
    	}
    	
    	var zoom = this.map.getZoom();
    	var endPointer = _.clone(opt.pointer);
    	var _isDrawRect = this.map.startPointer.x != endPointer.x ||this.map.startPointer.y != endPointer.y;
		
    	if(!_isDrawRect && (this.map.hoverCursor == 'zoom-in' || this.map.hoverCursor == 'zoom-out')){
    		var delta = this.map.hoverCursor == 'zoom-in'?0.2:-0.2;
    		this._zoom(delta,opt.e.offsetX,opt.e.offsetY);
    		opt.e.preventDefault();
     		opt.e.stopPropagation();
    	}else if(!_isDrawRect && this.map.hoverCursor == 'copy'){
    		var self = this;
    		var firstId = _.findIndex(this.parent.map.pads,function(pad){return pad.selected && pad.points.length  && pad.padType == self.pad.curType})
    		if(firstId == -1){
    			self.do_warn(_t('Incorrect Operation'),_t('Please select one object!'),false);
    			return;
    		}

    		let {dOutputX:ux,dOutputY:uy} = this.parent.tmpCoordinate.ScanMapMatrixCoordinateToUMCoordinate(endPointer.x/zoom,this.image.height-endPointer.y/zoom);
    		var uoffsetX = ux - this.parent.map.pads[firstId].points[0].ux;
    		var uoffsetY = uy - this.parent.map.pads[firstId].points[0].uy;
    		
    		var tmp = this.parent.coordinate.UMCoordinateToGlassMapCoordinate(ux,uy);
    		endPointer.x = tmp.dOutputX;
    		endPointer.y = this.parent.image.height-tmp.dOutputY;
    		var offsetX = endPointer.x - this.parent.map.pads[firstId].points[0].x;
    		var offsetY = endPointer.y - this.parent.map.pads[firstId].points[0].y;

    		var pads = [];
    		this.parent.map.pads.forEach(function(obj){
    			if((!obj.selected) || (obj.padType !== self.pad.curType))
    				return;
    			
    			var pad = new Mycanvas.MyPolyline(self.parent.map,obj.padType);
	    		for(var i = 0; i < obj.points.length; i++){
	    			pad.points.push({
	    				x: obj.points[i].x + offsetX,
	    				y: obj.points[i].y + offsetY,
	    				ux: obj.points[i].ux + uoffsetX,
	    				uy: obj.points[i].uy + uoffsetY,
	    			});
	    		}
	    		pad.update();
	    		pads.push(pad);
				
    		});
    		this.parent.register(pads,'copy');
    		this.pad.isModified = true;
    		this.drawPad();
    	}else if(_isDrawRect && this.map.hoverCursor == CROSSHAIR){
    		var imgx1 = Math.min(this.map.startPointer.x,opt.pointer.x);
			var imgy1 = Math.max(this.map.startPointer.y,opt.pointer.y);
			let {dOutputX:ux,dOutputY:uy} = this.parent.tmpCoordinate.ScanMapMatrixCoordinateToUMCoordinate(imgx1/zoom,this.image.height-imgy1/zoom);
			var imgx2 = Math.max(this.map.startPointer.x,opt.pointer.x);
			var imgy2 = Math.min(this.map.startPointer.y,opt.pointer.y);
			let {dOutputX:ux2,dOutputY:uy2} = this.parent.tmpCoordinate.ScanMapMatrixCoordinateToUMCoordinate(imgx2/zoom,this.image.height-imgy2/zoom);
			
			var acrossIp = false;
				
			if(this.pad.curType != "mainMark" || acrossIp == false){
				this.parent.map.discardActiveObject();
				var pad = new Mycanvas.MyPolyline(this.parent.map,this.pad.curType);
				this.parent.register(pad);
				
				var tmp = this.parent.coordinate.UMCoordinateToGlassMapCoordinate(ux,uy);
				pad.points.push({x:tmp.dOutputX, y:this.parent.image.height-tmp.dOutputY,ux,uy});

	    		tmp = this.parent.coordinate.UMCoordinateToGlassMapCoordinate(ux2,uy2);
	    		pad.points.push({x:tmp.dOutputX, y:this.parent.image.height-tmp.dOutputY,ux:ux2,uy:uy2});
	    		pad.update();

				this.map.curPad = new Mycanvas.MyPolyline(this.map,this.pad.curType);
				this.map.curPad.points.push({x: imgx1/zoom, y: imgy1/zoom});
				this.map.curPad.points.push({x: imgx2/zoom, y: imgy2/zoom});
				this.map.curPad.update();

				this.map.curPad.panelpad = pad;
				pad.hawkpad = this.map.curPad;
				
	    		//this.pad.objs.push(pad);
	    		this.pad.isModified = true;
			}else{
				this.do_warn(_t('Incorrect Operation'),_t('Mark is across multiple IPs!'),false);
			}
    	}else if(!_isDrawRect && this.map.hoverCursor == CROSSHAIR ){
    		if(!this.map.curPad){
    			var pad = new Mycanvas.MyPolyline(this.parent.map,this.pad.curType);
				this.map.curPad = new Mycanvas.MyPolyline(this.map,this.pad.curType);
				this.map.curPad.panelpad = pad;
				pad.hawkpad = this.map.curPad;
			}
    		this.parent.register(this.map.curPad.panelpad);
    		
			let {dOutputX:ux,dOutputY:uy} = this.parent.tmpCoordinate.ScanMapMatrixCoordinateToUMCoordinate(endPointer.x/zoom,this.image.height-endPointer.y/zoom);
    		tmp = this.parent.coordinate.UMCoordinateToGlassMapCoordinate(ux,uy);

    		if(this.map.curPad.panelpad.addPoint({x:tmp.dOutputX, y:this.parent.image.height-tmp.dOutputY,ux,uy})){
    			this.map.curPad.addPoint({x: endPointer.x/zoom, y: endPointer.y/zoom})
    			this.pad.isModified = true;
    		}else{
    			this.do_warn(_t('Incorrect Operation'),_t('Please enter valid point!'),false);
    		}
    	}else if(this.map.hoverCursor == 'default'){
			if(this._isSelectCross){
				this._isSelectCross = false;
				return;
			}
			
			var x = opt.pointer.x/zoom;
			var y = opt.pointer.y/zoom;
			if(this.map.curPad){
				this.map.curPad = null;
				if(this.markShow){
					this.map.remove(this.markShow);
					this.markShow = null;
				}
			}
			
			this.map.discardActiveObject();
			var selected = new Array();
			for(var i = 0; i < this.map.pads.length; i++){
				if(this.map.pads[i].padType != this.pad.curType)
					continue;
				if(_isDrawRect){
					var left = Math.min(this.map.startPointer.x,opt.pointer.x)/zoom;
					var bottom = Math.max(this.map.startPointer.y,opt.pointer.y)/zoom;
					var right = Math.max(this.map.startPointer.x,opt.pointer.x)/zoom;
					var top = Math.min(this.map.startPointer.y,opt.pointer.y)/zoom;
					
					if(opt.e.ctrlKey){
						if(this.map.pads[i].withinRect(left,right,top,bottom)){
							this.map.pads[i].panelpad.selected = !this.map.pads[i].panelpad.selected;
						}
					}else{
						this.map.pads[i].panelpad.selected = this.map.pads[i].withinRect(left,right,top,bottom);
					}
				}else{
					if(opt.e.ctrlKey){
						if(this.map.pads[i].containsPoint({x,y})){
							this.map.pads[i].panelpad.selected = !this.map.pads[i].panelpad.selected;
						}
					}else{
						this.map.pads[i].panelpad.selected = false;
						if(this.map.curPad == null && this.map.pads[i].containsPoint({x,y})){
							this.map.curPad = this.map.pads[i];
						}
					}
				}
				if(this.map.pads[i].panelpad.selected){
					this.map.pads[i].crosses.forEach(function(c){selected.push(c);})
					this.map.pads[i].lines.forEach(function(c){selected.push(c);})
				}
			}
			if(selected.length > 0){
				var sel = new fabric.ActiveSelection(selected, {canvas: this.map,hasControls: false,hoverCursor:"move"});
				this.map.setActiveObject(sel);
			}
			
			//_isDrawRect && this.map.discardActiveObject();
			this.parent.updateForSelect();
	    	this.$el.find('.fa-cut').toggleClass('o_hidden',true);
		}

    	this._updateForMode();
    	this.map.renderAll();
    },
    
    _on_headMousedown: function(event){

        this._x = event.clientX - this.el.offsetLeft;
        this._y = event.clientY - this.el.offsetTop;
        
        event.preventDefault && event.preventDefault();
        this.$(this.handle)[0].setCapture && this.$(this.handle)[0].setCapture();	
        
        $(document).on('mousemove', this, this._on_headMousemove);
        $(document).on('mouseup', this, this._on_headMouseup);
    },
    _on_headMousemove : function (event)
    {
        event.preventDefault && event.preventDefault();   

        var y = event.clientY - event.data._y;
        var x = event.clientX - event.data._x;
        var w=window.innerWidth|| document.documentElement.clientWidth|| document.body.clientWidth;
        var h=window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight;
        
        if(y < 0)
        	y = 0;
        else if(y > h - 30)
        	y = h - 30;
        
        if(x < -event.data.el.clientWidth + 100)
        	x = -event.data.el.clientWidth + 100;
        else if(x > w - 100)
        	x = w - 100;
        
        event.data.el.style.top = y + "px";
        event.data.el.style.left = x + "px";
    },
    _on_headMouseup : function (event)
    {
    	event.data.$(this.handle)[0].releaseCapture && event.data.$(this.handle)[0].releaseCapture();
    	$(document).off('mousemove');
    	$(document).off('mouseup');
    },
    _on_close:function(){
    	this.parent.hawkeye.visible = false;
    	this.parent.map.renderAll();
    	
    	//delete this.parent.hawkmap;
    	//this.destroy();
    	this.do_hide();
    },
    
    _updateForMode:function(){
    	var self = this; 
    	this.map.forEachObject(function(obj){
			if(obj.pad && obj.pad.padType == self.pad.curType){
				if(obj.type === 'cross'){
					obj.lockMovementX = self.map.hoverCursor != 'default';
					obj.lockMovementY = self.map.hoverCursor != 'default';
					obj.hoverCursor = self.map.hoverCursor == 'default'?'move':'';
					obj.visible = (self.map.hoverCursor == 'default' && (obj.pad == self.map.curPad || obj.pad.padType == 'frame'))||
					(self.map.hoverCursor == CROSSHAIR && obj.pad == self.map.curPad);
					obj.hasBorders = obj.visible;
				}else if(obj.type === 'line'){
					if(obj.pad.panelpad.selected){
						obj.pad.lines.forEach(function(line){line.dirty=true;line.stroke = 'red';line.fill='red'})
					}else if(obj.pad == self.map.curPad){
						obj.pad.lines.forEach(function(line){line.dirty=true;line.stroke = 'GreenYellow';line.fill='GreenYellow'})
					}else{
						obj.pad.lines.forEach(function(line){
							line.dirty=true;
							if(obj.pad.padType == "uninspectZone"){
								line.fill = 'Cyan';
								line.stroke = 'Cyan';
					    	}else if(obj.pad.padType == "unregularInspectZone"){
								line.fill = 'fuchsia';
								line.stroke = 'fuchsia';
					    	}else{
					    		line.stroke = 'yellow';
								line.fill='yellow'
					    	}
						})
					}
				}
			}
		});
    	
    	this.map.requestRenderAll();
    },
    
    _onButtonSelectMode:function(e){
    	if(this.image == null)
    		return;
    	
    	if (e.currentTarget.dataset.mode !== 'crosshair')
    		this.map.hoverCursor = e.currentTarget.dataset.mode; 
    	else{
    		this.map.hoverCursor = CROSSHAIR
    	}
   		
   		
    	$('.panel-heading button').removeClass('active');
    	$(e.currentTarget).addClass('active');
    	
    	this._updateForMode();
    },
    
    _onButtonCut:function(){
    	if(this.image == null)
    		return;
    	
    	var objs = this.map.getActiveObjects();
    	if(objs.length == 1 && objs[0].type =='cross' && objs[0].pad.padType && objs[0].pad.padType == this.pad.curType && objs[0].pad.padType != 'frame'){
    		this.parent.register(objs[0].pad.panelpad);
    		var pad = objs[0].pad;
    		var crosses = objs[0].pad.crosses;
    		
    		for(var i =0 ; i<crosses.length; i++){
    			if(crosses[i] == objs[0]){
    				pad.removePoint(i);
    				pad.panelpad.removePoint(i);
    				
    				if(crosses.length == 0){
    					var length = this.pad.objs.length;
    	        		for(var i =0 ; i<length; i++){
    	        			if(this.pad.objs[i] == pad.panelpad){
    	        				this.pad.objs.splice(i,1);
    	        				break;
    	        			}
    	        		}
    				}
    				
    					
    	    		this.pad.isModified = true;
    				break;
    			}
    		}
    		
    	}else{
    		this.do_warn(_t('Incorrect Operation'),_t('Please select one object!'),false);
    	}
    	
    },
    
    _onMouseDblclick:function(opt){
    	if(this.image == null)
    		return;
    	if(this.map.hoverCursor !== 'default')
    		return;
    	
    	var zoom = this.map.getZoom();
    	var x = opt.pointer.x/zoom;
		var y = opt.pointer.y/zoom;
		
		for(var i = 0; i < this.map.pads.length; i++){
			if(this.map.pads[i].padType != this.pad.curType)
				continue;
			this.map.pads[i].panelpad.selected = false;
			if(this.map.curPad == null && this.map.pads[i].containsPoint({x,y})){
				this.map.curPad = this.map.pads[i];
			}
		}
    	
    },
    
    
});



return Hawkmap;

});