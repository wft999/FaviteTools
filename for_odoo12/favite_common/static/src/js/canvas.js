odoo.define('favite_common.Canvas', function (require) {
"use strict";

var Class = require('web.Class');
var Line = fabric.util.createClass(fabric.Line, {
    selectable: false,
    originX:"left",
	originY:"top",
	fill: 'yellow',
    stroke: 'yellow',
    
    objectCaching:true,
    hasControls: false,
	hasBorders:false,
    initialize: function(points,options) {
    	this.callSuper('initialize',points, options);
/*    	if(options.strokeDash){
    		this.strokeDashArray = [100,20];
    	}*/
    },

	_render: function(ctx) {
		this.strokeWidth = 1/this.canvas.getZoom();
		this.callSuper('_render', ctx);
    }
  });

var Goa = fabric.util.createClass(fabric.Object, {
	type:'goa',
    fill:false,
    hasBorders:false,
    transparentCorners: false,
    cornerSize:5,
	originX:"center",
	originY:"center",
	hoverCursor:"move",

	D1G1:0,
	period:20,
	number:5,
	width:100,
	height:100,
    initialize: function(options) {
    	this.callSuper('initialize', options);
    	this.pad = options.pad || null;
    	this.period = options.period || 20;
    	this.height = this.period * 5;
    },

	_render: function(ctx) {	
		//this.strokeWidth = Math.round(1/this.canvas.getZoom()*this.scaleX*this.scaleY);
		ctx.strokeStyle="red"; 
		
		ctx.lineWidth= 1/(this.canvas.getZoom()*this.scaleY);

		ctx.beginPath(); 
		ctx.moveTo(-this.width/2,-this.height/2);
		ctx.lineTo(this.width/2,-this.height/2);
		ctx.stroke();
		
		var i;
		ctx.strokeStyle="yellow";
		for(i =1; i < this.number; i++){
			ctx.beginPath(); 
			ctx.moveTo(-this.width/2,-this.height/2+i*this.period);
			ctx.lineTo(this.width/2,-this.height/2+i*this.period);
			ctx.stroke();
		}
		
		ctx.strokeStyle="red";
		ctx.beginPath(); 
		ctx.moveTo(-this.width/2,-this.height/2+i*this.period);
		ctx.lineTo(this.width/2,-this.height/2+i*this.period);
		ctx.stroke();
		
		ctx.lineWidth= 1/(this.canvas.getZoom()*this.scaleX);
		ctx.beginPath(); 
		ctx.moveTo(-this.width/2,-this.height/2);
		ctx.lineTo(-this.width/2,-this.height/2+i*this.period);
		ctx.stroke();
		
    },
});

var Cross = fabric.util.createClass(fabric.Object, {
	type:'cross',
    fill:false,
	hasControls: false,
	borderColor: 'red',
	originX:"center",
	originY:"center",
	hoverCursor:"move",
	//lockMovementX:true,
	//lockMovementY:true,
	visible:true,
	stroke:"yellow",
	objectCaching:true,
    initialize: function(options) {
    	this.callSuper('initialize', options);
    	this.polyline = options.polyline || null;
    	this.id = options.id;
    	
    	this.animDirection = 'up';
        this.w=10;
    },

	_render: function(ctx) {
		this.width = this.w/this.canvas.getZoom(),
		this.height = this.w/this.canvas.getZoom(),
		
		ctx.beginPath(); 
		ctx.lineWidth= Math.round(2/this.canvas.getZoom());
		//ctx.strokeStyle="yellow"; 
		ctx.moveTo(-this.width/2,0);
		ctx.lineTo(this.width/2,0);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(0,-this.height/2);
		ctx.lineTo(0,this.height/2); 
		ctx.stroke(); 
		
    },
    animateColor: function(){
    	this.stroke = this.stroke == "yellow"?"red":"yellow";
    },
    animateWidthHeight: function() {
        var interval = 1;

        if (this.w >= 5 && this.w <= 20) {
          var actualInterval = (this.animDirection === 'up' ? interval : -interval);
          this.w += actualInterval;
        }

        if (this.w >= 20) {
          this.animDirection = 'down';
          this.w -= interval;
        }
        if (this.w <= 5) {
          this.animDirection = 'up';
          this.w += interval;
        }
      },
      
    mouseMove: function(){
    	if(this.inner){
    		if((this.left>= this.inner[0].left && this.left<= this.inner[1].left) || 
    				(this.top>= this.inner[1].top && this.top<= this.inner[0].top) ||
    				this.left < 10 || this.left > (this.canvas.width - 10)/this.canvas.getZoom() ||
    				this.top < 10 || this.top > (this.canvas.height - 10)/this.canvas.getZoom()){
    			this.left = this.polyline.points[this.id].x;
    			this.top = this.polyline.points[this.id].y;
    			this.setCoords();
    			return false;
    		}
    	}else if(this.outer){
    		if(this.left>= this.outer[1].left || 
    				this.left<= this.outer[0].left || 
    				this.top<= this.outer[1].top || 
    				this.top>= this.outer[0].top){
    			this.left = this.polyline.points[this.id].x;
    			this.top = this.polyline.points[this.id].y;
    			this.setCoords();
    			return false;
    		}
    	}

    	return true;
	}
  });

var Hawkeye = fabric.util.createClass(fabric.Object, {
	type:'hawkeye',
	hasRotatingPoint:false,
	transparentCorners: false,
    objectCaching: true,
	//hasControls: false,
	hasBorders:false,
	visible:false,
	originX:"center",
	originY:"center",
	cornerSize:5,
	hoverCursor:'move',
	
    initialize: function(options) {
    	this.callSuper('initialize', options);
    	this.width = options&&options.width||50;
    	this.height = options&&options.height||50;
    },

	_render: function(ctx) {
		ctx.fillStyle = '#4FC3F7';
		ctx.globalAlpha = 0.3;
		ctx.fillRect(-this.width/2,-this.height/2,this.width,this.height);
    }
  });


var Polyline = Class.extend({
	init: function(map,type,obj,color){
		this.map = map;
		this.strokeDash = false;
		
		this.obj = obj;
		this.type = type;
		this.color = color || 'yellow';
		this.visible = true,

		this.points = obj.points;
		this.crosses = new Array();
		this.lines = new Array();
		this.map.polylines.push(this);

	},
	
	focus: function(focused){
		var self = this;
		this.obj.focused = focused;
		this.map.curPolyline = focused ? this : this.map.curPolyline;
		_.each(this.crosses,function(c){
			c.visible = focused && self.visible;
		})
	},
	
	select: function(selected){
		this.obj.selected = selected;
		_.each(this.lines,function(l){
			l.strokeDashArray = selected? [20,20] : [];
			l.dirty=true
		})
	},
	
	update: function(visible,color){
		var self = this;
		this.visible = visible;
		this.color = color;
		_.each(this.crosses,function(c){
			c.visible = visible && c.visible;
		})
		_.each(this.lines,function(l){
			l.visible =  visible;
			if(l.visible){
				l.fill = color;
				l.stroke = color;
				l.dirty=true
			}	
		})
	},
	
	render:function(){
		var self = this;
/*		this.points = new Array();
		this.obj.points.forEach(function(p){
				self.points.push({x:p.x,y:p.y})
			})*/
		this._render();
		return true;
	},
	
	checkPoint:function(point){
		if(this.points.length >= 3 && this._checkIntersection(point)){
			return false;
		}
		//this.points.push(point);
		//this._render();
		return true;
	},
	removePoint:function(id){
		if(id >= this.points.length)
			return;
		
		this.points.splice(id,1);
		this._render();
	},
	
	withinRect:function(left,right,top,bottom){
    	var poly1 = new fabric.Polygon([{x:left,y:top},{x:right,y:top},{x:right,y:bottom},{x:left,y:bottom}]);
    	
		var poly2;
		if(this.points.length == 1){
			var point = this.points[0];
			return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom; 
		}
		else if(this.points.length == 2){
			left = Math.min(this.points[0].x,this.points[1].x);
			right = Math.max(this.points[0].x,this.points[1].x);
			top = Math.min(this.points[0].y,this.points[1].y);
			bottom = Math.max(this.points[0].y,this.points[1].y);
			poly2 = new fabric.Polygon([{x:left,y:top},{x:right,y:top},{x:right,y:bottom},{x:left,y:bottom}]);
		}else{
			poly2 = new fabric.Polygon(this.points);
		}
		
		return poly2.isContainedWithinObject(poly1,true,true);
	},
	
	intersectsWithRect:function(left,right,top,bottom){
    	var poly1 = new fabric.Polygon([{x:left,y:top},{x:right,y:top},{x:right,y:bottom},{x:left,y:bottom}]);
    	
		var poly2;
		if(this.points.length == 1){
			var point = this.points[0];
			return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom; 
		}
		else if(this.points.length == 2){
			left = Math.min(this.points[0].x,this.points[1].x);
			right = Math.max(this.points[0].x,this.points[1].x);
			top = Math.min(this.points[0].y,this.points[1].y);
			bottom = Math.max(this.points[0].y,this.points[1].y);
			poly2 = new fabric.Polygon([{x:left,y:top},{x:right,y:top},{x:right,y:bottom},{x:left,y:bottom}]);
		}else{
			poly2 = new fabric.Polygon(this.points);
		}
		
		return poly1.intersectsWithObject(poly2,true,true);
	},
	
	containsPoint:function(point){
		var poly
		if(this.points.length == 1){
			return false;
		}
		else if(this.points.length == 2){
			var left = Math.min(this.points[0].x,this.points[1].x);
			var right = Math.max(this.points[0].x,this.points[1].x);
			var top = Math.min(this.points[0].y,this.points[1].y);
			var bottom = Math.max(this.points[0].y,this.points[1].y);
			//return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
			poly = new fabric.Polygon([{x:left,y:top},{x:right,y:top},{x:right,y:bottom},{x:left,y:bottom}]);
			return  poly.containsPoint(point,null,true,true);
		}else{
			//poly = new fabric.Polygon(this.points);
			return this.containsPolygonPoint(point);
		}
	},
	
	containsPolygonPoint:function(checkPoint){
		var polygonPoints = this.points;
	    var counter = 0;
	    var i;
	    var xinters;
	    var p1, p2;
	    var pointCount = polygonPoints.length;
	    p1 = polygonPoints[0];
	 
	    for (i = 1; i <= pointCount; i++) {
	        p2 = polygonPoints[i % pointCount];
	        if (checkPoint.x > Math.min(p1.x, p2.x) &&checkPoint.x <= Math.max(p1.x, p2.x)) {
	            if (checkPoint.y <= Math.max(p1.y, p2.y)) {
	                if (p1.x != p2.x) {
	                    xinters = (checkPoint.x - p1.x) * (p2.y - p1.y) / (p2.x - p1.x) + p1.y;
	                    if (p1.y == p2.y || checkPoint.y <= xinters) {
	                        counter++;
	                    }
	                }
	            }
	        }
	        p1 = p2;
	    }
	    if (counter % 2 == 0) {
	        return false;
	    } else {
	        return true;
	    }
	},
	
	_checkIntersection:function(point){
		var length = this.points.length,
        a1,a2,b1, b2, inter, i;
		
		for (i = 0; i < length-1; i++) {
			a1 = point;
			b1 = this.points[i];
			b2 = this.points[i + 1];
			if(i==0){
				a2 = this.points[length-1];
				inter = fabric.Intersection.intersectLineLine(a1, a2, b1, b2);
				if(inter.points.length>0)
					return true;
			}else if(i==length-2){
				a2 = this.points[0];
				inter = fabric.Intersection.intersectLineLine(a1, a2, b1, b2);
				if(inter.points.length>0)
					return true;
			}else{
				a2 = this.points[0];
				inter = fabric.Intersection.intersectLineLine(a1, a2, b1, b2);
				if(inter.points.length>0)
					return true;
				
				a2 = this.points[length-1];
				inter = fabric.Intersection.intersectLineLine(a1, a2, b1, b2);
				if(inter.points.length>0)
					return true;
			}
		}
		
		return false;   
	},
	
	clear:function(){
		var self = this;
		while(this.crosses.length)
		{
			var cross = this.crosses.pop()
			this.map.remove(cross);
		}
		while(this.lines.length)
		{
			var line = this.lines.pop()
			this.map.remove(line);
		}

		//this.map.polylines = _.without(this.map.polylines,this);
	},
	
	updateCross(show){
		this.crosses.forEach(function(c){
			c.visible = show;
			//c.lockMovementX = !show;
    		//c.lockMovementY = !show;
		})

	},
	
	_render: function(){
		while(this.crosses.length)
		{
			var cross = this.crosses.pop()
			this.map.remove(cross);
		}
		while(this.lines.length)
		{
			var line = this.lines.pop()
			this.map.remove(line);
		}

		var wh = 10/this.map.getZoom();
		for(var i = 0; i < this.points.length; i++){
			if(i >= 1){
				var attr = {visible:true,strokeDash:this.strokeDash,fill: this.color,stroke: this.color};
				if(this.points.length == 2){
					var line1 = new Line([this.points[0].x,this.points[0].y,this.points[0].x,this.points[1].y],attr);
			 		var line2 = new Line([this.points[0].x,this.points[0].y,this.points[1].x,this.points[0].y],attr);
			 		var line3 = new Line([this.points[1].x,this.points[1].y,this.points[1].x,this.points[0].y],attr);
			 		var line4 = new Line([this.points[1].x,this.points[1].y,this.points[0].x,this.points[1].y],attr);
			 		this.lines.push(line1,line2,line3,line4);
			 		this.map.add(line1,line2,line3,line4);
				}else{
					var line = new Line([this.points[i-1].x,this.points[i-1].y,this.points[i].x,this.points[i].y],attr);
					this.lines.push(line);
					this.map.add(line);
					
					if(i == this.points.length -1){
						var line = new Line([this.points[0].x,this.points[0].y,this.points[i].x,this.points[i].y],attr);
						this.lines.push(line);
						this.map.add(line);
					}
				}
			}
			
			var cross = new Cross({ 
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

return {
	Line,
	Cross,
	Hawkeye,
	Polyline,
	Goa,
};

});