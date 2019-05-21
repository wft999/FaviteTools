odoo.define('padtool.Map', function (require) {
"use strict";

var core = require('web.core');
var Widget = require('web.Widget');
var SystrayMenu = require('web.SystrayMenu');
var framework = require('web.framework');

var Mycanvas = require('padtool.Canvas');
var Hawkmap = require('padtool.Hawkmap');
var Submark = require('padtool.submark');

var QWeb = core.qweb;
var _t = core._t;

var CanvasInfo = Widget.extend({
    template: 'Map.info',
    
    init: function (parent, value) {
        this._super(parent);

    },
});

var Map = Widget.extend({
	init: function(parent,action){
		this.action_manager = parent;
    	if(action){
    		this.menu_id = action.context.params.menu_id;
    		this.active_id = action.context.active_id;
    	}else{
    		var queryString = document.location.hash.slice(1);
        	var params = this._parseQueryString(queryString);
        	if ('menu_id' in params) {
        		this.menu_id = params.menu_id;
        	}
    	}
        return this._super.apply(this, arguments);
    },
    
    start: function(){
    	var self = this;
    	this._super.apply(this, arguments);
    	if(this.panelName === undefined)
    		return;
    	
    	framework.blockUI();
    	this.defImage = new $.Deferred();
    	this.image = new fabric.Image();
    	var src = '/glassdata/'+ this.glassName +'/'+ this.panelName +'/' + this.padConf[this.panelName].panel_map
    	this.image.setSrc(src, function(img){
    		img.set({left: 0,top: 0,hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false});
    		self.map  = new fabric.Canvas('map',{
    			hoverCursor:'default',
    			stopContextMenu:false,
    			imageSmoothingEnabled:false,
    		});
    		self.map.pads = new Array();
    		self.map.isPanel = true;
    		var zoom = Math.max(self.map.getWidth()/img.width,self.map.getHeight()/img.height);
    		zoom = Math.floor(zoom*100)/100;
    		self.minZoom = zoom;
    		self.map.setZoom(zoom);
    		self.map.setDimensions({width:img.width*zoom,height:img.height*zoom});
    		self.map.wrapperEl.style['width'] = '';
       	 	self.map.wrapperEl.style['height'] = '';
    		self.map.add(img);

    		//self.map.on('mouse:move',_.debounce(self._onMouseMove.bind(self), 100));
    		self.map.on('mouse:move',self._onMouseMove.bind(self)); 
    		self.map.on('mouse:out', self._onMouseOut.bind(self)); 
    		self.map.on('mouse:up', self._onMouseUp.bind(self));
    		self.map.on('mouse:down',self._onMouseDown.bind(self));
    		self.map.on('mouse:dblclick',self._onMouseDblclick.bind(self));

    		self.map.on('object:moved',self._onObjectMoved.bind(self));
    		self.map.on('object:scaled',self._onObjectScaled.bind(self));

    		self.keyupHandler = self._onKeyup.bind(self);
    		$('body').on('keyup', self.keyupHandler);
    		
    		self.keydownHandler = self._onKeydown.bind(self);
    		$('body').on('keydown', self.keydownHandler);

    		self.defImage.resolve();
    		framework.unblockUI();
    		/*
    		$.contextMenu({
    	        selector: '.canvas-map', 
    	        items: {
    	        	key1: {
    	                name: "Edit", 
    	                callback: self._onButtonSave.bind(self)
    	            },
    	            sep1: "---------",
    	            key2: {
    	                name: "Copy", 
    	                callback: $.noop
    	            },
    	            sep2: "---------",
    	            key3: {
    	                name: "Paste", 
    	                callback: $.noop
    	            }
    	        }, 
    	        
    	    });*/
    		
    	});
    	
    	
    },
    
    destroy: function(){			
		$('body').off('keyup', this.keyupHandler);
    	$('body').off('keydown', this.keydownHandler);
    	
    	this._super.apply(this, arguments);
    	
    },

  //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
      
    _onKeyup: function(e){
    	if(e.ctrlKey){
    		
    		if(e.which == 187){
    			if(this.hawkeye.visible){
    				var x = this.hawkmap.$('div.canvas-map').scrollLeft()+this.hawkmap.$('div.canvas-map').width()/2;
    	    		var y = this.hawkmap.$('div.canvas-map').scrollTop()+this.hawkmap.$('div.canvas-map').height()/2;
    				
    				this.hawkmap._zoom(0.2,x,y)
    			}
    			else{
    				var x = this.$el.scrollLeft()+this.$el.width()/2;
    	    		var y = this.$el.scrollTop()+this.$el.height()/2;
    	    		this._zoom(0.2,x,y)
    			}
    				
    		}	
    		else if(e.which == 189){
    			if(this.hawkeye.visible){
    				var x = this.hawkmap.$('div.canvas-map').scrollLeft()+this.hawkmap.$('div.canvas-map').width()/2;
    	    		var y = this.hawkmap.$('div.canvas-map').scrollTop()+this.hawkmap.$('div.canvas-map').height()/2;
    				this.hawkmap._zoom(-0.2,x,y)
    			}
    			else{
    				var x = this.$el.scrollLeft()+this.$el.width()/2;
    	    		var y = this.$el.scrollTop()+this.$el.height()/2;
    				this._zoom(-0.2,x,y)
    			}
    				
    		}else if(String.fromCharCode(e.which).toLowerCase() === 's'){
    			this._onButtonSave();
    		}else if(String.fromCharCode(e.which).toLowerCase() === 'c'){
    			this._onButtonCopy();
    		}else if(String.fromCharCode(e.which).toLowerCase() === 'x'){
    			this._onButtonCut();
    		}else if(String.fromCharCode(e.which).toLowerCase() === 'h'){
    			this._onButtonHawkeye();
    		}else if(String.fromCharCode(e.which).toLowerCase() === 'd'){
    			this._onButtonTrash();
    		}else if(String.fromCharCode(e.which).toLowerCase() === 'g'){
    			this._onButtonAlign();
    		}
    		
    		e.stopPropagation();
            e.preventDefault();	
    	}
    },
    _onKeydown: function(e){
    	if(e.ctrlKey){
    		e.stopPropagation();
            e.preventDefault();	
    	}
    },

	_onObjectScaled: function(opt){
     	 if(opt.target.type == "hawkeye"){
     		if(((opt.target.height * opt.target.scaleY) / this.coordinate.pmpPanelMapPara.dRatioY) > this.globalConf.hawk_height){
     			opt.target.scaleY = this.globalConf.hawk_height * this.coordinate.pmpPanelMapPara.dRatioY / opt.target.height ;
     			this.map.renderAll();
     		}
     		if(((opt.target.width *  opt.target.scaleX) / this.coordinate.pmpPanelMapPara.dRatioX) > this.globalConf.hawk_width){
     			opt.target.scaleX = this.globalConf.hawk_width * this.coordinate.pmpPanelMapPara.dRatioX / opt.target.width;
     			this.map.renderAll();
     		}
     		$('.panel-hawk').toggleClass('o_hidden');
     		$('.panel-hawk').toggleClass('o_hidden');
     		
      		this.hawkmap.showImage();
      		this.isObjectScaled = true;
      	}
      },
      
	_onObjectMoved: function(opt){
    	 if(opt.target.type == "hawkeye"){
     		this.hawkmap.showImage();
     		this.isObjectMoved = true;
     	}else if(opt.target.type == "cross"){
     		this.isObjectMoved = true;
     		if(opt.target.mouseMove()){
     			opt.target.pad.points[opt.target.id].x = opt.target.left;
     			opt.target.pad.points[opt.target.id].y = opt.target.top;
    
     			let {dOutputX:ux, dOutputY:uy} = this.coordinate.PanelMapCoordinateToUMCoordinate(opt.target.left,this.image.height-opt.target.top);
     			opt.target.pad.points[opt.target.id].ux = ux;
				opt.target.pad.points[opt.target.id].uy = uy;

				this._drawRegion();
				
				if(this.hawkmap){
					this.hawkmap.drawPad();
				}
     		}
     	}
     },
     
    _onMouseDown:function(opt){
    	this.map.startPointer = opt.pointer;
    },
	_onMouseMove:function(opt){
		if(this.map){
			var zoom = this.map.getZoom();
			var x = opt.e.offsetX;
			var y = opt.e.offsetY;
			
			let {dOutputX:ux, dOutputY:uy} = this.coordinate.PanelMapCoordinateToUMCoordinate(x/zoom,this.image.height- y/zoom);

			$(".map-info").text('image(x:'+Math.round(x/zoom)+',y:'+Math.round(y/zoom)+') window(x:'+x+',y:'+y+') um(x:'+ux+',y:'+uy+')');
		}
		
		
    	opt.e.stopPropagation();
        opt.e.preventDefault();	
	},
	_onMouseOut:function(opt){
		$(".map-info").text("");

		opt.e.stopPropagation();
        opt.e.preventDefault();	
	},
	
	
    
    _parseQueryString: function(query) {
        var parts = query.split('&');
        var params = {};
        for (var i = 0, ii = parts.length; i < ii; ++i) {
          var param = parts[i].split('=');
          var key = param[0].toLowerCase();
          var value = param.length > 1 ? param[1] : null;
          params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
        return params;
      },
      
     _zoom:function(delta,x,y){
    	 var zoom = this.map.getZoom();
    	 var x1 = x / zoom;
    	 var y1 = y / zoom;
 		
    	 zoom = zoom + delta;
    	 zoom = Math.floor(zoom*10)/10;
    	 if (zoom > 1.0) zoom = 1.0;
    	 if (zoom <= this.minZoom) zoom = this.minZoom;
 		
    	 var div = $('div.o_content')
    	 x = x1 * zoom - (x - div.scrollLeft());
    	 y = y1 * zoom - (y - div.scrollTop());
    	 
    	 this.map.setDimensions({width:this.image.width*zoom,height:this.image.height*zoom});
    	 this.map.wrapperEl.style['width'] = '';
    	 this.map.wrapperEl.style['height'] = '';
    	 this.map.setZoom(zoom);

    	 div.scrollTop(y);
    	 div.scrollLeft(x);
     },
     
     _onMouseDblclick:function(opt){
    	 if(this.hawkeye && this.map.hoverCursor == 'default'){
    		 var zoom = this.map.getZoom();
	 	    this.hawkeye.set({ 
	     			top: opt.pointer.y/zoom, 
	     			left: opt.pointer.x/zoom,
	     			visible:true,
	     		});
	 	    this.hawkeye.setCoords();
	     	this.hawkeye.bringToFront();
			
			
			if(!this.hawkmap){
				//this.hawkmap.destroy();
	    		//delete this.hawkmap;
				this.hawkmap = new Hawkmap(this);
		        this.hawkmap.pad = this.pad;
		        this.hawkmap.appendTo('body');
	    	}
			this.hawkmap.do_show();
	        this.hawkmap.showImage();

		}
     },
     

    _onMouseUp:function(opt){
    	var zoom = this.map.getZoom();
    	var endPointer = opt.pointer;
    	var _isDrawRect = this.map.startPointer.x != endPointer.x ||this.map.startPointer.y != endPointer.y;
    	
    	if(!_isDrawRect && (this.map.hoverCursor == 'zoom-in' || this.map.hoverCursor == 'zoom-out')){
    		endPointer.x /= zoom;
        	endPointer.y /= zoom;
    		var delta = this.map.hoverCursor == 'zoom-in'?0.2:-0.2;
    		this._zoom(delta,opt.e.offsetX,opt.e.offsetY);
    		opt.e.preventDefault();
     		opt.e.stopPropagation();
    	}else if(this.map.hoverCursor == 'default'){
    		if(this.isObjectMoved || this.isObjectScaled){
    			this.isObjectMoved = false;
    			this.isObjectScaled = false;
    			return;
    		}
    		
    		var x = opt.pointer.x/zoom;
			var y = opt.pointer.y/zoom;
    		var left = Math.min(this.map.startPointer.x,opt.pointer.x)/zoom;
			var bottom = Math.max(this.map.startPointer.y,opt.pointer.y)/zoom;
			var right = Math.max(this.map.startPointer.x,opt.pointer.x)/zoom;
			var top = Math.min(this.map.startPointer.y,opt.pointer.y)/zoom;
    		for(var i = 0; i < this.map.pads.length; i++){
				if(this.map.pads[i].padType != this.pad.curType)
					continue;
				if(_isDrawRect){
					this.map.pads[i].selected = this.map.pads[i].withinRect(left,right,top,bottom);
				}else{
					if(opt.e.ctrlKey){
						if(this.map.pads[i].containsPoint({x,y})){
							this.map.pads[i].selected = !this.map.pads[i].selected;
						}
					}else{
						this.map.pads[i].selected = false;
					}
				}	
			}
    		
			//this.map.discardActiveObject();
			this.updateForSelect();
			if(this.hawkmap){
				this.hawkmap._updateForMode();
			}
    	}
    },
    
    _drawSubMark:function(){
 		var res = _.partition(this.map.pads, function(obj){
 			return obj.padType == 'subMark' && obj.points.length <= 2;
 		});
 		this.map.pads = res[1];
 		res[0].forEach(function(obj){
 			obj.clear();
 		});
 		
 		var submark = new Submark(this);
 		var {dPanelLeft,dPanelBottom,dPanelRight,dPanelTop,dPeriodX, dPeriodY} = submark.getPanelPara();
 		if(this.isPolygonSubMark){
 			_.each(this.map.pads,function(obj){submark.getPlygonSubMark(obj,dPeriodX, dPeriodY);});
 		}
 		else
 			submark.pMarkRegionArray = submark.getNormalSubMark(dPanelLeft,dPanelBottom,dPanelRight,dPanelTop,dPeriodX, dPeriodY);
 		
 		for(var i = 0; i < submark.pMarkRegionArray.length; i++){
 			var width = submark.pMarkRegionArray[i].dMarkWidth ;
 			var height = submark.pMarkRegionArray[i].dMarkHeight;
 			
 			var rect = new Mycanvas.MyPolyline(this.map,'subMark');
 			
 			var ux = submark.pMarkRegionArray[i].dPositionX- width/2;
			var uy = submark.pMarkRegionArray[i].dPositionY+ height/2;
 			var tmp = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
    		rect.points.push({
    			x:tmp.dOutputX, 
    			y:this.image.height - tmp.dOutputY,
    			ux,
    			uy
    		});
    		
    		ux = submark.pMarkRegionArray[i].dPositionX+ width/2;
			uy = submark.pMarkRegionArray[i].dPositionY- height/2;
    		tmp = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
			rect.points.push({
				x:tmp.dOutputX, 
				y:this.image.height - tmp.dOutputY,
				ux,
				uy
			});
			rect.update();
			
			rect.iMarkDirectionType = submark.pMarkRegionArray[i].iMarkDirectionType;

 			var uLeft = submark.pMarkRegionArray[i].dPositionX - submark.pMarkRegionArray[i].dMarkWidth/2;
 			var uRight = submark.pMarkRegionArray[i].dPositionX + submark.pMarkRegionArray[i].dMarkWidth/2;
 			var uTop = submark.pMarkRegionArray[i].dPositionY + submark.pMarkRegionArray[i].dMarkHeight/2;
 			var uBottom = submark.pMarkRegionArray[i].dPositionY - submark.pMarkRegionArray[i].dMarkHeight/2;
 			
 			this.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(uLeft,uBottom,uRight,uTop,true);
 			rect.blocks = _.map(this.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0],function(item){
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
 		}
 		this.pad.isModified = true;
 		this.pad.isSubMarkModified = true;
 		this.notification_manager.notify(_t('Operation Result'),_t('SubMark has refreshed!'),false);
 	},
  
     _drawPad:function(){ 
 		var self = this;
 		this.isPolygonSubMark = false;
 		this.innerFrame = null;
 		this.outerFrame = null;
 		var hasRegion = false;
 		var subMarkPolygon = false;
 			
 		this.jsonpad.objs && this.jsonpad.objs.forEach(function(pad){
 			var obj = new Mycanvas.MyPolyline(self.map,pad.padType);
 			obj = _.extend(obj, pad);
 			for(var i = 0; i < obj.points.length; i++){
 				if(obj.points[i].x === undefined && obj.points[i].ux !== undefined){
 					var out = self.coordinate.UMCoordinateToPanelMapCoordinate(obj.points[i].ux,obj.points[i].uy);
 					obj.points[i].x = out.dOutputX;
 					obj.points[i].y = self.image.height - out.dOutputY;
 				}else if(obj.points[i].x !== undefined && obj.points[i].ux === undefined){
 					var out = self.coordinate.PanelMapCoordinateToUMCoordinate(obj.points[i].x,self.image.height-obj.points[i].y);
 					obj.points[i].ux = out.dOutputX;
 					obj.points[i].uy = out.dOutputY;
 				}
 			}
 			obj.update();
 			
 			if(pad.padType == 'frame'){
 		 		if(self.innerFrame == null)
 		 			self.innerFrame = obj;
 		 		else if(self.outerFrame == null)
 		 			self.outerFrame = obj;
 			}else if(pad.padType == 'region'){
 				hasRegion = true;
 			}else if(pad.padType == 'subMark'){
 				if(obj.points.length == 2 && pad.blocks === undefined){
 					var ux1 = obj.points[0].ux;
 					var uy1 = obj.points[0].uy;
 					var ux2 = obj.points[1].ux;
 					var uy2 = obj.points[1].uy;
 					self.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(Math.min(ux1,ux2),Math.min(uy1,uy2),Math.max(ux1,ux2),Math.max(uy1,uy2),true);
 					if(self.tmpCoordinate.bmpBlockMapPara.m_BlockMap.length == 1){
 						obj.blocks = _.map(self.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0],function(item){
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
 		    			
 		    			self.pad.isModified = true;
 		    			self.pad.isSubMarkModified = true;
 					}
 				}else if(obj.points.length > 2){
 					self.isPolygonSubMark = true;
 					self.$buttons.find('.submask-checkbox-label > input')[0].checked = true;
 				}
 			}else if(pad.padType == 'mainMark'){
 				if(pad.blocks === undefined){
 					var ux1 = obj.points[0].ux;
 					var uy1 = obj.points[0].uy;
 					var ux2 = obj.points[1].ux;
 					var uy2 = obj.points[1].uy;
 					self.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(Math.min(ux1,ux2),Math.min(uy1,uy2),Math.max(ux1,ux2),Math.max(uy1,uy2),true);
 					if(self.tmpCoordinate.bmpBlockMapPara.m_BlockMap.length == 1){
 						obj.blocks = _.map(self.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0],function(item){
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
 		    			
 		    			self.pad.isModified = true;
 		    			self.pad.isMainMarkModified = true;
 					}
 				}
 			}
 				
 		})
 		
 		if(this.innerFrame == null || this.outerFrame == null){
 			this.innerFrame = new Mycanvas.MyPolyline(this.map,'frame');
 			let {dOutputX:ux,dOutputY:uy} = this.coordinate.PanelMapCoordinateToUMCoordinate(500,500);
 			this.innerFrame.points.push({x:500,y:this.image.height-500,ux,uy});
 			let {dOutputX:ux2,dOutputY:uy2} = this.coordinate.PanelMapCoordinateToUMCoordinate(this.image.width-500,this.image.height-500);
 			this.innerFrame.points.push({x:this.image.width-500,y:500,ux:ux2,uy:uy2});
 			this.innerFrame.update();

 			this.outerFrame = new Mycanvas.MyPolyline(this.map,this.pad.curType);
			let {dOutputX:ux3,dOutputY:uy3} = this.coordinate.PanelMapCoordinateToUMCoordinate(300,300);
			this.outerFrame.points.push({x:300,y:this.image.height-300,ux:ux3,uy:uy3});
			let {dOutputX:ux4,dOutputY:uy4} = this.coordinate.PanelMapCoordinateToUMCoordinate(this.image.width-300,this.image.height-300);
			this.outerFrame.points.push({x:this.image.width-300,y:300,ux:ux4,uy:uy4});
			this.outerFrame.update();
			
			this._drawRegion();
			hasRegion = true;
		}
 		
 		if(!hasRegion)
 			this._drawRegion();
 		
 		this._drawInspectZone();

 		this.innerFrame.crosses[0].bringToFront();
 		this.innerFrame.crosses[1].bringToFront();
 		this.outerFrame.crosses[0].bringToFront();
 		this.outerFrame.crosses[1].bringToFront();
 		
 		this.innerFrame.crosses[0].outer = [this.outerFrame.crosses[0],this.outerFrame.crosses[1]];
 		this.innerFrame.crosses[1].outer = [this.outerFrame.crosses[0],this.outerFrame.crosses[1]];
 		
 		this.outerFrame.crosses[0].inner = [this.innerFrame.crosses[0],this.innerFrame.crosses[1]];
 		this.outerFrame.crosses[1].inner = [this.innerFrame.crosses[0],this.innerFrame.crosses[1]];

    	this.map.forEachObject(this.showObj.bind(this));

		this.map.discardActiveObject();
		this.map.renderAll();

     },

 	 _drawRegion: function(){
 		var x,y,ux,uy,obj; 
 		var innerFrame = this.innerFrame;
 		var outerFrame = this.outerFrame;
 		
 		var res = _.partition(this.map.pads, function(obj){
 			return obj.padType == 'region';
 		});
 		this.map.pads = res[1];
 		res[0].forEach(function(obj){
 			obj.clear();
 		})
 	    
 		 var top = innerFrame.points[1].uy + this.globalConf.region_overlap;
 		 while(true){
 			var bottom = top - this.globalConf.region_height;
 			var nextTop = bottom + this.globalConf.region_overlap;
 			if(bottom < innerFrame.points[0].uy - this.globalConf.region_overlap){
 				bottom = innerFrame.points[0].uy - this.globalConf.region_overlap;
 			}
 			else if((nextTop - this.globalConf.region_height)  < innerFrame.points[0].uy - this.globalConf.region_overlap ){
 				bottom = (top + innerFrame.points[0].uy)/2 - this.globalConf.region_overlap;
 				nextTop = bottom + this.globalConf.region_overlap;
 			}
 			
 			obj = new Mycanvas.MyPolyline(this.map,"region");
 			obj.iFrameNo = 0;
 			ux = outerFrame.points[0].ux;
 			uy = bottom;
 			let {dOutputX:x1, dOutputY:y1} = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
 			obj.points.push({x:x1,y:this.image.height-y1,ux,uy});
 			
 			ux = innerFrame.points[0].ux;
 			uy = top;
 			let {dOutputX:x2, dOutputY:y2} = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
 			obj.points.push({x:x2,y:this.image.height-y2,ux,uy});
 			obj.update();
 			
 			obj = new Mycanvas.MyPolyline(this.map,"region");
 			obj.iFrameNo = 2;
 			ux = innerFrame.points[1].ux;
 			uy = bottom;
 			let {dOutputX:x3, dOutputY:y3} = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
 			obj.points.push({x:x3,y:this.image.height-y3,ux,uy});
 			
 			ux = outerFrame.points[1].ux;
 			uy = top;
 			let {dOutputX:x4, dOutputY:y4} = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
 			obj.points.push({x:x4,y:this.image.height-y4,ux,uy});
 			obj.update();
 			
 			top = nextTop;
 			if(top <= innerFrame.points[0].uy)
 				break;
 		 }
 		 
 		obj = new Mycanvas.MyPolyline(this.map,"region");
		obj.iFrameNo = 1;
 		x = outerFrame.points[0].x;
 		ux = outerFrame.points[0].ux;
		y = outerFrame.points[0].y;
		uy = outerFrame.points[0].uy;
		obj.points.push({x,y,ux,uy});
		
		x = outerFrame.points[1].x;
		ux = outerFrame.points[1].ux;
		y = innerFrame.points[0].y;
		uy = innerFrame.points[0].uy;
		obj.points.push({x,y,ux,uy});
		obj.update();
 		 
 		obj = new Mycanvas.MyPolyline(this.map,"region");
 		obj.iFrameNo = 3;
 		x = outerFrame.points[0].x;
 		ux = outerFrame.points[0].ux;
		y = innerFrame.points[1].y;
		uy = innerFrame.points[1].uy;
		obj.points.push({x,y,ux,uy});
		
		x = outerFrame.points[1].x;
		ux = outerFrame.points[1].ux;
		y = outerFrame.points[1].y;
		uy = outerFrame.points[1].uy;
		obj.points.push({x,y,ux,uy});
		obj.update();
 		 
		this.pad.isModified = true;
 	 },
 	
 	_drawInspectZone: function(){
 		var id = 1;
 		while(this.bifConf['auops.subpanel.subpanel_'+id+'.global_subpanel_data'] != undefined){
 			if(this.bifConf['auops.subpanel.subpanel_'+id+'.global_subpanel_data'] != this.panelName){
 				id++;
 				continue;
 			}
 				
 			var pos = this.bifConf['auops.subpanel.subpanel_'+id+'.position.top_left'].split(',');
    		var left = parseFloat(pos[0]);
    		var top = parseFloat(pos[1]);
    		pos = this.bifConf['auops.subpanel.subpanel_'+id+'.position.bottom_right'].split(',');
    		var right = parseFloat(pos[0]);
    		var bottom = parseFloat(pos[1]);
    		
    		var x = (left + right)/2;
    		var y = (top + bottom)/2;
    		var panel_center_x = x * Math.cos(-this.glass_angle) + y * Math.sin(-this.glass_angle) + this.glass_center_x;
    		var panel_center_y = -x * Math.sin(-this.glass_angle) + y * Math.cos(-this.glass_angle) + this.glass_center_y;
    		
    		var x1 = left * Math.cos(-this.glass_angle) + top * Math.sin(-this.glass_angle)  + this.glass_center_x;
    		var y1 = -left * Math.sin(-this.glass_angle) + top * Math.cos(-this.glass_angle)  + this.glass_center_y;
    		var x2 = right * Math.cos(-this.glass_angle) + bottom * Math.sin(-this.glass_angle)  + this.glass_center_x;
    		var y2 = -right * Math.sin(-this.glass_angle) + bottom * Math.cos(-this.glass_angle) + this.glass_center_y;
    		
    		x1 = x1 - panel_center_x + parseFloat(this.padConf[this.panelName].panel_center_x);
    		y1 = y1 - panel_center_y + parseFloat(this.padConf[this.panelName].panel_center_y);
    		x2 = x2 - panel_center_x + parseFloat(this.padConf[this.panelName].panel_center_x);
    		y2 = y2 - panel_center_y + parseFloat(this.padConf[this.panelName].panel_center_y);
    		
    		var out1 = this.coordinate.UMCoordinateToPanelMapCoordinate(x1,y1)
    		var out2 = this.coordinate.UMCoordinateToPanelMapCoordinate(x2,y2)

    		x1 = out1.dOutputX;
    		y1 = this.image.height - out1.dOutputY;
    		x2 = out2.dOutputX;
    		y2 = this.image.height - out2.dOutputY;
    		var line1 = new Mycanvas.Line([x1,y1,x1,y2],{stroke: 'blue',pad:null});
	 		var line2 = new Mycanvas.Line([x1,y1,x2,y1],{stroke: 'blue',pad:null});
	 		var line3 = new Mycanvas.Line([x2,y2,x2,y1],{stroke: 'blue',pad:null});
	 		var line4 = new Mycanvas.Line([x2,y2,x1,y2],{stroke: 'blue',pad:null});
	 		this.map.add(line1,line2,line3,line4);
	 		
	 		this.inspectZoneX1 = x1;
	 		this.inspectZoneY1 = y1;
	 		this.inspectZoneX2 = x2;
	 		this.inspectZoneY2 = y2;
	 		
    		break;
 		}
 	},
 	
 	updateForSelect:function(){
    	var self = this; 
    	var first = true;
    	this.map.pads.forEach(function(pad){
			if(pad.padType == self.pad.curType && pad.points.length){
				if(pad.selected){
					pad.lines.forEach(function(line){line.dirty=true;line.stroke = 'red';line.fill='red'});
					if(first){
						//if(pad.crosses[0])
							//pad.crosses[0].visible = true;
						first = false;
					}
				}else{
					pad.lines.forEach(function(line){line.dirty=true;line.stroke = 'yellow';line.fill='yellow'});
					//if(pad.crosses[0])
						//pad.crosses[0].visible = false;
				}
			}
		});
    	this.map.renderAll();
 	}
 	
});

SystrayMenu.Items.push(CanvasInfo);

return Map;

});