odoo.define('favite_common.WidgetMap', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');
var local_storage = require('web.local_storage');
var Widget = require('web.Widget');
var framework = require('web.framework');
var SystrayMenu = require('web.SystrayMenu');
var Mycanvas = require('favite_common.Canvas');

var Mixin = require('favite_common.Mixin');

var QWeb = core.qweb;
var _t = core._t;
var CROSSHAIR = "url(http://localhost/favite_common/static/src/img/crosshair.png) 8 8,crosshair";

var WidgetMap = Widget.extend(Mixin.MapMouseHandle,Mixin.MapEventHandle,Mixin.MapCommandHandle,{
	template: 'favite_common.DashBoard.subview',
    events: {
//        'keydown.canvas-map': '_onKeydown'
    },

    init: function(){
		this.fold = false;
		this.mouseMode = 'select';
        return this._super.apply(this, arguments);
    },
   
    willStart: function () {
    	var self = this;
        return this._super.apply(this, arguments).then(function () {
        	self.image = new fabric.Image();
        	var src = '/favite_common/static/src/img/glass.bmp';
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
    
    start: function () {
        var self = this;
        return this._super.apply(this, arguments).then(function () {
        	self.$el.on('click', 'button.btn',self._onButtonClick.bind(self));
        	self.showMap();
        
        	return $.when();
        });
    },
    
    showMap: function(){
    	var self = this;
    	self.map  = new fabric.Canvas(self.$el.find('canvas')[0],{hoverCursor:'default',stopContextMenu:true});
		self.map.add(self.image);
		
		self.map.setDimensions({width:self.$('.oe_content').width()-4,height:self.$('.oe_content').height()-4});
		console.log(self.$('.oe_content').width()+"-"+self.$('.oe_content').height())
		
		var zoom = Math.min(self.map.getWidth()/self.image.width,self.map.getHeight()/self.image.height);
		zoom = Math.floor(zoom*100)/100;
		self.minZoom = zoom;
		self.map.setZoom(zoom);
		
		self.map.on('mouse:move',self._onMouseMove.bind(self));    		
		self.map.on('mouse:out', self._onMouseOut.bind(self));  
		self.map.on('mouse:up', self._onMouseUp.bind(self));
		self.map.on('mouse:down',self._onMouseDown.bind(self));
		self.map.on('mouse:wheel',self._onMouseWheel.bind(self));
		
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
        	
        	for(var key in this.geo){
        		this.geo[key].objs.forEach(function(obj){
        			var baseKey = self.getParent().getParent().modelName + '_' ;
        			var color = local_storage.getItem(baseKey+key) || 'yellow';
         			var p = new Mycanvas.MyPolyline(self.map,key,obj,color);
         			p.render();
        		});
        	}
    	}
    },
    
    updateMap: function(sel){
    	_.each(this.map.polylines,function(p){
    		var visible = sel.hasOwnProperty(p.type);
    		var color = visible && sel[p.type];
    		p.update(visible,color);
    	});
    	this.map.requestRenderAll();
    },
    
    
    
    _onButtonClick : function(event) {
    	console.log(event);
    	var mode = $(event.currentTarget).data('mode');
		if(mode){
			this.$('button.btn').removeClass('active');
			$(event.currentTarget).addClass('active');
			
			this.map.hoverCursor = mode;
			this.map.selection = mode == 'default';
			if(mode == 'crosshair')
				this.map.hoverCursor = CROSSHAIR;

		}
		else if($(event.target).data('command')){
			var fun = '_on' + $(event.target).data('command') + 'Click';
			this[fun] && this[fun](event);
		}
			
	},
	
	_toggleCommand: function(command,visible=false){
		this.$('button[data-command="' + command + '"]').toggleClass('o_hidden',!visible);
	},
	
});

return WidgetMap;

});