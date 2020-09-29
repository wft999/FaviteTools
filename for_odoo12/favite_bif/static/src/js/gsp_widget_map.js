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
var ZONE_FRAME_WIDTH = 1000
var ZONE_FRAME_HEIGHT = 1000

var ZoneFrame = Canvas.Polyline.extend({
	checkPoint:function(point){
		if(this.points && this.points.length > 0){
			return false;
		}
		return true;
	},
    specialHandle: function(){
    	var obj = this.obj;
    	obj.nocross = true;
    	
		var zone_frame_width = parseFloat(this.widget.getParent().state.data.period[0]);
		var zone_frame_height = parseFloat(this.widget.getParent().state.data.period[1]);
    	
    	if(obj.points && obj.points.length == 1){
    		obj.points.push({x:obj.points[0].x + zone_frame_width/2,y:obj.points[0].y + zone_frame_height/2});
    		obj.points[0].x -= zone_frame_width/2;
    		obj.points[0].y -= zone_frame_height/2;
    	}
    	
   	 	this.widget.coord.GetRectIntersectionInfoInBlockMapMatrix(obj.points[0].x,obj.points[0].y,obj.points[1].x,obj.points[1].y,true);
    	if(this.widget.coord.bmpBlockMapPara.m_BlockMap.length == 0 || this.widget.coord.bmpBlockMapPara.m_BlockMap[0].length == 0){
    		this.do_warn(_t('Incorrect Operation'),_t('Width  or height is 0!'),false);
    	}else{
    		obj.strBlocks = JSON.stringify(this.widget.coord.bmpBlockMapPara.m_BlockMap);
    		obj.imgWidth = _.reduce(this.widget.coord.bmpBlockMapPara.m_BlockMap, function(memo, block){ 
        		return memo + (block[0]&&block[0].bHasIntersection?block[0].iInterSectionWidth:0); 
        		}, 0);
        	obj.imgHeight = _.reduce(this.widget.coord.bmpBlockMapPara.m_BlockMap[0], function(memo, block){ 
        		return memo  + (block&&block.bHasIntersection?block.iInterSectionHeight:0); 
        		}, 0);
    	}
    	
    	this.widget.coord.GetRectIntersectionInfoInBlockMapMatrix(obj.points[0].x-zone_frame_width,obj.points[0].y-zone_frame_height,obj.points[1].x+zone_frame_width,obj.points[1].y+zone_frame_height,true);
    	if(this.widget.coord.bmpBlockMapPara.m_BlockMap.length == 0 || this.widget.coord.bmpBlockMapPara.m_BlockMap[0].length == 0){
    		this.do_warn(_t('Incorrect Operation'),_t('Width  or height is 0!'),false);
    	}else{
    		obj.strBlocks3 = JSON.stringify(this.widget.coord.bmpBlockMapPara.m_BlockMap);
    		obj.imgWidth3 = _.reduce(this.widget.coord.bmpBlockMapPara.m_BlockMap, function(memo, block){ 
        		return memo + (block[0]&&block[0].bHasIntersection?block[0].iInterSectionWidth:0); 
        		}, 0);
        	obj.imgHeight3 = _.reduce(this.widget.coord.bmpBlockMapPara.m_BlockMap[0], function(memo, block){ 
        		return memo  + (block&&block.bHasIntersection?block.iInterSectionHeight:0); 
        		}, 0);
    	}

    	return true;
	},
	
	_render: function(ctx) {
		this._super.apply(this, arguments);
		
		var zone_frame_width = parseFloat(this.widget.getParent().state.data.period[0]);
		var zone_frame_height = parseFloat(this.widget.getParent().state.data.period[1]);
		var attr = {visible:true,strokeDash:this.strokeDash,fill: this.color,stroke: this.color};
		
		var x1 = this.obj.points[0].x - zone_frame_width;
		var y1 = this.obj.points[0].y - zone_frame_height;
		var x2 = this.obj.points[1].x + zone_frame_width;
		var y2 = this.obj.points[1].y + zone_frame_height;
		
		var tmp = this.widget._geo2map({x:x1,y:y1});
		x1 = tmp.x;
		y1 = tmp.y;
		tmp = this.widget._geo2map({x:x2,y:y2});
		x2 = tmp.x;
		y2 = tmp.y;
		
		var line = new Canvas.Line([x1,y1,x1,y2],attr);
		this.lines.push(line);
		this.widget.map.add(line);
		line = new Canvas.Line([x1,y2,x2,y2],attr);
		this.lines.push(line);
		this.widget.map.add(line);
		line = new Canvas.Line([x2,y2,x2,y1],attr);
		this.lines.push(line);
		this.widget.map.add(line);
		line = new Canvas.Line([x2,y1,x1,y1],attr);
		this.lines.push(line);
		this.widget.map.add(line);
	}
    
});

