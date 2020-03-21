odoo.define('favite_bif.Canvas', function (require) {
"use strict";

var Class = require('web.Class');
var Canvas = require('favite_common.Canvas');
var canvas_registry = require('favite_common.canvas_registry');

var Block = Canvas.Polyline.extend({
	
	init: function() {
		this.panels = [];
		this._super.apply(this, arguments);
    },
    
    specialHandle: function(){
    	var obj = this.obj;
    	obj.panels = [];
    	if(obj.points.length > 1){
			
			var row = 0;
			var col = 0;
			var offsetX = 0;
			var offsetY = 0;
			var width = obj.points.length > 1 ? obj.points[1].x-obj.points[0].x : 0;
			var height = obj.points.length > 1 ? obj.points[1].y-obj.points[0].y : 0;
			if(obj.points.length == 2){
				row = 1;
				col = 1;
			}else if(obj.points.length == 3){
				col = Math.floor((obj.points[2].x-obj.points[0].x)/width);
				row = Math.floor((obj.points[2].y-obj.points[0].y)/height);
				offsetX = col>1?((obj.points[2].x-obj.points[0].x)%width)/(col-1):0;
				offsetY = row>1?((obj.points[2].y-obj.points[0].y)%height)/(row-1):0;
			}
			
			obj.row = row;
			obj.col = col;
			for(var r = 0; r < row; r++){
				for(var c = 0; c < col; c++){
					var x = c * (width + offsetX) + obj.points[0].x;
					var y = r * (height + offsetY) + obj.points[0].y;
					var panel = {points:[],name:"panel" + (r * col + c)};
					panel.points.push({x,y});
					panel.points.push({x:x+width,y:y+height});
					obj.panels.push(panel);
				}
			}
			
			if(obj.pad == undefined){
				obj.pad = {points:[]};
				
				var padx = 50/this.widget.ratio.x;
				var pady = 50/this.widget.ratio.y;
				obj.pad.points.push({x:obj.points[0].x - padx,y:obj.points[0].y + pady});
				obj.pad.points.push({x:obj.points[1].x + padx,y:obj.points[1].y - pady});
			}
			
		}
    	return true;
	},
    
    focus: function(focused){
		var self = this;
		this.obj.focused = focused;
		this.widget.map.curPolyline = focused ? this : this.widget.map.curPolyline;
		_.each(this.crosses,function(c){
			c.visible = focused && self.visible;
		})
		this.pad && _.each(this.pad.crosses,function(c){
			c.visible = focused && self.visible;
		})
	},
    
    update: function(visible,color){
		var self = this;
		this.visible = visible;
		this.color = color;
		_.each(this.crosses,function(c){
			c.visible = visible && c.visible;
		})
		_.each(this.panels,function(p){
			p.update(visible,color);
		})
		
		this.pad && this.pad.update(visible,color);
		
	},
    
    containsPoint:function(point){
		var poly
		if(this.points.length < 2){
			return false;
		}
		else{
			_.each(this.panels,p=>{p.select(p.containsPoint(point))});
			var left = Math.min(this.points[0].x,this.points[this.points.length - 1].x);
			var right = Math.max(this.points[0].x,this.points[this.points.length - 1].x);
			var top = Math.min(this.points[0].y,this.points[this.points.length - 1].y);
			var bottom = Math.max(this.points[0].y,this.points[this.points.length - 1].y);

			poly = new fabric.Polygon([{x:left,y:top},{x:right,y:top},{x:right,y:bottom},{x:left,y:bottom}]);
			return  poly.containsPoint(point,null,true,true);
		}
	},
	
	clear:function(){
		var self = this;
		while(this.crosses.length)
		{
			var cross = this.crosses.pop()
			this.widget.map.remove(cross);
		}
		while(this.panels.length)
		{
			var panel = this.panels.pop()
			panel.clear();
		}
		
		this.pad && this.pad.clear();

	},
	
	checkPoint:function(point){
		if(this.points.length == 1){
			if(point.x <= this.points[0].x || point.y >= this.points[0].y)
				return false;
		}else if(this.points.length == 2){
			if(point.x < this.points[1].x || point.y > this.points[1].y)
				return false;
		}else if(this.points.length == 3){
			//if(point.x <= this.points[2].x || point.y <= this.points[2].y)
				return false;
		}else if(this.points.length == 4){
			return false;
		}

		return true;
	},
	
	_addPanel:function(obj){
		var panel = new Canvas.Polyline(this.widget,this.type,obj,this.color);
		panel.render();
		this.panels.push(panel);
		this.widget.map.polylines = _.without(this.widget.map.polylines,panel);
	},
    
	_render: function(){

		while(this.crosses.length)
		{
			var cross = this.crosses.pop()
			this.widget.map.remove(cross);
		}
		while(this.panels.length)
		{
			var panel = this.panels.pop()
			panel.clear();
		}
		
		this.pad && this.pad.clear();
		
		var self = this;
		if(this.obj.panels){
			_.each(this.obj.panels,p=>{
				self._addPanel(p);
			});
		}
		
		if(this.obj.pad){
			this.pad = new Canvas.Polyline(this.widget,this.type,this.obj.pad,'Tomato');
			this.pad.render();
			this.widget.map.polylines = _.without(this.widget.map.polylines,this.pad);
		}
 
		var wh = 10/this.widget.map.getZoom();
		for(var i = 0; i < this.points.length; i++){
			var cross = new Canvas.Cross({ 
				id:i,
				top: this.points[i].y, 
				left: this.points[i].x,
				width:wh,
				height:wh,
				polyline:this,
				stroke:i==0?'aqua':'lime',
				visible:false
				});
			this.crosses.push(cross);
			this.widget.map.add(cross);
		}
	}
});

canvas_registry.add('favite_bif_bif_block',Block);

});
