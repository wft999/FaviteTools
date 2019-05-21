odoo.define('padtool.Pad_field', function (require) {
"use strict";

var NotificationManager = require('web.notification').NotificationManager;
var ControlPanelMixin = require('web.ControlPanelMixin');
var core = require('web.core');
var Dialog = require('web.Dialog');
var Map = require('padtool.Map');
var Mycanvas = require('padtool.Canvas');
var Hawkmap = require('padtool.Hawkmap');
var Coordinate = require('padtool.coordinate');

var AbstractField = require('web.AbstractField');
var field_registry = require('web.field_registry');

var QWeb = core.qweb;
var _t = core._t;


var PadField = AbstractField.extend(ControlPanelMixin,{
    template: 'Map',
    
    events: {
//        'keydown.canvas-map': '_onKeydown'
    },

    init: function(parent,action){
    	this.action_manager = parent;
    	this.pad = {
    		curType: 'frame',
    		isModified:false,
    		isSubMarkModified:false,
    	};
    	
    	this.undoStack = [];
        this.redoStack = [];
    	
        return this._super.apply(this, arguments);
    },
   
    willStart: function () {
        var self = this;
        return this._rpc({model: 'padtool.pad',method: 'panel_information',args: [146],})
            .then(function(res) {
            	_.extend(self,res);
            	self.coordinate = new Coordinate(res.cameraConf,res.bifConf,res.padConf,res.panelName);
            	self.tmpCoordinate = new Coordinate(res.cameraConf,res.bifConf,res.padConf,res.panelName);
            });
    },
    
    start: function(){
    	var self = this;
    	this.notification_manager = new NotificationManager(this);
        this.notification_manager.appendTo(this.$el);
    	this._super.apply(this, arguments);
    	
    	this.defImage = new $.Deferred();
    	this.image = new fabric.Image();
    	var src = '/glassdata/'+ this.glassName +'/'+ this.panelName +'/' + this.padConf[this.panelName].panel_map
    	this.image.setSrc(src, function(img){
    		img.set({left: 0,top: 0,hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false });
    		self.map  = new fabric.Canvas('map',{
    			hoverCursor:'default',
    			stopContextMenu:false,
    			imageSmoothingEnabled:false,
    		});
    		self.map.pads = new Array();
    		self.map.isPanel = true;
    		var zoom = Math.max(self.map.getWidth()/img.width,self.map.getHeight()/img.height);
    		zoom = Math.floor(zoom*10)/10;
    		self.minZoom = zoom;
    		self.map.setZoom(zoom);
    		self.map.setDimensions({width:img.width*zoom,height:img.height*zoom});
    		self.map.add(img);

    		self.map.on('mouse:move',_.debounce(self._onMouseMove.bind(self), 100));    		
    		self.map.on('mouse:out', self._onMouseOut.bind(self)); 
    		self.map.on('mouse:up', self._onMouseUp.bind(self));
    		self.map.on('mouse:down',self._onMouseDown.bind(self));
    		self.map.on('mouse:dblclick',self._onMouseDblclick.bind(self));

    		self.map.on('object:moved',self._onObjectMoved.bind(self));
    		self.map.on('object:scaled',self._onObjectScaled.bind(self));

//    		self.keyupHandler = self._onKeyup.bind(self);
//    		$('body').on('keyup', self.keyupHandler);
    		
//    		self.keydownHandler = self._onKeydown.bind(self);
 //   		$('body').on('keydown', self.keydownHandler);

    		self.defImage.resolve();
    		self.coordinate.pmpPanelMapPara.iPanelMapWidth = self.image.width;
    		self.coordinate.pmpPanelMapPara.iPanelMapHeight = self.image.height;
    		
    		self._loadPad();
    		self._drawHawk();
    		
    		self._renderButtons();
//    		self._updateControlPanel();
    		self._showToolbar();
    		
    		$('.breadcrumb').append('<li>frame</li>');
    	});
    	
    },
   
    
    destroy: function(){	
    	if(this.pad.isModified){
    		var self = this;
    		var su = self._super;
    		Dialog.confirm(this, (_t("The current pad was modified. Save changes?")), {
                confirm_callback: function () {
                    self._onButtonSave().then(function(){
                    	while(self.map.pads.length){
                			var pad = self.map.pads.pop();
                			pad.clear();
                			delete pad.points;
                		}

                    	self.map.clear();
                		delete self.image;
                		delete self.map;	

                        su.apply(self, arguments);
                    });
                },
            });
    	}else{
    		if(this.map){
        		while(this.map.pads.length){
        			var pad = this.map.pads.pop()
        			pad.clear();
        			delete pad.points;
        		}

        		this.map.clear();
        		delete this.image;
        		delete this.map;
        	}
    		this._super.apply(this, arguments);
    	}
    	
    	this.hawkmap&&this.hawkmap.destroy();
    },

    do_show: function () {
        this._super.apply(this, arguments);
        this._updateControlPanel();
        
    },
    
    register:function(pad,action) {
    	var pads = [];
    	if(Array.isArray(pad)){
    		pads = pad;
    	}else{
    		pads.push(pad);
    	}
    	
    	var points = [];
    	pads.forEach(function(item){
    		var tmp = [];
    		
    		item.points.forEach(function(p){
    			if(action !== 'copy')
    				tmp.push({x:p.x,y:p.y,ux:p.ux,uy:p.uy});
        	});

    		points.push(tmp);
    	})
    	
        this.undoStack.push({pads,points,action});
        this.redoStack.length = 0;
    },
    
    undo:function() {
        var c = this.undoStack.pop();
        if (c) {
        	var points = [];
        	for(var i = 0; i< c.pads.length; i++){
        		if(c.action == 'delete')
        			points.push([]);
        		else
        			points.push(c.pads[i].points);
        		
        		c.pads[i].points = c.points[i];
                c.pads[i].update();
        	}
            this.redoStack.push({pads:c.pads,points,action:c.action});
            this.hawkmap && this.hawkmap.showImage();
        }
    },
    
    redo:function() {
        var c = this.redoStack.pop();
        if (c) {
        	var points = [];
        	for(var i = 0; i< c.pads.length; i++){
        		points.push(c.pads[i].points);
        		
        		c.pads[i].points = c.points[i];
                c.pads[i].update();
        	}
        	
            this.undoStack.push({pads:c.pads,points,action:c.action});
            this.hawkmap && this.hawkmap.showImage();
        }
    },

  //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    _drawHawk:function(){
    	this.hawkeye = new Mycanvas.Hawkeye({ 
 			left: this.image.width/2, 
 			top: this.image.height/2,
 			width:300,
 			height:300,
 			});
    	this.map.add(this.hawkeye);
    	this.hawkeye.bringToFront();
    },
    
    _onButtonSelectMode:function(e){
    	var self = this;
    	this.map.hoverCursor = e.currentTarget.dataset.mode;

    	$('.glassmap-mode button').removeClass('active');
    	$(e.currentTarget).addClass('active');
    	
    	if(this.map.hoverCursor == 'default'){
    		this.map.discardActiveObject();
    	}
    	this.map.requestRenderAll();
    	this._showToolbar();
    },
    
    _showToolbar(){
    	if(this.pad.curType === undefined)
    		this.pad.curType = 'frame';
    	
    	var hidden = this.pad.curType == 'frame' || this.pad.curType == 'subMark' 
    	this.$buttons.find('.fa-trash').toggleClass('o_hidden',hidden);
    	this.$buttons.find('.fa-undo').toggleClass('o_hidden',hidden);
    	this.$buttons.find('.fa-repeat').toggleClass('o_hidden',hidden);

    	hidden = this.pad.curType !== 'subMark'
    	this.$buttons.find('.fa-refresh').toggleClass('o_hidden',hidden);
    },
    
    showObj:function(obj){
		if(obj.pad){
			obj.visible = obj.pad.padType == this.pad.curType || (obj.pad.padType == 'region' && this.pad.curType == 'frame');
			if(obj.type == 'cross')
				obj.visible = false;
		}
		
	},
    
    _onButtonSelectObject:function(e){
    	if(e.currentTarget.children[0].text == 'Save'){
    		this._onButtonSave();
    		return;
    	}
    	
    	
    	var self = this;
    	this.pad.curType = e.currentTarget.children[0].text;
    	
    	this._showToolbar();
    	
    	var objectList = this.$buttons.find('.o_pad_object_list');
    	objectList.find('li').each(function (index, li) {
    		var addOrRemove  = li === e.currentTarget;
            $(li).toggleClass('selected',addOrRemove);
            if(addOrRemove){
            	if($('.breadcrumb')[0].children[1])
            		$('.breadcrumb')[0].removeChild($('.breadcrumb')[0].children[1]);
            	$('.breadcrumb').append('<li>'+self.pad.curType+'</li>')
            }
        });
    	
    	if(this.pad.curType == 'subMark'){
    		if(_.some(this.map.pads,function(obj){return obj.padType == 'subMark'}) == false)
    			this._drawSubMark();
    	}
    	
    	this.map.forEachObject(this.showObj.bind(this));
    	this.map.discardActiveObject();
    	this.map.renderAll();
    	
    	if(this.hawkmap){
    		this.hawkmap.map.curPad = null;
    		this.hawkmap.map.forEachObject(this.showObj.bind(this));
    		this.hawkmap.map.discardActiveObject();
    		this.hawkmap.map.renderAll();
    		
    		this.hawkmap.$el.find('button.fa-mouse-pointer').click();
    		var hidden = this.pad.curType == 'frame' || this.pad.curType == 'subMark';
        	this.hawkmap.$el.find('.fa-edit').toggleClass('o_hidden',hidden);
         	this.hawkmap.$el.find('.fa-copy').toggleClass('o_hidden',hidden);
    	}
    	
    	this.$buttons.find('.fa-mouse-pointer').click();
    	
    	e.preventDefault();
		e.stopPropagation();

    },
    
    _onButtonSave:function(){
    	var self = this;
    	var pad = new Object();
    	pad.dPanelCenterX = parseFloat(this.padConf[this.panelName]['PANEL_CENTER_X'.toLowerCase()]);
    	pad.dPanelCenterY = parseFloat(this.padConf[this.panelName]['PANEL_CENTER_Y'.toLowerCase()]);
    	pad.region_overlap = this.globalConf.region_overlap;
    	pad.region_height = this.globalConf.region_height;
    	pad.isSubMarkModified = this.pad.isSubMarkModified;
    	pad.isMainMarkModified = this.pad.isMainMarkModified;
    	
    	pad.objs = new Array();
    	var mainMarkStartX = 0;
    	var subMarkStartX = 0;
    	this.map.pads.forEach(function(obj){
    		if(obj.points.length < 2)
    			return;
    		if(_.some(obj.points,function(p){return p.ux == undefined || p.uy == undefined})){
    			self.notification_manager.warn(_t('Operation Result'),_t('Point is not correct !'),false);
    			return;
    		}
    		
    		var o = {
    			padType: obj.padType,
    			points:obj.points,
    		};
    		if(obj.padType == 'mainMark'){
    			o.blocks = obj.blocks;
    			o.iMarkDirectionType = obj.iMarkDirectionType;
    			o.imgStartX = mainMarkStartX;
    			obj.imgStartX = mainMarkStartX;
    			mainMarkStartX += o.blocks[0].iInterSectionWidth;
    		}else if(obj.padType == 'subMark'){
    			o.blocks = obj.blocks;
    			o.iMarkDirectionType = obj.iMarkDirectionType;
    			o.imgStartX = subMarkStartX;
    			obj.imgStartX = subMarkStartX;
    			subMarkStartX += o.blocks[0].iInterSectionWidth;
    		}
    		else if(obj.padType == 'inspectZone'){
    			o.periodX = obj.periodX || 0;
    			o.periodY = obj.periodY || 0;
    			o.D1G1 = obj.D1G1 || 0;
    		}else if(obj.padType == 'region'){
    			o.iFrameNo = obj.iFrameNo;
    		}
    		
    		pad.objs.push(o);
    	});
    	//pad.pMarkRegionArray = this.pMarkRegionArray;
    	
    	return this._rpc({model: 'padtool.pad',method: 'save_pad',args: [this.glassName,this.panelName,pad],}).then(function(){
    		self.notification_manager.notify(_t('Operation Result'),_t('Pad was succesfully saved!'),false);
    		self.pad.isModified = false;
    		self.pad.isSubMarkModified = false;
    		self.pad.isMainMarkModified = false;
    		
    		var d = new Date();
			var src = '/glassdata/'+ self.glassName +'/'+ self.panelName +'/mainMark.bmp'+'?t='+ d.getTime();
			fabric.Image.fromURL(src, function(img) {
				self.mainMarkImage = img;
				self.mainMarkImage.originX = 'left';
				self.mainMarkImage.originY = 'top';
			});
			
			src = '/glassdata/'+ self.glassName +'/'+ self.panelName +'/subMark.bmp'+'?t='+ d.getTime();
			fabric.Image.fromURL(src, function(img) {
				self.subMarkImage = img;
				self.subMarkImage.originX = 'left';
				self.subMarkImage.originY = 'top';
			});
        });
    },
    
    _onButtonTrash:function(){
    	var self = this;
    	var objs = _.filter(this.map.pads,function(pad){return pad.selected && pad.padType == self.pad.curType});
    	if(objs.length == 0){
    		this.notification_manager.warn(_t('Incorrect Operation'),_t('Please select one object!'),false);
    		return;
    	}

		Dialog.confirm(this, (_t("Are you sure you want to remove these items?")), {
            confirm_callback: function () {
            	self.register(objs,'delete');
            	for(var i = 0; i< objs.length;i++){
            		objs[i].clear();
            		if(objs[i].padType == 'mainMark'){
            			self.pad.isMainMarkModified = true;
            		}
            		objs[i].points = [];
            	}
            	
            	self.pad.isModified = true;
            	if(self.pad.isModified && self.hawkeye.visible)
            		self.hawkmap.drawPad();
            },
        });
    	
    	
    },
    
    _onButtonRefresh:function(){
    	this._drawSubMark();
    	this.notification_manager.notify(_t('Operation Result'),_t('SubMark has refreshed!'),false);
    },
    
    _renderButtons: function () {
    	this.$buttons = $(QWeb.render('Panelmap.Buttons'));
    	//this.$switch_buttons = $(QWeb.render('Panelmap.status'));
    	//this.$buttons.on('click', '.fa-eye',this._onButtonHawkeye.bind(this) );
    	this.$buttons.on('click', '.fa-refresh',this._onButtonRefresh.bind(this) );
    	
    	this.$buttons.on('click', '.fa-mouse-pointer',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-search-plus',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-search-minus',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-trash',this._onButtonTrash.bind(this) );
    	
    	this.$buttons.on('click', '.fa-undo',this.undo.bind(this) );
    	this.$buttons.on('click', '.fa-repeat',this.redo.bind(this) );

    	this.$buttons.on('click', '.o_pad_object_list>li',this._onButtonSelectObject.bind(this) );
     },
 /*    _updateControlPanel: function () {    			
      	this.update_control_panel({
                breadcrumbs: this.action_manager.get_breadcrumbs(),
                cp_content: {
              	  $searchview: this.$buttons,
              	  //$buttons: this.$buttons,
              	  //$switch_buttons:this.$switch_buttons,
              },
      	});
  	},*/
     
     _loadPad: function(){
    	var pos = this.cameraConf.general.glass_center.split(',');
 		this.glass_center_x = parseFloat(pos[0]);
 		this.glass_center_y = parseFloat(pos[1]);
 		this.glass_angle = parseFloat(this.cameraConf.general.angle);
 		
    	var self = this;
    	var url = '/glassdata/'+this.glassName +'/'+ this.panelName +'/'+ this.panelName+'.json';

    	var def2 = $.ajax(url, {dataType: "json",cache:false})
         	.done(function(json_data){
         		self.jsonpad = json_data;
         	})
         	.fail(function(){
         		self.jsonpad = new Array();
         	})
         	.always(self._drawPad.bind(this));
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
     	}
     },
     
    _onMouseDown:function(opt){
    	this.map.startPointer = opt.pointer;
    },
	_onMouseMove:function(opt){
		var zoom = this.map.getZoom();
		var x = opt.e.offsetX;
		var y = opt.e.offsetY;
		
		let {dOutputX:ux, dOutputY:uy} = this.coordinate.PanelMapCoordinateToUMCoordinate(x/zoom,this.image.height- y/zoom);

		$(".map-info").text('image(x:'+Math.round(x/zoom)+',y:'+Math.round(y/zoom)+') window(x:'+x+',y:'+y+') um(x:'+ux+',y:'+uy+')');
		
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
 		
    	 var div = this.$('div.canvas-map').length? this.$('div.canvas-map'): this.$el;
 		
    	 x = x1 * zoom - (x - div.scrollLeft());
    	 y = y1 * zoom - (y - div.scrollTop());
    	 this.map.setZoom(zoom);
    	 this.map.setDimensions({width:this.image.width*zoom,height:this.image.height*zoom});

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
    	}else if(_isDrawRect && this.map.hoverCursor == 'default'){
    		if(this.isObjectMoved || this.isObjectScaled){
    			this.isObjectMoved = false;
    			this.isObjectScaled = false;
    			return;
    		}
    		var left = Math.min(this.map.startPointer.x,opt.pointer.x)/zoom;
			var bottom = Math.max(this.map.startPointer.y,opt.pointer.y)/zoom;
			var right = Math.max(this.map.startPointer.x,opt.pointer.x)/zoom;
			var top = Math.min(this.map.startPointer.y,opt.pointer.y)/zoom;
    		for(var i = 0; i < this.map.pads.length; i++){
				if(this.map.pads[i].padType != this.pad.curType)
					continue;
				this.map.pads[i].selected = this.map.pads[i].withinRect(left,right,top,bottom);	
			}
			this.map.discardActiveObject();
			this.updateForSelect();
			if(this.hawkmap){
				this.hawkmap._updateForMode();
			}
    	}
    },
  
     _drawPad:function(){ 
 		var self = this;
 		this.innerFrame = null;
 		this.outerFrame = null;
 		this.jsonpad.objs && this.jsonpad.objs.forEach(function(pad){
 			var obj = new Mycanvas.MyPolyline(self.map,pad.padType);
 			obj = _.extend(obj, pad);
 			obj.update();
 			//self.pad.objs.push(obj);
 			
 			if(pad.padType == 'frame'){
 		 		if(self.innerFrame == null)
 		 			self.innerFrame = obj;
 		 		else if(self.outerFrame == null)
 		 			self.outerFrame = obj;
 			}
 		})
 		
 		if(this.innerFrame == null || this.outerFrame == null){
 			this.innerFrame = new Mycanvas.MyPolyline(this.map,'frame');
 			let {dOutputX:ux,dOutputY:uy} = this.coordinate.PanelMapCoordinateToUMCoordinate(500,500);
 			this.innerFrame.points.push({x:500,y:this.image.height-500,ux,uy});
 			let {dOutputX:ux2,dOutputY:uy2} = this.coordinate.PanelMapCoordinateToUMCoordinate(this.image.width-500,this.image.height-500);
 			this.innerFrame.points.push({x:this.image.width-500,y:500,ux:ux2,uy:uy2});
 			this.innerFrame.update();
 			//this.pad.objs.push(this.innerFrame);

 			this.outerFrame = new Mycanvas.MyPolyline(this.map,this.pad.curType);
			let {dOutputX:ux3,dOutputY:uy3} = this.coordinate.PanelMapCoordinateToUMCoordinate(300,300);
			this.outerFrame.points.push({x:300,y:this.image.height-300,ux:ux3,uy:uy3});
			let {dOutputX:ux4,dOutputY:uy4} = this.coordinate.PanelMapCoordinateToUMCoordinate(this.image.width-300,this.image.height-300);
			this.outerFrame.points.push({x:this.image.width-300,y:300,ux:ux4,uy:uy4});
			this.outerFrame.update();
			//this.pad.objs.push(this.outerFrame);

			this._drawRegion();
		}

 		this.innerFrame.crosses[0].bringToFront();
 		this.innerFrame.crosses[1].bringToFront();
 		this.outerFrame.crosses[0].bringToFront();
 		this.outerFrame.crosses[1].bringToFront();

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
 			if((nextTop - this.globalConf.region_height)  < innerFrame.points[0].uy - this.globalConf.region_overlap ){
 				bottom = innerFrame.points[0].uy - this.globalConf.region_overlap;
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
 			//this.pad.objs.push(obj);
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
 			//this.pad.objs.push(obj);
 			obj.update();
 			
 			top = nextTop;
 			if((top - this.globalConf.region_height) < innerFrame.points[0].uy  - this.globalConf.region_overlap)
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
		//this.pad.objs.push(obj);
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
		//this.pad.objs.push(obj);
		obj.update();
 		 
		
 	 },
 	 
 	 _getSubMark(){
 		var dPanelLeft,dPanelBottom,dPanelRight,dPanelTop,dPeriodX, dPeriodY;
 		var id = 1;
		
 		while(this.bifConf['auops.subpanel.subpanel_'+id+'.global_subpanel_data'] != undefined){
 			var pos = this.bifConf['auops.subpanel.subpanel_'+id+'.position.top_left'].split(',');
    		var left = parseFloat(pos[0]);
    		var top = parseFloat(pos[1]);
    		
    		pos = this.bifConf['auops.subpanel.subpanel_'+id+'.position.bottom_right'].split(',');
    		var right = parseFloat(pos[0]);
    		var bottom = parseFloat(pos[1]);
    		
    		var pos2 = this.bifConf['auops.subpanel.subpanel_'+id+'.position.top_right'].split(',');
    		var right2 = parseFloat(pos2[0]);
    		var top2 = parseFloat(pos2[1]);
    		
    		pos = this.bifConf['auops.subpanel.subpanel_'+id+'.position.bottom_left'].split(',');
    		var left2 = parseFloat(pos[0]);
    		var bottom2 = parseFloat(pos[1]);
    		
    		var tmp = left * Math.cos(-this.glass_angle) + top * Math.sin(-this.glass_angle) + this.glass_center_x;
    		top = -left * Math.sin(-this.glass_angle) + top * Math.cos(-this.glass_angle) + this.glass_center_y;
    		left = tmp;
    		
    		tmp = right * Math.cos(-this.glass_angle) + bottom * Math.sin(-this.glass_angle) + this.glass_center_x;
    		bottom = -right * Math.sin(-this.glass_angle) + bottom * Math.cos(-this.glass_angle) + this.glass_center_y;
    		right = tmp;
    		
    		tmp = left2 * Math.cos(-this.glass_angle) + bottom2 * Math.sin(-this.glass_angle) + this.glass_center_x;
    		bottom2 = -left2 * Math.sin(-this.glass_angle) + bottom2 * Math.cos(-this.glass_angle) + this.glass_center_y;
    		left2 = tmp;
    		
    		tmp = right2 * Math.cos(-this.glass_angle) + top2 * Math.sin(-this.glass_angle) + this.glass_center_x;
    		top2 = -right2 * Math.sin(-this.glass_angle) + top2 * Math.cos(-this.glass_angle) + this.glass_center_y;
    		right2 = tmp;
    		
    		var dOutputX = this.coordinate.pmpPanelMapPara.dPanelCenterX;
    		var dOutputY = this.coordinate.pmpPanelMapPara.dPanelCenterY;
    		if(dOutputX > left && dOutputX < right && dOutputY < bottom && dOutputY > top){
    			
    			var name = this.bifConf['auops.subpanel.subpanel_'+id+'.global_subpanel_data'];
    			
				pos = this.bifConf['auops.global_subpanel_data.'+name+'.cellneighbor.check.basicpixelsize'].split(',');
	    		var dPeriodX = parseFloat(pos[0]);
	    		var dPeriodY = parseFloat(pos[1]);

	    		this.pMarkRegionArray = this.coordinate.GetSubMark(Math.max(left,left2),Math.max(top,top2),Math.min(right,right2),Math.min(bottom,bottom2),dPeriodX, dPeriodY);
    			break;
    		}
    		id++;
 		}
 	 },
 	 
 	_drawSubMark:function(){
 		var res = _.partition(this.map.pads, function(obj){
 			return obj.padType == 'subMark';
 		});
 		this.map.pads = res[1];
 		res[0].forEach(function(obj){
 			obj.clear();
 		});
 		
 		this._getSubMark();
 		for(var i = 0; i < this.pMarkRegionArray.length; i++){
 			var width = this.pMarkRegionArray[i].dMarkWidth ;
 			var height = this.pMarkRegionArray[i].dMarkHeight;
 			
 			var rect = new Mycanvas.MyPolyline(this.map,'subMark');
 			
 			var ux = this.pMarkRegionArray[i].dPositionX- width/2;
			var uy = this.pMarkRegionArray[i].dPositionY+ height/2;
 			var tmp = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
    		rect.points.push({
    			x:tmp.dOutputX, 
    			y:this.image.height - tmp.dOutputY,
    			ux,
    			uy
    		});
    		
    		ux = this.pMarkRegionArray[i].dPositionX+ width/2;
			uy = this.pMarkRegionArray[i].dPositionY- height/2;
    		tmp = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
			rect.points.push({
				x:tmp.dOutputX, 
				y:this.image.height - tmp.dOutputY,
				ux,
				uy
			});
			rect.update();
			
			rect.iMarkDirectionType = this.pMarkRegionArray[i].iMarkDirectionType;

 			var uLeft = this.pMarkRegionArray[i].dPositionX - this.pMarkRegionArray[i].dMarkWidth/2;
 			var uRight = this.pMarkRegionArray[i].dPositionX + this.pMarkRegionArray[i].dMarkWidth/2;
 			var uTop = this.pMarkRegionArray[i].dPositionY + this.pMarkRegionArray[i].dMarkHeight/2;
 			var uBottom = this.pMarkRegionArray[i].dPositionY - this.pMarkRegionArray[i].dMarkHeight/2;
 			
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
 			
 			//this.pad.objs.push(rect);
 		}
 		
 		this.pad.isSubMarkModified = true;
 	},
 	
 	updateForSelect:function(){
    	var self = this; 
    	var first = true;
    	this.map.pads.forEach(function(pad){
			if(pad.padType == self.pad.curType && pad.points.length){
				if(pad.selected){
					pad.lines.forEach(function(line){line.dirty=true;line.stroke = 'red';line.fill='red'});
					if(first){
						if(pad.crosses[0])
							pad.crosses[0].visible = true;
						first = false;
					}
				}else{
					pad.lines.forEach(function(line){line.dirty=true;line.stroke = 'yellow';line.fill='yellow'});
					if(pad.crosses[0])
						pad.crosses[0].visible = false;
				}
			}
		});
    	this.map.renderAll();
 	}
});

//core.action_registry.add('padtool.panelmap', Panelmap);
field_registry.add('pad_field', PadField);

return PadField;

});