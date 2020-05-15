odoo.define('favite_bif.GspWidgetMap', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');


var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');

var QWeb = core.qweb;
var _t = core._t;

var Class = require('web.Class');
var Canvas = require('favite_common.Canvas');
var canvas_registry = require('favite_common.canvas_registry');
var DOMAIN_WIDTH = 1024
var DOMAIN_HEIGHT = 1024

var Domain = Canvas.Polyline.extend({
	checkPoint:function(point){
		if(this.points && this.points.length > 0){
			return false;
		}
		return true;
	},
    specialHandle: function(){
    	var obj = this.obj;
    	
    	if(obj.points && obj.points.length == 1){
    		obj.points.push({x:obj.points[0].x + DOMAIN_WIDTH,y:obj.points[0].y + DOMAIN_HEIGHT});
    		obj.points[0].x -= DOMAIN_WIDTH;
    		obj.points[0].y -= DOMAIN_HEIGHT;
    	}
    	
   	 	this.widget.coord.GetRectIntersectionInfoInBlockMapMatrix(obj.points[0].x,obj.points[0].y,obj.points[1].x,obj.points[1].y,true);
    	if(this.widget.coord.bmpBlockMapPara.m_BlockMap.length == 0 || this.widget.coord.bmpBlockMapPara.m_BlockMap[0].length == 0){
    		this.do_warn(_t('Incorrect Operation'),_t('Width  or height is 0!'),false);
    	}else{
    		obj.strBlocks = JSON.stringify(this.widget.coord.bmpBlockMapPara.m_BlockMap);
    	}

    	return true;
	},
    
});

var Zone = Canvas.Polyline.extend({
	
	checkPoint: function(point){
		if(this.widget.map_type != "raw")
			return false;

		var point = this.widget._map2geo(point);
    	var dz = this.widget.geo["domain"];
    	if(dz && dz.objs.length > 0){
    		var left = Math.min(dz.objs[0].points[0].x,dz.objs[0].points[1].x);
    		var right = Math.max(dz.objs[0].points[0].x,dz.objs[0].points[1].x);
    		var top = Math.max(dz.objs[0].points[0].y,dz.objs[0].points[1].y);
    		var bottom = Math.min(dz.objs[0].points[0].y,dz.objs[0].points[1].y);
    		
    		return point.x >= left && point.x <= right && point.y <= top && point.y >= bottom; 
    	}else{
    		return false;
    	}
    		
	},
	
	specialHandle: function(){
		var dz = this.widget.geo["domain"];
		var x = Math.min(dz.objs[0].points[0].x,dz.objs[0].points[1].x)
		var y = Math.min(dz.objs[0].points[0].y,dz.objs[0].points[1].y)
		var org = this.widget._geo2map({x,y});
		
		var self = this;
    	this.obj.points.forEach(function(p){
    		var tmp = self.widget._geo2map(p);
    		p.offsetX = tmp.x - org.x;
    		p.offsetY = -tmp.y + org.y;
    	})
    	
    	return true;
	},
});
var DarkBright = Canvas.Polyline.extend({
	
	checkPoint: function(point){
		if(this.points && this.points.length >= 2){
			return false;
		}

		var point = this.widget._map2geo(point);
    	var dz = this.widget.geo["domain"];
    	if(dz && dz.objs.length > 0){
    		var left = Math.min(dz.objs[0].points[0].x,dz.objs[0].points[1].x);
    		var right = Math.max(dz.objs[0].points[0].x,dz.objs[0].points[1].x);
    		var top = Math.max(dz.objs[0].points[0].y,dz.objs[0].points[1].y);
    		var bottom = Math.min(dz.objs[0].points[0].y,dz.objs[0].points[1].y);
    		
    		return point.x >= left && point.x <= right && point.y <= top && point.y >= bottom; 
    	}else{
    		return false;
    	}
    		
	},
	
	specialHandle: function(){
		var dz = this.widget.geo["domain"];
		var x = Math.min(dz.objs[0].points[0].x,dz.objs[0].points[1].x)
		var y = Math.min(dz.objs[0].points[0].y,dz.objs[0].points[1].y)
		var org = this.widget._geo2map({x,y});
		
		var self = this;
    	this.obj.points.forEach(function(p){
    		var tmp = self.widget._geo2map(p);
    		p.offsetX = tmp.x - org.x;
    		p.offsetY = -tmp.y + org.y;
    	})
    	
    	return true;
	},
});


var Circle = Canvas.Polyline.extend({
	clear:function(){
		if(this.arc)
			this.widget.map.remove(this.arc);
		return this._super.apply(this, arguments);
	},
	checkPoint:function(point){
		if(this.points && this.points.length >= 2){
			return false;
		}
		return this._super.apply(this, arguments);
	},
	
	containsPoint:function(point){
		var poly
		if(this.points.length < 2 ){
			return false;
		}
		else{
			var tmpx = point.x - this.points[0].x;
			var tmpy = point.y - this.points[0].y;
			var radius = Math.sqrt(tmpx * tmpx + tmpy * tmpy);
			
			return radius <= this.arc.radius;
		}
	},
	_render: function(ctx){
		while(this.crosses.length)
		{
			var cross = this.crosses.pop()
			this.widget.map.remove(cross);
		}
		while(this.lines.length)
		{
			var line = this.lines.pop()
			this.widget.map.remove(line);
		}
		if(this.text)
			this.widget.map.remove(this.text);
		if(this.arc)
			this.widget.map.remove(this.arc);

		var wh = 10/this.widget.map.getZoom();
		if(this.points.length >= 2){
			var tmpx = this.points[1].x - this.points[0].x;
			var tmpy = this.points[1].y - this.points[0].y;
			var radius = Math.sqrt(tmpx * tmpx + tmpy * tmpy);
			
			this.arc = new Canvas.Arc({
	            radius,
	            startAngle:0,
	            endAngle : 2 * Math.PI,
	            left: this.points[0].x,
	            top: this.points[0].y,
	            visible:true,strokeDash:this.strokeDash,fill: this.color,stroke: this.color
	          });
			
			this.widget.map.add(this.arc);
		}
		
		for(var i = 0; i < this.points.length; i++){			
			if(this.readonly)
				continue;
			
			var cross = new Canvas.Cross({ 
				id:i,
				top: this.points[i].y, 
				left: this.points[i].x,
				width:wh,
				height:wh,
				polyline:this,
				stroke:i==0?'aqua':'lime',
				visible:true
				});
			this.crosses.push(cross);
			this.widget.map.add(cross);
		}
	}
    
});

var Bow = Canvas.Polyline.extend({
	specialHandle: function(){
		if(this.obj.points && this.obj.points.length == 3){
			var tmpx = this.obj.points[1].x - this.obj.points[0].x;
			var tmpy = this.obj.points[1].y - this.obj.points[0].y;
			var radius = Math.sqrt(tmpx * tmpx + tmpy * tmpy);
			var engle = Math.atan2(this.obj.points[2].y - this.obj.points[0].y, this.obj.points[2].x - this.obj.points[0].x);
			this.obj.points[2].x = this.obj.points[0].x + Math.cos(engle) * radius;
			this.obj.points[2].y = this.obj.points[0].y + Math.sin(engle) * radius;
		}
    	
    	return true;
	},
	clear:function(){
		if(this.arc)
			this.widget.map.remove(this.arc);
		return this._super.apply(this, arguments);
	},
	checkPoint:function(point){
		if(this.points && this.points.length >= 3){
			return false;
		}
		return this._super.apply(this, arguments);
	},
	
	containsPoint:function(point){
		var poly
		if(this.points.length < 2 ){
			return false;
		}
		else{
			var tmpx = point.x - this.points[0].x;
			var tmpy = point.y - this.points[0].y;
			var radius = Math.sqrt(tmpx * tmpx + tmpy * tmpy);
			var engle = Math.atan2(point.y - this.points[0].y, point.x - this.points[0].x);
			
			return radius <= this.arc.radius && (( engle >= this.arc.startAngle && engle <= this.arc.endAngle) || ( engle <= this.arc.startAngle && engle >= this.arc.endAngle));
		}
	},
	_render: function(ctx){
		while(this.crosses.length)
		{
			var cross = this.crosses.pop()
			this.widget.map.remove(cross);
		}
		while(this.lines.length)
		{
			var line = this.lines.pop()
			this.widget.map.remove(line);
		}
		if(this.text)
			this.widget.map.remove(this.text);
		if(this.arc)
			this.widget.map.remove(this.arc);

		var wh = 10/this.widget.map.getZoom();
		var attr = {visible:true,strokeDash:this.strokeDash,fill: this.color,stroke: this.color};
		if(this.points.length >= 3){
			var tmpx = this.points[1].x - this.points[0].x;
			var tmpy = this.points[1].y - this.points[0].y;
			var radius = Math.sqrt(tmpx * tmpx + tmpy * tmpy);
			
			var line = new Canvas.Line([this.points[1].x,this.points[1].y,this.points[2].x,this.points[2].y],attr);
			this.lines.push(line);
			this.widget.map.add(line);
			
			var startAngle = Math.atan2(this.points[1].y - this.points[0].y, this.points[1].x - this.points[0].x);
			var endAngle = Math.atan2(this.points[2].y - this.points[0].y,this.points[2].x - this.points[0].x);

			this.arc = new Canvas.Arc({
	            radius,
	            startAngle,
	            endAngle,
	            left: this.points[0].x,
	            top: this.points[0].y,
	            visible:true,strokeDash:this.strokeDash,fill: this.color,stroke: this.color
	          });
			
			this.widget.map.add(this.arc);
		}
		
		for(var i = 0; i < this.points.length; i++){			
			if(this.readonly)
				continue;
			
			var cross = new Canvas.Cross({ 
				id:i,
				top: this.points[i].y, 
				left: this.points[i].x,
				width:wh,
				height:wh,
				polyline:this,
				stroke:i==0?'aqua':'lime',
				visible:true
				});
			this.crosses.push(cross);
			this.widget.map.add(cross);
		}
	}
    
});

canvas_registry.add('favite_bif_gsp_zone',Zone);
canvas_registry.add('favite_bif_gsp_bright',DarkBright);
canvas_registry.add('favite_bif_gsp_dark',DarkBright);
canvas_registry.add('favite_bif_gsp_domain',Domain);
canvas_registry.add('favite_bif_gsp_circle',Circle);
canvas_registry.add('favite_bif_gsp_bow',Bow);

var GspWidgetMap = {
    
    _onTypeButtonClick: function(ev){
    	var key = $(ev.currentTarget).data('type');
    	if(key == 'domain' && this.geo[key].objs.length>=1){
    		this.do_warn(_t('Incorrect Operation'),_t('domain already exists !'),false);
    		return;
    	}
/*    	if(key == 'mark' && this.geo[key].objs.length>=2){
    		this.do_warn(_t('Incorrect Operation'),_t('mark already exists !'),false);
    		return;
    	}*/
		
		return this._super.apply(this, arguments);
	},

    
    
};

return GspWidgetMap;

});