var Zone = Canvas.Polyline.extend({
	
	init: function(widget,type,obj,color,readonly=false){
		this._super.apply(this, arguments);
/*		this.level = 15;
		this.darktol = 15;
		this.brighttol = 15;
		this.longedgeminsize = 0;
		this.longedgemaxsize = 0;
		this.shortedgeminsize = 0;
		this.shortedgemaxsize = 0;*/
	},
	
	checkCross:function(point){
		var dz = this.widget.geo["zoneFrame"];
		var left = Math.min(dz.objs[0].points[0].x,dz.objs[0].points[1].x);
		var right = Math.max(dz.objs[0].points[0].x,dz.objs[0].points[1].x);
		var top = Math.max(dz.objs[0].points[0].y,dz.objs[0].points[1].y);
		var bottom = Math.min(dz.objs[0].points[0].y,dz.objs[0].points[1].y);

		var p = this.widget._map2geo(point);
		if(p.x < left || p.x > right || p.y > top || p.y < bottom)
			return false;

    	return true;
	},
	
	specialHandle: function(){
		var self = this;
		if(this.widget.geo["zoneFrame"].objs.length == 0)
			return false;
		
		var obj = this.obj;
    	//obj.nocross = true;
    	
		var dz = this.widget.geo["zoneFrame"];
		var left = Math.min(dz.objs[0].points[0].x,dz.objs[0].points[1].x);
		var right = Math.max(dz.objs[0].points[0].x,dz.objs[0].points[1].x);
		var top = Math.max(dz.objs[0].points[0].y,dz.objs[0].points[1].y);
		var bottom = Math.min(dz.objs[0].points[0].y,dz.objs[0].points[1].y);
		var org = this.widget._geo2map({x:left,y:bottom});
		
		for(var i = 0; i < obj.points.length; i++){
			var x = obj.points[i].x;
			var y = obj.points[i].y;
			if(x < left || x > right || y > top || y < bottom)
				return false;
			
			var tmp = self.widget._geo2map(obj.points[i]);
			obj.points[i].offsetX = tmp.x - org.x;
			obj.points[i].offsetY = -tmp.y + org.y;
		}

    	return true;
	},
});

