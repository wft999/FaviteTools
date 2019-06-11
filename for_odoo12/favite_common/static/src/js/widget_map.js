odoo.define('favite_common.WidgetMap', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var Widget = require('web.Widget');
var framework = require('web.framework');
var SystrayMenu = require('web.SystrayMenu');

var Mixin = require('favite_common.Mixin');

var QWeb = core.qweb;
var _t = core._t;


var WidgetMap = Widget.extend(Mixin.RedoUndo,{
	template: 'favite_common.DashBoard.subview',
    events: {
//        'keydown.canvas-map': '_onKeydown'
    },

    init: function(){
    	this.undoStack = [];
		this.redoStack = [];
		this.fold = false;
		this.mouseMode = 'select';
        return this._super.apply(this, arguments);
    },
   
    willStart: function () {
    	var self = this;
        return this._super.apply(this, arguments).then(function () {
            return $.when();
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
/*    		while(this.map.pads.length){
    			var pad = this.map.pads.pop()
    			pad.clear();
    			delete pad.points;
    		}*/

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
        	
        	self.image = new fabric.Image();
        	var src = '/favite_common/static/src/img/glass.bmp';
        	self.image.setSrc(src, function(img){
        		img.set({left: 0,top: 0,hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false });
        		self.map  = new fabric.Canvas(self.$el.find('canvas')[0],{hoverCursor:'default',stopContextMenu:true});
        		self.map.add(img);
        		
        		self.map.setDimensions({width:self.$('.oe_content').width(),height:self.$('.oe_content').height()});
        		
        		var zoom = Math.min(self.map.getWidth()/img.width,self.map.getHeight()/img.height);
        		zoom = Math.floor(zoom*100)/100;
        		self.minZoom = zoom;
        		self.map.setZoom(zoom);
        		
        		self.map.on('mouse:move',self._onMouseMove.bind(self));    		
        		self.map.on('mouse:out', self._onMouseOut.bind(self));  
        		self.map.on('mouse:up', self._onMouseUp.bind(self));
        		self.map.on('mouse:down',self._onMouseDown.bind(self));
        		self.map.on('mouse:wheel',self._onMouseWheel.bind(self));

        	});
        	return $.when();
        });
    },
    
    _onMouseWheel:function(opt){
    	var delta = opt.e.deltaY;
    	
    	var zoom = this.map.getZoom();
    	zoom = zoom + delta/300;
    	if (zoom > 20) zoom = 20;
    	if (zoom < 0.01) zoom = 0.01;
    	this.map.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    	opt.e.preventDefault();
    	opt.e.stopPropagation();
    },
    
    _onMouseDown:function(opt){
    	var evt = opt.e;
    	this.map.isDragging = true;
    	if (this.map.hoverCursor == 'move') {
    	    this.map.lastPosX = evt.clientX;
    	    this.map.lastPosY = evt.clientY;
    	}
    },
	_onMouseMove:function(opt){
		if (this.map.hoverCursor == 'move' && this.map.isDragging === true) {
		    var e = opt.e;
		    this.map.viewportTransform[4] += e.clientX - this.map.lastPosX;
		    this.map.viewportTransform[5] += e.clientY - this.map.lastPosY;
		    this.map.requestRenderAll();
		    this.map.lastPosX = e.clientX;
		    this.map.lastPosY = e.clientY;
		}else{
			var pointer = this.map.getPointer(opt.e);
			$(".map-info").text("image(x:"+Math.round(pointer.x)+",y:"+Math.round(pointer.y)+")");
		}
	},
	
	_onMouseOut:function(opt){
		$(".map-info").text("");
	},
	
	_onMouseUp:function(opt){
		this.map.isDragging = false;
		this.map.selection = this.map.hoverCursor == 'default';
	},
    
    _onButtonClick : function(event) {
    	console.log(event);
    	var mode = $(event.currentTarget).data('mode');
		if(mode){
			this.$('button.btn').removeClass('active');
			$(event.currentTarget).addClass('active');
			
			this.map.hoverCursor = mode;
			this.map.selection = mode == 'default';

		}
		else if($(event.target).data('command'))
			this['_on' + $(event.target).data('command') + 'Click'](event);
	},
    
	_onHandClick : function(event) {
		alert("hand");
		this.mouse_mode = 'hand';
	},

});

var CanvasInfo = Widget.extend({
    template: 'Map.info',
    
    init: function (parent, value) {
        this._super(parent);

    },
});

SystrayMenu.Items.push(CanvasInfo);

return WidgetMap;

});