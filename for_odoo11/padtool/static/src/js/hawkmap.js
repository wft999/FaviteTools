odoo.define('padtool.Hawkmap', function (require) {
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
    	
    	this.parent.coordinate.GetRectIntersectionInfoInBlockMapMatrix(left,this.parent.image.height-bottom,right,this.parent.image.height-top);
    	if(this.parent.coordinate.bmpBlockMapPara.m_BlockMap.length == 0){
    		return
    	}	
    	
    	var imgWidth = _.reduce(this.parent.coordinate.bmpBlockMapPara.m_BlockMap, function(memo, block){ 
    		return memo + (block[0]&&block[0].bHasIntersection?block[0].iInterSectionWidth:0); 
    		}, 0);
    	var imgHeight = _.reduce(this.parent.coordinate.bmpBlockMapPara.m_BlockMap[0], function(memo, block){ 
    		return memo  + (block&&block.bHasIntersection?block.iInterSectionHeight:0); 
    		}, 0);
    	
    	if(imgWidth == 0 || imgHeight == 0){
    		this.do_warn(_t('Incorrect Operation'),_t('Width  or height is 0!'),false);
    		return;
    	}
    		
    	
    	var self = this;
    	var image = new fabric.Image();
    	var strBlocks = JSON.stringify(this.parent.coordinate.bmpBlockMapPara.m_BlockMap);
    	console.log(strBlocks+'\n');
    	image.setSrc('/padtool/'+this.parent.glassName+'/image'+imgWidth+'X'+imgHeight+'?strBlocks='+strBlocks, function(img) {
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
    	
    	
    	var hidden = this.pad.curType == 'frame' || (this.pad.curType == 'subMark' && this.parent.isPolygonSubMark==false);
    	this.$el.find('.fa-edit').toggleClass('o_hidden',hidden);
    	this.$el.find('.fa-copy').toggleClass('o_hidden',hidden);
    	
    },
    
    drawPad:function(){
    	var self = this;
    	self.map.clear();
    	self.map.pads = new Array();
    	self.map.add(self.image.set({hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false}));

    	var x1 = this.parent.inspectZoneX1;
 		var y1 = this.parent.inspectZoneY1;
 		var x2 = this.parent.inspectZoneX2;
 		var y2 = this.parent.inspectZoneY2;
 		x1 = (x1 - self.eyeLeft)/self.parent.padConf[self.parent.panelName].panel_map_ratio_x;
		y1= (y1 - self.eyeTop)/self.parent.padConf[self.parent.panelName].panel_map_ratio_y;
		x2 = (x2 - self.eyeLeft)/self.parent.padConf[self.parent.panelName].panel_map_ratio_x;
		y2= (y2 - self.eyeTop)/self.parent.padConf[self.parent.panelName].panel_map_ratio_y;

		var line1 = new Mycanvas.Line([x1,y1,x1,y2],{stroke: 'blue',pad:null});
 		var line2 = new Mycanvas.Line([x1,y1,x2,y1],{stroke: 'blue',pad:null});
 		var line3 = new Mycanvas.Line([x2,y2,x2,y1],{stroke: 'blue',pad:null});
 		var line4 = new Mycanvas.Line([x2,y2,x1,y2],{stroke: 'blue',pad:null});
 		this.map.add(line1,line2,line3,line4);
 		
 		var wh = 10/this.map.getZoom();
 		var center = new Mycanvas.Cross({ 
			type:'center',lockMovementX:true,lockMovementY:true,selectable:false,
			visible:true,
			id:0,
			left: self.image.width/2, 
			top: self.image.height/2,
			width:wh,
			height:wh,
			stroke:'red'
			});
		self.map.add(center);
 		
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
    				var tmp = self.parent.coordinate.UMCoordinateToHawkmapCoordinate(points[i].ux,points[i].uy);
    				if(tmp.iOutputX == undefined){
    					var x = (points[i].x - self.eyeLeft)/self.parent.padConf[self.parent.panelName].panel_map_ratio_x;
        				var y= (points[i].y - self.eyeTop)/self.parent.padConf[self.parent.panelName].panel_map_ratio_y;
        				pad.points.push({x,y});
    				}else{
    					var x = tmp.iOutputX;
    					var y = self.image.height - tmp.iOutputY;

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
    		
    		var lineVisible = pad.padType == self.parent.pad.curType 
    		|| (pad.padType == 'region' && self.parent.pad.curType == 'frame')
    		|| ((pad.padType == 'inspectZone'||pad.padType == 'unregularInspectZone') && self.parent.pad.curType == 'uninspectZone')
			|| ((pad.padType == 'uninspectZone'||pad.padType == 'unregularInspectZone') && self.parent.pad.curType == 'inspectZone')
			|| ((pad.padType == 'uninspectZone'||pad.padType == 'inspectZone') && self.parent.pad.curType == 'unregularInspectZone');
    		var crossVisible = lineVisible && (pad.padType == 'frame' || self.map.curPad == pad);
    		pad.lines.forEach(function(line){line.visible = lineVisible;});
    		pad.crosses.forEach(function(cross){cross.visible = crossVisible;cross.hasBorders = cross.visible;})

    		
    		if(obj.padType == 'inspectZone' && ((obj.periodX != undefined && obj.periodX != 0) || (obj.periodY != undefined && obj.periodY != 0))){
 				var angle,period;
    			if(obj.periodY == 0){
 					angle = fabric.util.degreesToRadians(90);
 					period = obj.periodX;
 				}else if(obj.periodX == 0){
 					angle = fabric.util.degreesToRadians(0);
 					period = obj.periodY;
 				}else{
 					angle = Math.atan(obj.periodX/obj.periodY);
 					period = obj.periodY / fabric.util.cos(angle);
 				}
    			period = period / self.parent.coordinate.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionY;
 				
    			var minX,minY,maxX,maxY;
    			pad.points.forEach(function(p){
        			minX = minX == undefined?p.x:(p.x>minX?minX:p.x);
        			minY = minY == undefined?p.y:(p.y>minY?minY:p.y);
        			maxX = maxX == undefined?p.x:(p.x<maxX?maxX:p.x);
        			maxY = maxY == undefined?p.y:(p.y<maxY?maxY:p.y);
        		})
        		var goa_left = (minX+maxX)/2;
        		var goa_top = (minY+maxY)/2;
        		if(obj.goaUX || obj.goaUY){
        			var tmp = self.parent.coordinate.UMCoordinateToHawkmapCoordinate(obj.goaUX,obj.goaUY);
        			if(tmp.iOutputX !== undefined && tmp.iOutputY !== undefined){
        				goa_left = tmp.iOutputX;
            			goa_top = self.image.height - tmp.iOutputY;
        			}
        		}
    			pad.goa = new Mycanvas.Goa({
    				left:goa_left,
        			top:goa_top,
 	    			pad:pad,
 	    			period:period,
					angle:fabric.util.radiansToDegrees(angle),
					visible:false,
					hoverCursor:'move'
 	    		}); 
 	        	self.map.add(pad.goa);
 			}
    		
    	});

		self.map.forEachObject(function(obj){
    		if(obj.type == 'cross')
    			obj.bringToFront();
    	});
		
		this._updateForMode();
		
		//self.map.renderAll();
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
		
		var {dOutputX:ux1, dOutputY:uy1} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(opt.e.offsetX/zoom,this.image.height-opt.e.offsetY/zoom);
		var {dOutputX:ux2, dOutputY:uy2} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(this.map.startPointer.x/zoom,this.image.height-this.map.startPointer.y/zoom);
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
    			let {dOutputX:x2, dOutputY:y2} = self.parent.coordinate.UMCoordinateToPanelMapCoordinate(pad.panelpad.points[i].ux,pad.panelpad.points[i].uy);
    			pad.panelpad.points[i].x = x2;
    			pad.panelpad.points[i].y = self.parent.image.height - y2;
    		}	
			if(pad.padType == 'mainMark'){
    			var panelpad = pad.panelpad;
				var left = Math.min(panelpad.points[0].ux,panelpad.points[1].ux);
				var right = Math.max(panelpad.points[0].ux,panelpad.points[1].ux);
				var bottom = Math.min(panelpad.points[0].uy,panelpad.points[1].uy);
				var top = Math.max(panelpad.points[0].uy,panelpad.points[1].uy);
				self.parent.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(left,bottom,right,top,true);
        		if(self.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap.length == 1){
        			pad.panelpad.blocks = _.map(self.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0],function(item){
        	    		return {
        	    			iIPIndex:item.iIPIndex,
        	    			iScanIndex:item.iScanIndex,
        	    			iBlockIndex:item.iBlockIndex,
        	    			iInterSectionStartX:item.iInterSectionStartX,
        	    			iInterSectionStartY:item.iInterSectionStartY,
        	    			iInterSectionWidth:item.iInterSectionWidth,
        	    			iInterSectionHeight:item.iInterSectionHeight,
        	    			iBlockMapHeight:item.iBlockMapHeight
        	    			};
        	    		});
        			
        			self.pad.isMainMarkModified = true;
        		}else{
        			for(var i = 0; i < pad.points.length; i++){
    	    			pad.points[i].x -= offsetX;
    	    			pad.points[i].y -= offsetY;
    	    			
    	    			pad.panelpad.points[i].ux = tmpPoints[i].ux;
    	    			pad.panelpad.points[i].uy = tmpPoints[i].uy;
    	    			pad.panelpad.points[i].x = tmpPoints[i].x;
    	    			pad.panelpad.points[i].y = tmpPoints[i].y;
    	    		}
        			
        			self.do_warn(_t('Incorrect Operation'),_t('Mark is across multiple IPs!'),false);
        		}
    		}else if(pad.padType == 'subMark'){
    			var panelpad = pad.panelpad;
				var left = Math.min(panelpad.points[0].ux,panelpad.points[1].ux);
				var right = Math.max(panelpad.points[0].ux,panelpad.points[1].ux);
				var bottom = Math.min(panelpad.points[0].uy,panelpad.points[1].uy);
				var top = Math.max(panelpad.points[0].uy,panelpad.points[1].uy);
				self.parent.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(left,bottom,right,top,true);
				pad.panelpad.blocks = _.map(self.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0],function(item){
    	    		return {
    	    			iIPIndex:item.iIPIndex,
    	    			iScanIndex:item.iScanIndex,
    	    			iBlockIndex:item.iBlockIndex,
    	    			iInterSectionStartX:item.iInterSectionStartX,
    	    			iInterSectionStartY:item.iInterSectionStartY,
    	    			iInterSectionWidth:item.iInterSectionWidth,
    	    			iInterSectionHeight:item.iInterSectionHeight,
    	    			iBlockMapHeight:item.iBlockMapHeight
    	    			};
    	    		});
    			
    			self.pad.isSubMarkModified = true;
    		}	
	    		
			pad.update();
    		pad.panelpad.update();
			self.parent.pad.isModified = true;	
		});
		
    },
    _onObjectSelect: function(opt){
    	if(opt.target.pad && opt.target.type === 'cross' && opt.target.pad.padType != 'frame'){
    		this.curPad = opt.target.pad;
    		this._isSelectCross = true;
    		this._updateForMode();
    		
        	this.$el.find('.fa-cut').toggleClass('o_hidden',false);
        	this.map.renderAll();
    	}else if(opt.target.pad && opt.target.type === 'goa'){
    		this.curPad = opt.target.pad;
    		this._isSelectCross = true;
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
    	 if(opt.target.type == "goa"){
     		this.pad.isModified = true;
     		
     		var dResolutionX =  this.parent.coordinate.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionX;
     		var dResolutionY =  this.parent.coordinate.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionY;
			var period = opt.target.period * opt.target.scaleY 
			
			opt.target.pad.panelpad.periodX = period*fabric.util.sin(fabric.util.degreesToRadians(opt.target.angle))*dResolutionX;
			opt.target.pad.panelpad.periodY = period*fabric.util.cos(fabric.util.degreesToRadians(opt.target.angle))*dResolutionY;
			
			var {dOutputX:ux, dOutputY:uy} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(opt.target.left,this.image.height-opt.target.top);
			opt.target.pad.panelpad.goaUX = ux;
			opt.target.pad.panelpad.goaUY = uy;
			
			this.isGoaModified = true;
     	}
     },
     
     _checkFrame:function(ux,uy,id,isInner){
 		if(isInner){
 			if(id == 0){
 				return ux > this.parent.outerFrame.points[0].ux && uy > this.parent.outerFrame.points[0].uy;
 			}
 			if(id == 1){
 				return ux < this.parent.outerFrame.points[1].ux && uy < this.parent.outerFrame.points[1].uy;
 			}
 		}else{
 			if(id == 0){
 				return ux < this.parent.innerFrame.points[0].ux && uy < this.parent.innerFrame.points[0].uy;
 			}
 			if(id == 1){
 				return ux > this.parent.innerFrame.points[1].ux && uy > this.parent.innerFrame.points[1].uy;
 			}
 		}
 	},
     
    _onObjectMoving: function(opt){
    	if(this.map.hoverCursor !== 'default')
    		return;
    	if(opt.target.type != "cross")
    		return;
    	
    	this._isSelectCross = true;
    	if(opt.target.pad.padType == 'frame'){
			var {dOutputX:ux2, dOutputY:uy2} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(opt.target.left,this.image.height-opt.target.top);
			if(this._checkFrame(ux2,uy2,opt.target.id,opt.target.pad.panelpad == this.parent.innerFrame)){
				opt.target.pad.points[opt.target.id].x = opt.target.left;
				opt.target.pad.points[opt.target.id].y = opt.target.top;
				if(opt.target.pad){
		    		opt.target.pad.update();
		    	}
				
				opt.target.pad.panelpad.points[opt.target.id].ux = ux2;
				opt.target.pad.panelpad.points[opt.target.id].uy = uy2;
				let {dOutputX:x2, dOutputY:y2} = this.parent.coordinate.UMCoordinateToPanelMapCoordinate(ux2,uy2);
				opt.target.pad.panelpad.points[opt.target.id].x = x2;
				opt.target.pad.panelpad.points[opt.target.id].y = this.parent.image.height - y2;
				opt.target.pad.panelpad.update();
		    	
				this.parent._drawRegion();
				this.parent.pad.isModified = true;
				this.parent.map.forEachObject(this.parent.showObj.bind(this.parent));
				this.drawPad();
			}else{
				opt.target.left = opt.target.pad.points[opt.target.id].x;
				opt.target.top = opt.target.pad.points[opt.target.id].y;
			}
		}else if(opt.target.pad.padType == 'mainMark'){
			var ux = opt.target.pad.panelpad.points[opt.target.id?0:1].ux;
			var uy = opt.target.pad.panelpad.points[opt.target.id?0:1].uy;
    		var {dOutputX:ux2, dOutputY:uy2} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(opt.target.left,this.image.height-opt.target.top);
    		this.parent.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(Math.min(ux,ux2),Math.min(uy,uy2),Math.max(ux,ux2),Math.max(uy,uy2),true);
    		if(this.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap.length == 1){
    			opt.target.pad.points[opt.target.id].x = opt.target.left;
    			opt.target.pad.points[opt.target.id].y = opt.target.top;
    			if(opt.target.pad){
    	    		opt.target.pad.update();
    	    		opt.target.pad.updateCross(true);
    	    	}
    			this.parent.register(opt.target.pad.panelpad);
    			
    			opt.target.pad.panelpad.points[opt.target.id].ux = ux2;
				opt.target.pad.panelpad.points[opt.target.id].uy = uy2;
				let {dOutputX:x2, dOutputY:y2} = this.parent.coordinate.UMCoordinateToPanelMapCoordinate(ux2,uy2);
				opt.target.pad.panelpad.points[opt.target.id].x = x2;
				opt.target.pad.panelpad.points[opt.target.id].y = this.parent.image.height - y2;
				opt.target.pad.panelpad.update();
				
    			opt.target.pad.panelpad.blocks = _.map(this.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0],function(item){
    	    		return {
    	    			iIPIndex:item.iIPIndex,
    	    			iScanIndex:item.iScanIndex,
    	    			iBlockIndex:item.iBlockIndex,
    	    			iInterSectionStartX:item.iInterSectionStartX,
    	    			iInterSectionStartY:item.iInterSectionStartY,
    	    			iInterSectionWidth:item.iInterSectionWidth,
    	    			iInterSectionHeight:item.iInterSectionHeight,
    	    			iBlockMapHeight:item.iBlockMapHeight
    	    			};
    	    		});
    			
    			this.parent.pad.isModified = true;
    			this.pad.isMainMarkModified = true;
    			
    		}else{
				opt.target.left = opt.target.pad.points[opt.target.id].x;
				opt.target.top = opt.target.pad.points[opt.target.id].y;
    			this.do_warn(_t('Incorrect Operation'),_t('Mark is across multiple IPs!'),false);
    		}
		}else{
			opt.target.pad.points[opt.target.id].x = opt.target.left;
			opt.target.pad.points[opt.target.id].y = opt.target.top;
			if(opt.target.pad){
	    		opt.target.pad.update();
	    		opt.target.pad.updateCross(true);
	    	}
			this.parent.register(opt.target.pad.panelpad);
			var {dOutputX:ux2, dOutputY:uy2} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(opt.target.left,this.image.height-opt.target.top);
			opt.target.pad.panelpad.points[opt.target.id].ux = ux2;
			opt.target.pad.panelpad.points[opt.target.id].uy = uy2;
			let {dOutputX:x2, dOutputY:y2} = this.parent.coordinate.UMCoordinateToPanelMapCoordinate(ux2,uy2);
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
		if(this.image){
			var x = opt.e.offsetX;
			var y = opt.e.offsetY;
			var zoom = this.map.getZoom();
			let {dOutputX:ux,dOutputY:uy} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(x/zoom,this.image.height-y/zoom);
			let {iIP, iScan} = this.parent.coordinate.JudgeIPScan_UM(ux,uy);
			let {dCustomerPointX:cx, dCustomerPointY:cy} = this.parent.coordinate.UmCoordinateToCustomerCoordinate(ux,uy);
			
			$(".map-info").text("IP("+iIP+") Scan("+iScan+") image("+Math.round(x/zoom)+","+Math.round(y/zoom)+") window("+x+","+y+") um("+Math.round(ux)+','+Math.round(uy) + ") Customer("+Math.round(cx)+","+Math.round(cy)+")");
		}
		
    	opt.e.stopPropagation();
        opt.e.preventDefault();
    		
	},
	_onMouseOut:function(opt){
		$(".map-info").text("");
		
		if(opt.target && opt.target.pad && (opt.target.pad.padType == 'mainMark' || opt.target.pad.padType == 'subMark')){
			if(this.markShow){
				this.map.remove(this.markShow);
				this.map.renderAll();
				this.markShow = null;
			}
		}
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
   	 		let {dOutputX:ux1, dOutputY:uy1} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(x1,this.image.height-y1);
   	 		let {dOutputX:x2, dOutputY:y2} = this.parent.coordinate.UMCoordinateToPanelMapCoordinate(ux1,uy1);
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

    		let {dOutputX:ux,dOutputY:uy} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(endPointer.x/zoom,this.image.height-endPointer.y/zoom);
    		var uoffsetX = ux - this.parent.map.pads[firstId].points[0].ux;
    		var uoffsetY = uy - this.parent.map.pads[firstId].points[0].uy;
    		
    		var tmp = this.parent.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
    		endPointer.x = tmp.dOutputX;
    		endPointer.y = this.parent.image.height-tmp.dOutputY;
    		var offsetX = endPointer.x - this.parent.map.pads[firstId].points[0].x;
    		var offsetY = endPointer.y - this.parent.map.pads[firstId].points[0].y;

    		var pads = [];
    		this.parent.map.pads.forEach(function(obj){
    			if((!obj.selected) || (obj.padType !== self.pad.curType))
    				return;
    			
    			var pad = new Mycanvas.MyPolyline(self.parent.map,obj.padType);
    			if(obj.padType == 'mainMark'){
    				var left = Math.min(obj.points[0].ux,obj.points[1].ux) + uoffsetX;
    				var right = Math.max(obj.points[0].ux,obj.points[1].ux) + uoffsetX;
    				var bottom = Math.min(obj.points[0].uy,obj.points[1].uy) + uoffsetY;
    				var top = Math.max(obj.points[0].uy,obj.points[1].uy) + uoffsetY;
    				self.parent.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(left,bottom,right,top,true);
            		if(self.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap.length == 1){
            			pad.blocks = _.map(self.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0],function(item){
            	    		return {
            	    			iIPIndex:item.iIPIndex,
            	    			iScanIndex:item.iScanIndex,
            	    			iBlockIndex:item.iBlockIndex,
            	    			iInterSectionStartX:item.iInterSectionStartX,
            	    			iInterSectionStartY:item.iInterSectionStartY,
            	    			iInterSectionWidth:item.iInterSectionWidth,
            	    			iInterSectionHeight:item.iInterSectionHeight,
            	    			iBlockMapHeight:item.iBlockMapHeight
            	    			};
            	    		});
            			
            			self.pad.isMainMarkModified = true;
            		}else{
            			self.do_warn(_t('Incorrect Operation'),_t('Mark is across multiple IPs!'),false);
            			return;
            		}
	    		}

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
				
				if(obj.padType == 'inspectZone'){
					pad.zone = obj.zone || 9;
					pad.toleranceX = obj.toleranceX || 10;
					pad.toleranceY = obj.toleranceY || 10;
					
					pad.periodX = obj.periodX || 0;
					pad.periodY = obj.periodY || 0;
					pad.D1G1 = obj.D1G1 || 0;
					pad.goaUX = obj.goaUX? (obj.goaUX + uoffsetX): 0;
	    			pad.goaUY = obj.goaUY?(obj.goaUY + uoffsetY) : 0;
	    		}
    		});
    		this.parent.register(pads,'copy');
    		this.pad.isModified = true;
    		this.drawPad();
    	}else if(_isDrawRect && this.map.hoverCursor == CROSSHAIR){
    		var imgx1 = Math.min(this.map.startPointer.x,opt.pointer.x);
			var imgy1 = Math.max(this.map.startPointer.y,opt.pointer.y);
			let {dOutputX:ux,dOutputY:uy} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(imgx1/zoom,this.image.height-imgy1/zoom);
			var imgx2 = Math.max(this.map.startPointer.x,opt.pointer.x);
			var imgy2 = Math.min(this.map.startPointer.y,opt.pointer.y);
			let {dOutputX:ux2,dOutputY:uy2} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(imgx2/zoom,this.image.height-imgy2/zoom);
			
			var acrossIp = false;
			if(this.pad.curType == "mainMark"){
				this.parent.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(Math.min(ux,ux2),Math.min(uy,uy2),Math.max(ux,ux2),Math.max(uy,uy2),true);
				acrossIp = this.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap.length > 1;
			}
				
			if(this.pad.curType != "mainMark" || acrossIp == false){
				this.parent.map.discardActiveObject();
				var pad = new Mycanvas.MyPolyline(this.parent.map,this.pad.curType);
				this.parent.register(pad);
				
				var tmp = this.parent.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
				pad.points.push({x:tmp.dOutputX, y:this.parent.image.height-tmp.dOutputY,ux,uy});

	    		tmp = this.parent.coordinate.UMCoordinateToPanelMapCoordinate(ux2,uy2);
	    		pad.points.push({x:tmp.dOutputX, y:this.parent.image.height-tmp.dOutputY,ux:ux2,uy:uy2});
	    		pad.update();
				
				if(pad.padType == "mainMark"){
					pad.blocks = _.map(this.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0],function(item){
	    	    		return {
	    	    			iIPIndex:item.iIPIndex,
	    	    			iScanIndex:item.iScanIndex,
	    	    			iBlockIndex:item.iBlockIndex,
	    	    			iInterSectionStartX:item.iInterSectionStartX,
	    	    			iInterSectionStartY:item.iInterSectionStartY,
	    	    			iInterSectionWidth:item.iInterSectionWidth,
	    	    			iInterSectionHeight:item.iInterSectionHeight,
	    	    			iBlockMapHeight:item.iBlockMapHeight
	    	    			};
	    	    		});
					
					this.pad.isMainMarkModified = true;
				}
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
    	}else if(!_isDrawRect && this.map.hoverCursor == CROSSHAIR && (this.pad.curType=='inspectZone' ||this.pad.curType=='unregularInspectZone' || this.pad.curType=='uninspectZone')){
    		if(!this.map.curPad){
    			var pad = new Mycanvas.MyPolyline(this.parent.map,this.pad.curType);
				this.map.curPad = new Mycanvas.MyPolyline(this.map,this.pad.curType);
				this.map.curPad.panelpad = pad;
				pad.hawkpad = this.map.curPad;
			}
    		this.parent.register(this.map.curPad.panelpad);
    		
			let {dOutputX:ux,dOutputY:uy} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(endPointer.x/zoom,this.image.height-endPointer.y/zoom);
    		tmp = this.parent.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);

    		if(this.map.curPad.panelpad.addPoint({x:tmp.dOutputX, y:this.parent.image.height-tmp.dOutputY,ux,uy})){
    			this.map.curPad.addPoint({x: endPointer.x/zoom, y: endPointer.y/zoom})
    			this.pad.isModified = true;
    		}else{
    			this.do_warn(_t('Incorrect Operation'),_t('Please enter valid point!'),false);
    		}
    	}else if(!_isDrawRect && this.map.hoverCursor == CROSSHAIR && (this.pad.curType=='subMark' && this.parent.isPolygonSubMark)){
    		if(!this.map.curPad){
    			var pad = new Mycanvas.MyPolyline(this.parent.map,this.pad.curType);
				this.map.curPad = new Mycanvas.MyPolyline(this.map,this.pad.curType);
				this.map.curPad.panelpad = pad;
				pad.hawkpad = this.map.curPad;
			}
    		this.parent.register(this.map.curPad.panelpad);
    		
			let {dOutputX:ux,dOutputY:uy} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(endPointer.x/zoom,this.image.height-endPointer.y/zoom);
    		tmp = this.parent.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);

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
							this._checkMark(this.map.curPad);
							if(this.map.curPad.goa && (this.map.curPad.goa.left > this.image.width || this.map.curPad.goa.left < 0 || this.map.curPad.goa.top > this.image.height || this.map.curPad.goa.top < 0)){
					    		this.map.curPad.goa.set({left:x,top:y,})
					    		this.map.curPad.goa.setCoords();
					    	}
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
				}else if(obj.type === 'goa'){
					obj.hasControls = self.map.hoverCursor == 'default';	
					obj.visible = obj.pad == self.map.curPad;
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
    				
    				if(objs[0].pad.padType == 'mainMark'){
    					this.pad.isMainMarkModified = true;
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
    	if(this.pad.curType !== 'inspectZone')
    		return;
    	
    	var zoom = this.map.getZoom();
    	var x = opt.pointer.x/zoom;
		var y = opt.pointer.y/zoom;
		if(this.map.curPad){
			this.map.curPad = null;
			if(this.markShow){
				this.map.remove(this.markShow);
				this.markShow = null;
			}
		}
		
		for(var i = 0; i < this.map.pads.length; i++){
			if(this.map.pads[i].padType != this.pad.curType)
				continue;
			this.map.pads[i].panelpad.selected = false;
			if(this.map.curPad == null && this.map.pads[i].containsPoint({x,y})){
				this.map.curPad = this.map.pads[i];
			}
		}
    	
   	 	if(this.map.curPad){
   	 		this._onButtonAlign(x,y);
   	 	}
    },
    
    _onSearchGOA:function(){
    	var pad = this.map.curPad.panelpad;
    	var dResolutionX = this.parent.coordinate.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionX;
    	var dResolutionY = this.parent.coordinate.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionY;
    	
    	var uLeft = pad.points[0].ux;
    	var uRight = pad.points[0].ux;
    	var uBottom = pad.points[0].uy;
    	var uTop = pad.points[0].uy;
    	for(var i = 1; i < pad.points.length; i++){
    		if(pad.points[i].ux > uRight)
    			uRight = pad.points[i].ux;
    		else if(pad.points[i].ux < uLeft)
    			uLeft = pad.points[i].ux;
    		
    		if(pad.points[i].uy > uTop)
    			uTop = pad.points[i].uy;
    		else if(pad.points[i].uy < uBottom)
    			uBottom = pad.points[i].uy;
    	}
    	var centerx = (uLeft + uRight)/2;
    	var centery = (uBottom + uTop)/2;
    	var width = 2000*dResolutionX;
    	var height = 2000*dResolutionY;
    	uLeft = centerx - width/2;
    	uRight = centerx + width/2;
    	uBottom = centery - height/2;
    	uTop = centery + height/2;
    	if(uLeft < 0) uLeft = 0;
    	if(uBottom < 0) uBottom = 0;
    	
    	this.parent.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(uLeft,uBottom,uRight,uTop,true);
    	var imgWidth = _.reduce(this.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap, function(memo, block){ 
    		return memo + (block[0]&&block[0].bHasIntersection?block[0].iInterSectionWidth:0); 
    		}, 0);
    	var imgHeight = _.reduce(this.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0], function(memo, block){ 
    		return memo  + (block&&block.bHasIntersection?block.iInterSectionHeight:0); 
    		}, 0);
    	var strBlocks = JSON.stringify(this.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap);
    	
    	var points = {x:[],y:[]};
    	pad.points.forEach(function(p){
    		points.x.push(Math.floor((p.ux-uLeft)/dResolutionX));
    		points.y.push(Math.floor((p.uy-uBottom)/dResolutionY));
    	});
    	var strPoints = JSON.stringify(points);
    	
    	var self = this;
    	var type = parseInt(self.dialog.$('.o_set_type_input').val());
    	framework.blockUI();
    	this._rpc({model: 'padtool.pad',method: 'search_goa',args: [this.parent.glassName,imgWidth,imgHeight,strBlocks,strPoints,type],})
        .then(function(res) {
        	framework.unblockUI();
        	if(res.result){
        		self.dialog.$('.o_set_periodx_input').val(Math.floor(100 * res.periodX*dResolutionX)/100.0);
                self.dialog.$('.o_set_periody_input').val(Math.floor(100 * res.periodY*dResolutionY)/100.0);
                self.dialog.$('.img-responsive')[0].src = "data:image/jpeg;base64,"+res.map;
                self.dialog.$('.img-responsive')[0].style="margin-top:10px;padding-top:10px;border-top: 1px solid #e5e5e5;"
                self.do_notify(_t('Operation Result'),_t('The search is success!'),false);
        	}else{
        		self.do_warn(_t('Operation Result'),_t('The search failed!'),false);
        	}
        }).fail(function(){
        	framework.unblockUI();
        	self.do_warn(_t('Operation Result'),_t('The search failed!'),false);
        	});
    },
    
    _onConfirmGOA:function(){
    	var pad = this.map.curPad.panelpad;
    	
    	pad.periodX = parseFloat(this.dialog.$content.find('.o_set_periodx_input').val());
    	pad.periodY = parseFloat(this.dialog.$content.find('.o_set_periody_input').val());
    	pad.D1G1 = this.dialog.$content.find('.o_set_d1g1_input')[0].checked?1:0;
    	
    	pad.toleranceX = parseInt(this.dialog.$content.find('.o_set_tolerancex_input').val());
    	pad.toleranceY = parseInt(this.dialog.$content.find('.o_set_tolerancey_input').val());
    	pad.zone = parseInt(this.dialog.$content.find('.o_set_zone_input').val());
    	
    	if(pad.periodX == 0 && pad.periodY == 0){
    		if(this.map.curPad.goa !== undefined){
    			this.map.remove(this.map.curPad.goa);
    			this.map.renderAll();
    			this.map.curPad.goa = undefined;
    		}
    		return;
    	}
    	
    	var angle,period;
    	var periodX = pad.periodX/this.parent.coordinate.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionX;
    	var periodY = pad.periodY/this.parent.coordinate.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionY;
		if(pad.periodY == 0){
			angle = fabric.util.degreesToRadians(90);
			period = periodX;
		}else if(pad.periodX == 0){
			angle = fabric.util.degreesToRadians(0);
			period = periodY;
		}else{
			angle = Math.atan(periodX/periodY);
			period = periodY / fabric.util.cos(angle);
		}
		angle = fabric.util.radiansToDegrees(angle);
		
		if(this.map.curPad.goa === undefined){
			this.map.curPad.goa = new Mycanvas.Goa({
					left:this.dialog._x,
					top:this.dialog._y,
	    			pad:this.map.curPad,
	    			period,
	    			angle,
	    			visible:true
	    		}); 
			this.map.add(this.map.curPad.goa);
		}else{
			var dirty = true;
			var height = period * this.map.curPad.goa.number;
			period = period / this.map.curPad.goa.scaleY;
			if(period !== this.map.curPad.goa.period || angle !== this.map.curPad.goa.angle){
				this.map.curPad.goa.set({angle,period,dirty,height});
				this.map.curPad.goa.setCoords();
			}
		}
		this.map.renderAll();
    },
    
    _onButtonAlign:function(x,y){
    	if(this.pad.curType != 'inspectZone')
    		return;
    	if(this.map.curPad == null || this.map.curPad.padType !== this.pad.curType)
    		return;
    	
    	var self = this;
    	var pad = this.map.curPad.panelpad;
        var $content = $(QWeb.render("GoaDialog"));
            
        this.dialog = new Dialog(this, {
        	title: _t('Setting'),
        	//size: 'medium',
        	$content: $content,
        	buttons: [{text: _t('AutoSearch'), classes: 'btn-primary', close: false, click: this._onSearchGOA.bind(this)}, 
        		{text: _t('Confirm'), classes: 'btn-primary', close: true, click: this._onConfirmGOA.bind(this)},
        		{text: _t('Discard'), close: true}],
        });
        this.dialog._x = x;
        this.dialog._y = y;
        
        this.dialog.opened().then(function () {
        	self.dialog.$('.o_set_zone_input').val(pad.zone||9);
        	self.dialog.$('.o_set_tolerancex_input').val(pad.toleranceX||10);
        	self.dialog.$('.o_set_tolerancey_input').val(pad.toleranceY||10);
        	
        	self.dialog.$('.o_set_periodx_input').val(pad.periodX||0);
        	self.dialog.$('.o_set_periody_input').val(pad.periodY||0);
        	self.dialog.$('.o_set_d1g1_input')[0].checked = pad.D1G1 == 1;
            });
        this.dialog.open();
    },
    
    _showMark:function(markImage,pad){
		var self = this;
		var tempCanvas = new fabric.StaticCanvas();
	    tempCanvas.setDimensions({
	      width: pad.panelpad.blocks[0].iInterSectionWidth+6,
	      height:_.reduce(pad.panelpad.blocks, function(memo, block){return (memo + (block.iInterSectionHeight?block.iInterSectionHeight:0));}, 0)+6
	    });
	    
	    tempCanvas.add(markImage);
	    markImage.left = -pad.panelpad.imgStartX +2;
	    markImage.top = -markImage.height + tempCanvas.height + 2;
	    markImage.setCoords();
	    
	    tempCanvas.add(new fabric.Rect({
	    	left:3,
	    	top:3,
	    	width:tempCanvas.width -6,
	    	height:tempCanvas.height -6,
	    	fill:false,
	    	strokeWidth:3,
	    	stroke:'blue'
	    }));
	    
	    tempCanvas.renderAll();
	    
	    var img = new Image();
	    img.onload = function() {
	    	if(self.markShow){
	    		self.map.remove(self.markShow);
			}
	    	self.markShow = new fabric.Image(img, {
	    		left: pad.points[0].x > (self.image.width/2)? (pad.points[0].x - tempCanvas.width - 10):(pad.points[1].x + 10),
	    		top: pad.points[1].y > (self.image.height/2)? (pad.points[1].y - tempCanvas.height - 10):(pad.points[0].y + 10),
	    		hasControls: false,
	    	});
	    	self.markShow.pad = pad;
	    	self.map.add(self.markShow);
	    	self.map.renderAll();
	    }
	    img.src = tempCanvas.toDataURL();
	},
	
	_checkMark:function(pad){
		var self = this;
		var d = new Date();
		if(pad.padType == 'mainMark'){
			if(this.pad.isMainMarkModified){
				this.do_notify(_t('Mark has been modified'),_t('Please save first!'),false);
			}else{
				if(this.parent.mainMarkImage && pad.panelpad.blocks){
					this._showMark(this.parent.mainMarkImage,pad)
				}
			}
		}else if(pad.padType == 'subMark'){
			if(this.pad.isSubMarkModified){
				this.do_notify(_t('Mark has been modified'),_t('Please save first!'),false);
			}else{
				if(this.parent.subMarkImage && pad.panelpad.blocks){
					this._showMark(this.parent.subMarkImage,pad)
				}
			}
		}else{
			return;
		}
	},
    
});



return Hawkmap;

});