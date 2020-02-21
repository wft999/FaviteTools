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
    	
    	this.offset = {x:0,y:0};
    	this.ratio = {x:1,y:1};
    	this.size = {x:1,y:1};
		this.fold = false;
		this.mouseMode = 'select';
		
        return this._super.apply(this, arguments);
    },
   
    willStart: function () {
    	var self = this;
        return this._super.apply(this, arguments).then(function () {
        	var l = window.location;
        	var parts = self.getParent().state.data.camera_path.split('\\');

        	self.image_path = l.protocol + "//" + l.host + ':8080/' + 'BaiduNetdiskDownload/Glass1';
        	
        	
        	self.cameraConf = JSON.parse(self.getParent().state.data.camera_ini);
        	return $.when();
        });
    },
    
    destroy: function(){	
    	this.$el && this.$el.off('click', 'button.btn');
    	
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
		
		var obj = {name:(key+new Date().getTime()),points:[]};
		self.geo[key].objs.push(obj);
		
		var objClass = Canvas.Polyline;
		if(canvas_registry.get(baseKey+key))
			objClass = canvas_registry.get(baseKey+key);
		
		self.map.curPolyline = new objClass(self,key,obj,color);
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
    		if(_.isString(sel[key]) || (_.has(sel[key],'objs') && (!_.has(sel[key],'readonly')))){
    			var $it = $('<a class="dropdown-item" data-type="'+key+'">'+key+'</a>');
        		$types.append($it);
        		$it.click(self._onTypeButtonClick.bind(self));
    		}
    		
    	}
    },
    
    start: function () {
        var self = this;
        
        return this._super.apply(this, arguments).then(function () {
        	self.$el.on('click', 'button.btn',self._onButtonClick.bind(self));
        	self._showObjsList(self.getParent().state.data.geo);

        	return $.when();
        });
    },
    
    resetMap(){
    	var self = this;
    	var dim = {width:self.$('.oe_content').width(),height:self.$('.oe_content').height()};
    	
    	var zoom = Math.min(dim.width/self.size.x,dim.height/self.size.y);
		self.map.setDimensions(dim);
		self.map.setZoom(zoom);
		
		
/*		var left = (dim.width - zoom * self.image.width)/2;
		var top = (dim.height - zoom * self.image.height)/2;
		self.map.viewportTransform[4] = left;
	    self.map.viewportTransform[5] = top;*/
    },
    
    showMap: function(){
    	var self = this;
    	self.map  = new fabric.Canvas(self.$el.find('canvas')[0],{hoverCursor:'default',stopContextMenu:true});
    	self.map.add(self.image);

		self.resetMap();
		
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
    	
    	if(!this.getParent().state.data.geo.no_render_map){
    		this._drawObjects();
    	}
    		
    },
    
    _drawObjects:function(){
    	var self = this;
    	this.geo = {};
    	$.extend(true,this.geo,this.getParent().state.data.geo);
    	if(this.map){
    		while(this.map.polylines && this.map.polylines.length){
    			var p = this.map.polylines.pop()
    			p.clear();
    			delete p.points;
    		}
    		
    		var selected = new Array();
        	
        	for(var key in this.geo){
        		this.geo[key].objs && this.geo[key].objs.forEach(function(obj){
        			var baseKey = self.getParent().getParent().getBaseKey();
        			var color = local_storage.getItem(baseKey+key) || 'yellow';
        			
        			var objClass = Canvas.Polyline;
        			if(canvas_registry.get(baseKey+key))
        				objClass = canvas_registry.get(baseKey+key);
        			
         			var p = new objClass(self,key,obj,color,!!self.geo[key].readonly);
         			if(p.intersectsWithRect(0,self.size.x,0,self.size.y))
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
        	
        	this.map.discardActiveObject();
        	if(selected.length > 0){
				var sel = new fabric.ActiveSelection(selected, {canvas: this.map,hasControls: false,hoverCursor:"move",hasBorders:false});
				this.map.setActiveObject(sel);
			}
    	}
    },
    
    updateMap: function(sel){
    	this.objTypes = sel;
    	if(this.map){
    		this.map.polylines && _.each(this.map.polylines,function(p){
        		var visible = sel.hasOwnProperty(p.type);
        		var color = visible && sel[p.type];
        		p.update(visible,color);
        	});
        	this.map.requestRenderAll();
    	}
    	
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
	
	_geo2map: function(point){
		var {dOutputX:x, dOutputY:y} = this.coord.UMCoordinateToMapCoordinate(point.x,point.y);
		return {x,y:this.size.y-y};
	},
	_map2geo: function(point){
		var {dOutputX:x, dOutputY:y} = this.coord.MapCoordinateToUMCoordinate(point.x,this.size.y-point.y);
		return {x,y};
	},
	
});

return WidgetMap;

});