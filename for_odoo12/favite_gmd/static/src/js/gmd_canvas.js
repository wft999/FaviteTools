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
			this.map.remove(cross);
		}
		while(this.panels.length)
		{
			var panel = this.panels.pop()
			panel.clear();
		}

	},
	
	checkPoint:function(point){
		if(this.points.length == 1){
			if(point.x <= this.points[0].x || point.y <= this.points[0].y)
				return false;
		}else if(this.points.length == 2){
			if(point.x < this.points[1].x || point.y < this.points[1].y)
				return false;
		}else if(this.points.length == 3){
			if(point.x <= this.points[2].x || point.y <= this.points[2].y)
				return false;
		}else if(this.points.length == 4){
			return false;
		}

		return true;
	},
	
	_addPanel:function(obj){
		var panel = new Canvas.Polyline(this.map,this.type,obj,this.color);
		panel.render();
		this.panels.push(panel);
		this.map.polylines = _.without(this.map.polylines,panel);
	},
    
	_render: function(){

		while(this.crosses.length)
		{
			var cross = this.crosses.pop()
			this.map.remove(cross);
		}
		while(this.panels.length)
		{
			var panel = this.panels.pop()
			panel.clear();
		}
		
		var row = 0;
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
				obj.points.push({x,y});
				obj.points.push({x:x+width,y:y+height});
				this._addPanel(obj);
			}
		}
 
		var wh = 10/this.map.getZoom();
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
			this.map.add(cross);
		}
	}
});

canvas_registry.add('favite_gmd_gmd_block',Block);

});
