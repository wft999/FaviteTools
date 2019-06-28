odoo.define('favite_common.WidgetMap', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');
var local_storage = require('web.local_storage');
var Widget = require('web.Widget');
var framework = require('web.framework');
var SystrayMenu = require('web.SystrayMenu');
var Canvas = require('favite_common.Canvas');
var canvas_registry = require('favite_common.canvas_registry');

var Mixin = require('favite_common.Mixin');

var QWeb = core.qweb;
var _t = core._t;

var WidgetMap = Widget.extend(Mixin.MapMouseHandle,Mixin.MapEventHandle,Mixin.MapCommandHandle,{
	template: 'favite_common.DashBoard.subview',
    events: {
//        'keydown.canvas-map': '_onKeydown'
    },
    CROSSHAIR: "url(/favite_common/static/src/img/crosshair.png) 8 8,crosshair",

    init: function(){
		this.fold = false;
		this.mouseMode = 'select';
        return this._super.apply(this, arguments);
    },
   
    willStart: function () {
    	var self = this;
        return this._super.apply(this, arguments).then(function () {
        	self.image = new fabric.Image();
        	var src = 'http://localhost/BaiduNetdiskDownload/385G4914CA2U/Glass.bmp';
        	var def = $.Deferred();
        	self.image.setSrc(src, function(img){
        		img.set({left: 0,top: 0,hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false });
        		def.resolve();
        	});
            return $.when(def);
        });
    },
    
    destroy: function(){	
    	this.$el.off('click', 'button.btn');
    	
    	if(this.map){
    		this.map.off('mouse:move');    		
        	this.map.off('mouse:out');  
        	this.map.off('mouse:up');
        	this.map.off('mouse:down');
        	this.map.off('mouse:wheel');
    		while(this.map.polylines.length){
    			var p = this.map.polylines.pop()
    			p.clear();
    			delete p.points;
    		}

    		this.map.clear();
    		delete this.image;
    		delete this.map;
    	}
    	this._super.apply(this, arguments);
    },
    
    _onTypeButtonClick: function(ev){
		var self = this;
		
		var key = $(ev.currentTarget).data('type');
		var baseKey = self.getParent().getParent().getBaseKey();
		var color = local_storage.getItem(baseKey+key) || 'yellow';
		
		var obj = {points:[]};
		self.geo[key].objs.push(obj);
		
		var objClass = Canvas.Polyline;
		if(canvas_registry.get(baseKey+key))
			objClass = canvas_registry.get(baseKey+key);
		
		self.map.curPolyline = new objClass(self.map,key,obj,color);
		self.map.curPolyline.focus(true);
		
		self.$('a.dropdown-toggle').toggleClass('o_hidden',true);
		self._showMode('crosshair',true);
		self.$('button[data-mode="crosshair"]').click();
	},
    
    _showObjsList(sel){
    	var self = this;
    	var $types = this.$('div.obj-types');
    	$types.empty();
    	for(var key in sel){
    		var $it = $('<a class="dropdown-item" data-type="'+key+'">'+key+'</a>');
    		$types.append($it);
    		$it.click(self._onTypeButtonClick.bind(self));
    	}
    },
    
    start: function () {
        var self = this;
        return this._super.apply(this, arguments).then(function () {
        	self.$el.on('click', 'button.btn',self._onButtonClick.bind(self));
        	self._showObjsList(self.getParent().state.data.geo);
        	
        	self.showMap();
        
        	return $.when();
        });
    },
    
    showMap: function(){
    	var self = this;
    	self.map  = new fabric.Canvas(self.$el.find('canvas')[0],{hoverCursor:'default',stopContextMenu:true});
		self.map.add(self.image);
		
		var dim = {width:self.$('.oe_content').width()-4,height:self.$('.oe_content').height()-4};
		self.map.setDimensions(dim);
		//console.log(self.$('.oe_content').width()+"-"+self.$('.oe_content').height())
		
		//var zoom = Math.max(self.map.getWidth()/self.image.width,self.map.getHeight()/self.image.height);
		var zoom = Math.max(dim.width/self.image.width,dim.height/self.image.height);
		zoom = Math.floor(zoom*100)/100;
		self.minZoom = zoom;
		self.map.setZoom(zoom);
		
		self.map.on('mouse:move',self._onMouseMove.bind(self));    		
		self.map.on('mouse:out', self._onMouseOut.bind(self));  
		self.map.on('mouse:up', self._onMouseUp.bind(self));
		self.map.on('mouse:down',self._onMouseDown.bind(self));
		self.map.on('mouse:wheel',self._onMouseWheel.bind(self));
		
		this.map.on('object:moving',_.debounce(this._onObjectMoving.bind(this), 100));
		self.map.on('object:moved',self._onObjectMoved.bind(self));
		self.map.on('selection:updated',this._onObjectSelect.bind(this));
		self.map.on('selection:created',this._onObjectSelect.bind(this));
		
		self.map.polylines = [];
		self._drawObjects();
    },
    
    updateState: function(state){
    	var self = this;
    	this._drawObjects();
    },
    
    _drawObjects:function(){
    	var self = this;
    	this.geo = {};
    	$.extend(true,this.geo,this.getParent().state.data.geo);
    	if(this.map){
    		while(this.map.polylines.length){
    			var p = this.map.polylines.pop()
    			p.clear();
    			delete p.points;
    		}
    		
    		var selected = new Array();
        	
        	for(var key in this.geo){
        		this.geo[key].objs.forEach(function(obj){
        			var baseKey = self.getParent().getParent().getBaseKey();
        			var color = local_storage.getItem(baseKey+key) || 'yellow';
        			
        			var objClass = Canvas.Polyline;
        			if(canvas_registry.get(baseKey+key))
        				objClass = canvas_registry.get(baseKey+key);
        			
         			var p = new objClass(self.map,key,obj,color);
         			p.render();
         			
         			if(obj.selected){
         				p.select(true);
    					p.lines.forEach(function(c){selected.push(c);})
    				}
         			
         			p.focus(obj.focused);
         			
         			if(self.objTypes){
         				var visible = self.objTypes.hasOwnProperty(p.type);
                		var color = visible && self.objTypes[p.type];
                		p.update(visible,color);
         			}
         			
        		});
        	}
        	
        	if(selected.length > 0){
				var sel = new fabric.ActiveSelection(selected, {canvas: this.map,hasControls: false,hoverCursor:"move",hasBorders:false});
				this.map.setActiveObject(sel);
			}
    	}
    },
    
    updateMap: function(sel){
    	this.objTypes = sel;
    	_.each(this.map.polylines,function(p){
    		var visible = sel.hasOwnProperty(p.type);
    		var color = visible && sel[p.type];
    		p.update(visible,color);
    	});
    	this.map.requestRenderAll();
    	
    	this._showObjsList(sel);
    },
    
    _onButtonClick : function(event) {
    	console.log(event);
    	var mode = $(event.currentTarget).data('mode');
		if(mode){
			this.$('button.btn').removeClass('active');
			$(event.currentTarget).addClass('active');
			
			this.map.hoverCursor = mode;
			this.map.selection = mode == 'default';
			if(mode == 'crosshair'){
				this.map.hoverCursor = this.CROSSHAIR;
			}else if(mode == 'default'){
				if(this.map.curPolyline){
					this.map.curPolyline.focus(false);
					this.map.curPolyline = null;
				}
				this._showCommand('Delete',false);
				this._showCommand('Copy',false);
				this._showMode('crosshair',false);
				this.$('a.dropdown-toggle').toggleClass('o_hidden',!!this.map.curPolyline);
			}
			
			this.map.discardActiveObject();
			_.each(this.map.polylines,p=>{p.select(false);});
		}
		else if($(event.target).data('command')){
			var fun = '_on' + $(event.target).data('command') + 'Click';
			this[fun] && this[fun](event);
		}
		this.map.requestRenderAll();
			
	},
	
	_showCommand: function(command,visible=false){
		this.$('button[data-command="' + command + '"]').toggleClass('o_hidden',!visible);
	},
	_showMode: function(mode,visible=false){
		this.$('button[data-mode="' + mode + '"]').toggleClass('o_hidden',!visible);
	},
	
});

return WidgetMap;

});