odoo.define('favite_gmd.Canvas', function (require) {
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
    	if((obj.points.length == 2 && obj.row == 1 && obj.col == 1) || obj.points.length == 3){
    		var row = obj.row;
			var col = obj.col;
			
			function convert(p,dAngle){
				return {
					x : p.x * Math.cos(dAngle) + p.y * Math.sin(dAngle),
					y : -p.x * Math.sin(dAngle) + p.y * Math.cos(dAngle)
				}
			}
			
			var dAngle = parseFloat(this.widget.cameraConf['glass.angle.0']);
			var p0 = convert(obj.points[0],dAngle);
			var p1 = convert(obj.points[1],dAngle);
			
			obj.panel_width =  p1.x-p0.x;
			obj.panel_height = p1.y-p0.y;
			
			var offsetX = 0;
			var offsetY = 0;
			if(obj.points.length == 3){
				var p2 = convert(obj.points[2],dAngle);
				offsetX = col>1?(p2.x-p0.x - obj.panel_width)/(col-1) - obj.panel_width:0;
				offsetY = row>1?(p2.y-p0.y - obj.panel_height)/(row-1) - obj.panel_height:0;
			}

			for(var r = 0; r < row; r++){
				for(var c = 0; c < col; c++){
					var panel = {points:[],panel_index:(r * col + c),name:"P" + (r * col + c),d1g1:"1",pixelsize:"478.8000,159.6000"};
					
					var x = c * (obj.panel_width + offsetX) + p0.x;
					var y = r * (obj.panel_height + offsetY) + p0.y;
					
					panel.points.push(convert({x,y},-dAngle));
					panel.points.push(convert({x:x+obj.panel_width,y:y},-dAngle));
					panel.points.push(convert({x:x+obj.panel_width,y:y+obj.panel_height},-dAngle));
					panel.points.push(convert({x:x,y:y+obj.panel_height},-dAngle));
					obj.panels.push(panel);
				}
			}
			
			if(obj.pad == undefined){
				obj.pad = {points:[]};
				
				var padx = 50/this.widget.ratio.x;
				var pady = 50/this.widget.ratio.y;
				obj.pad.points.push({x:obj.points[0].x - padx,y:obj.points[0].y - pady});
				obj.pad.points.push({x:obj.points[1].x + padx,y:obj.points[1].y + pady});
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
			//_.each(this.panels,p=>{p.select(p.containsPoint(point))});
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
			var cross = this.crosses.pop();
			this.widget.map.remove(cross);
		}
		while(this.panels.length)
		{
			var panel = this.panels.pop();
			panel.clear();
		}
		
		this.pad && this.pad.clear();
		
/*		var row = 0;
		var col = 0;
		var offsetX = 0;
		var offsetY = 0;
		var width = this.points.length > 1 ? this.points[1].x-this.points[0].x : 0;
		var height = this.points.length > 1 ? this.points[1].y-this.points[0].y : 0;
		if(this.points.length == 2){
			row = 1;
			col = 1;
		}else if(this.points.length == 3){
			col = Math.floor((this.points[2].x-this.points[0].x)/width);
			row = Math.floor((this.points[2].y-this.points[0].y)/height);
			offsetX = col>1?((this.points[2].x-this.points[0].x)%width)/(col-1):0;
			offsetY = row>1?((this.points[2].y-this.points[0].y)%height)/(row-1):0;
		}else if(this.points.length == 4){
			offsetX = this.points[2].x-this.points[1].x;
			offsetY = this.points[2].y-this.points[1].y;
			row = Math.floor((this.points[3].y-this.points[0].y + offsetY)/(height+offsetY) + 0.5);
			col = Math.floor((this.points[3].x-this.points[0].x + offsetX)/(width+offsetX) + 0.5);
		}
		
		for(var r = 0; r < row; r++){
			for(var c = 0; c < col; c++){
				var x = c * (width + offsetX) + this.points[0].x;
				var y = r * (height + offsetY) + this.points[0].y;
				var obj = {points:[],block:this};
				obj.points.push(this.widget._map2geo({x,y}));
				obj.points.push(this.widget._map2geo({x:x+width,y:y+height}));
				this._addPanel(obj);
			}
		}*/
		
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


var LightRegion = Canvas.Polyline.extend({
	
	init: function() {
		this.panels = [];
		this._super.apply(this, arguments);
    },
    
    checkPoint:function(point){
		if(this.points.length >= 2){
			return false;
		}

		return true;
	},
});


canvas_registry.add('favite_bif_frame_filter',LightRegion);
canvas_registry.add('favite_bif_frame_inspect',LightRegion);
canvas_registry.add('favite_bif_panel_filter',LightRegion);
canvas_registry.add('favite_gmd_gmd_mask',LightRegion);
canvas_registry.add('favite_gmd_gmd_markoffset',LightRegion);
canvas_registry.add('favite_gmd_gmd_lightRegion',LightRegion);
canvas_registry.add('favite_gmd_gmd_mark',LightRegion);
canvas_registry.add('favite_gmd_gmd_markoffset',LightRegion);
canvas_registry.add('favite_gmd_gmd_lightRegion',LightRegion);
canvas_registry.add('favite_gmd_gmd_block',Block);

});
