odoo.define('padtool.Map', function (require) {
"use strict";

var core = require('web.core');
var Widget = require('web.Widget');
var SystrayMenu = require('web.SystrayMenu');
var framework = require('web.framework');
var Dialog = require('web.Dialog');

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
		this.undoStack = [];
        this.redoStack = [];
        
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

    	
    	framework.blockUI();
    	this.defImage = new $.Deferred();
    	this.image = new fabric.Image();
    	
    	this.image.setSrc(this.src, function(img){
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
    		
    	});
    	
    	
    },
    
    deleteMap:function(){
    	$('body').off('keyup', this.keyupHandler);
    	$('body').off('keydown', this.keydownHandler);
    	while(this.map.pads.length){
			var pad = this.map.pads.pop();
			pad.clear();
			delete pad.points;
		}

    	this.map.clear();
		delete this.image;
		delete this.map;	
    },
    
    destroy: function(){	
    	if(this.pad.isModified){
    		var self = this;
    		var su = self._super;
    		Dialog.confirm(this, (_t("The current pad was modified. Save changes?")), {
                confirm_callback: function () {
                    self._onButtonSave().then(function(){
                    	self.map && self.deleteMap.call(self);
                    	su.apply(self, arguments);
                    });
                },
                cancel_callback:function(){
                	self.deleteMap.call(self);
                	su.apply(self, arguments);
                }
            });
    	}else{
    		this._super.apply(this, arguments);
    		if(this.map){
        		this.deleteMap();
        	}
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
 			width:100,
 			height:100,
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
    	this.map.forEachObject(this.showObj.bind(this));
    	this.map.requestRenderAll();
    	this._showToolbar();
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
            	if($('.breadcrumb')[0].children[2])
            		$('.breadcrumb')[0].removeChild($('.breadcrumb')[0].children[2]);
            	$('.breadcrumb').append('<li>'+self.pad.curType+'</li>')
            }
        });
    	
    	this.map.forEachObject(this.showObj.bind(this));
    	this.map.discardActiveObject();
    	this.map.renderAll();
    	
    	if(this.hawkmap){
    		this.hawkmap.map.curPad = null;
    		this.hawkmap.map.forEachObject(this.showObj.bind(this));
    		this.hawkmap.map.discardActiveObject();
    		this.hawkmap.map.renderAll();
    		
    		this.hawkmap.$el.find('button.fa-mouse-pointer').click();
    		var hidden = this.pad.curType == 'frame' || (this.pad.curType == 'subMark' && this.isPolygonSubMark==false);
        	this.hawkmap.$el.find('.fa-edit').toggleClass('o_hidden',hidden);
         	this.hawkmap.$el.find('.fa-copy').toggleClass('o_hidden',hidden);
    	}
    	
    	this.$buttons.find('.fa-mouse-pointer').click();
    	
    	e.preventDefault();
		e.stopPropagation();

    },
    
    _updateControlPanel: function () {    			
      	this.update_control_panel({
                breadcrumbs: this.action_manager.get_breadcrumbs(),
                cp_content: {
              	  $searchview: this.$buttons,
              	  //$buttons: this.$buttons,
              	  //$switch_buttons:this.$switch_buttons,
              },
      	});
  	},
  	
  	
  	
  	
    
      
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
    			//this._onButtonCopy();
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


    _onMouseDown:function(opt){
    	this.map._isMousedown = true;
    	this.map.startPointer = opt.pointer;
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
				if(this.map.pads[i].padType != this.pad.curType){
					if(this.map.pads[i].padType != 'region' || (this.pad.curType != 'frame' && this.pad.curType != 'pframe' ))
						continue;
				}
				
				if(_isDrawRect){
					this.map.pads[i].selected = this.map.pads[i].withinRect(left,right,top,bottom);
				}else{
					if(this.map.pads[i].containsPoint({x,y})){
						this.map.pads[i].selected = !this.map.pads[i].selected;
					}else{
						if(!opt.e.ctrlKey){
							this.map.pads[i].selected = false;
						}
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

 	
});

SystrayMenu.Items.push(CanvasInfo);

return Map;

});