var DarkBright = Canvas.Polyline.extend({
	
	checkCross:function(point){
		var zone_frame_width = parseFloat(this.widget.getParent().state.data.period[0]);
		var zone_frame_height = parseFloat(this.widget.getParent().state.data.period[1]);

    	var dz = this.widget.geo["zoneFrame"];
    	var left = Math.min(dz.objs[0].points[0].x,dz.objs[0].points[1].x) - zone_frame_width;
		var right = Math.max(dz.objs[0].points[0].x,dz.objs[0].points[1].x) + zone_frame_width;
		var top = Math.max(dz.objs[0].points[0].y,dz.objs[0].points[1].y) + zone_frame_height;
		var bottom = Math.min(dz.objs[0].points[0].y,dz.objs[0].points[1].y) - zone_frame_height;
    	
		var p = this.widget._map2geo(point);
		if(p.x < left || p.x > right || p.y > top || p.y < bottom)
			return false;
    	
    	return true;
	},
	
	checkPoint: function(point){
		if(this.points && this.points.length >= 2){
			return false;
		}
		
		var zone_frame_width = parseFloat(this.widget.getParent().state.data.period[0]);
		var zone_frame_height = parseFloat(this.widget.getParent().state.data.period[1]);

		var p = this.widget._map2geo(point);
    	var dz = this.widget.geo["zoneFrame"];
    	if(dz && dz.objs.length > 0){
    		var left = Math.min(dz.objs[0].points[0].x,dz.objs[0].points[1].x) - zone_frame_width;
    		var right = Math.max(dz.objs[0].points[0].x,dz.objs[0].points[1].x) + zone_frame_width;
    		var top = Math.max(dz.objs[0].points[0].y,dz.objs[0].points[1].y) + zone_frame_height;
    		var bottom = Math.min(dz.objs[0].points[0].y,dz.objs[0].points[1].y) - zone_frame_height;
    		
    		return p.x >= left && p.x <= right && p.y <= top && p.y >= bottom; 
    	}else{
    		return false;
    	}
    		
	},
	
	specialHandle: function(){
		var zone_frame_width = parseFloat(this.widget.getParent().state.data.period[0]);
		var zone_frame_height = parseFloat(this.widget.getParent().state.data.period[1]);
		
		var dz = this.widget.geo["zoneFrame"];
		var x = Math.min(dz.objs[0].points[0].x,dz.objs[0].points[1].x) - zone_frame_width;
		var y = Math.min(dz.objs[0].points[0].y,dz.objs[0].points[1].y) - zone_frame_height;
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
		if(this.points && this.points.length >= 3){
			return false;
		}
		return this._super.apply(this, arguments);
	},
	
/*	containsPoint:function(point){
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
	},*/
	_calculate_cicular: function(){
	    var x1, y1, x2, y2, x3, y3;
	    var a, b, c, g, e, f;
	    x1 = this.points[0].x;
	    y1 = this.points[0].y;
	    x2 = this.points[1].x;
	    y2 = this.points[1].y;
	    x3 = this.points[2].x;
	    y3 = this.points[2].y;
	    e = 2 * (x2 - x1);
	    f = 2 * (y2 - y1);
	    g = x2*x2 - x1*x1 + y2*y2 - y1*y1;
	    a = 2 * (x3 - x2);
	    b = 2 * (y3 - y2);
	    c = x3*x3 - x2*x2 + y3*y3 - y2*y2;
	    
	    var x = (g*b - c*f) / (e*b - a*f);
	    var y = (a*g - c*e) / (a*f - b*e);
	    var r = Math.sqrt((x-x1)*(x-x1)+(y-y1)*(y-y1));
	    return {x,y,r};
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
		if(this.points.length > 2){
			let {x,y,r} = this._calculate_cicular();			
			this.arc = new Canvas.Arc({
	            radius:r,
	            startAngle:0,
	            endAngle : 2 * Math.PI,
	            left: x,
	            top: y,
	            strokeWidth : Math.round(1/this.widget.map.getZoom()),
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
//			var tmpx = this.obj.points[1].x - this.obj.points[0].x;
//			var tmpy = this.obj.points[1].y - this.obj.points[0].y;
//			var radius = Math.sqrt(tmpx * tmpx + tmpy * tmpy);
//			var engle = Math.atan2(this.obj.points[2].y - this.obj.points[0].y, this.obj.points[2].x - this.obj.points[0].x);
//			this.obj.points[2].x = this.obj.points[0].x + Math.cos(engle) * radius;
//			this.obj.points[2].y = this.obj.points[0].y + Math.sin(engle) * radius;
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
	
/*	containsPoint:function(point){
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
	},*/
	
	_calculate_cicular: function(){
	    var x1, y1, x2, y2, x3, y3;
	    var a, b, c, g, e, f;
	    x1 = this.points[0].x;
	    y1 = this.points[0].y;
	    x2 = this.points[1].x;
	    y2 = this.points[1].y;
	    x3 = this.points[2].x;
	    y3 = this.points[2].y;
	    e = 2 * (x2 - x1);
	    f = 2 * (y2 - y1);
	    g = x2*x2 - x1*x1 + y2*y2 - y1*y1;
	    a = 2 * (x3 - x2);
	    b = 2 * (y3 - y2);
	    c = x3*x3 - x2*x2 + y3*y3 - y2*y2;
	    
	    var x = (g*b - c*f) / (e*b - a*f);
	    var y = (a*g - c*e) / (a*f - b*e);
	    var r = Math.sqrt((x-x1)*(x-x1)+(y-y1)*(y-y1));
	    return {x,y,r};
	},
	
	_render: function(ctx){
		while(this.crosses.length){
			var cross = this.crosses.pop()
			this.widget.map.remove(cross);
		}
		while(this.lines.length){
			var line = this.lines.pop()
			this.widget.map.remove(line);
		}
		if(this.text)
			this.widget.map.remove(this.text);
		if(this.arc)
			this.widget.map.remove(this.arc);

		var wh = 10/this.widget.map.getZoom();
		var attr = {visible:true,strokeDash:this.strokeDash,fill: this.color,stroke: this.color};
		if(this.points.length > 2){
			let {x,y,r} = this._calculate_cicular();
			
			var line = new Canvas.Line([this.points[0].x,this.points[0].y,this.points[2].x,this.points[2].y],attr);
			this.lines.push(line);
			this.widget.map.add(line);
			
			var startAngle = Math.atan2(this.points[0].y - y, this.points[0].x - x);
			var endAngle = Math.atan2(this.points[2].y - y,this.points[2].x - x);
			var dir = (this.points[1].x - this.points[0].x) * (this.points[2].y - this.points[1].y) - (this.points[1].y - this.points[0].y) * (this.points[2].x - this.points[1].x);
			if(dir <= 0){
				var t = startAngle
				startAngle = endAngle;
				endAngle = t;
			}

			this.arc = new Canvas.Arc({
	            radius:r,
	            startAngle,
	            endAngle,
	            left: x,
	            top: y,
	        	strokeWidth : 1/this.widget.map.getZoom(),
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
canvas_registry.add('favite_bif_gsp_brightDomain',DarkBright);
canvas_registry.add('favite_bif_gsp_darkDomain',DarkBright);
canvas_registry.add('favite_bif_gsp_zoneFrame',ZoneFrame);
canvas_registry.add('favite_bif_gsp_circle',Circle);
canvas_registry.add('favite_bif_gsp_bow',Bow);

var GspWidgetMap = {
    
    _onTypeButtonClick: function(ev){
    	if(!this.map)
    		return;
    	
    	var key = $(ev.currentTarget).data('type');
    	if(key == 'zoneFrame' && this.geo[key].objs.length>=1){
    		this.do_warn(_t('Incorrect Operation'),_t('zoneFrame already exists !'),false);
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