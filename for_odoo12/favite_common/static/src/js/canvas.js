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
    },

	_render: function(ctx) {
		this.strokeWidth = 1/this.canvas.getZoom();
		this.callSuper('_render', ctx);
    }
  });

var Arc = fabric.util.createClass(fabric.Circle, {
    selectable: false,
    originX:"center",
	originY:"center",
	fill: 'yellow',
    stroke: 'yellow',
    
    objectCaching:true,
    hasControls: false,
	hasBorders:false,
    initialize: function(options) {
    	this.callSuper('initialize', options);
    },

	_render: function(ctx) {
		this.strokeWidth = 1/this.canvas.getZoom();
		ctx.beginPath();
		ctx.arc(
		        0,
		        0,
		        this.radius,
		        this.startAngle,
		        this.endAngle, false);
		ctx.stroke(); 
    }
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
		var zoom = this.canvas.getZoom();
		this.width = this.w/zoom;
		this.height = this.w/zoom;
		//this.strokeWidth = 5/zoom;
		
		console.log("this.strokeWidth:%f\n",zoom);
		
		ctx.beginPath(); 
		ctx.lineWidth= Math.round(2/zoom);
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
/*    	if(this.inner){
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
    	}*/
    	
    	if(this.polyline.checkCross()){
    		return true;
    	}else{
    		this.left = this.polyline.points[this.id].x;
			this.top = this.polyline.points[this.id].y;
			this.setCoords();
			return false;
    	}
	}
  });

var Corner = fabric.util.createClass(fabric.Object, {
	type:'corner',
	hasRotatingPoint:false,
	transparentCorners: false,
    objectCaching: true,
	hasControls: false,
	hasBorders:false,
	visible:true,
	originX:"center",
	originY:"center",
	stroke:"white",
	fill:"white",
	
    initialize: function(options) {
    	this.callSuper('initialize', options);
    	this.w=20;
    	this.cornerType = this.cornerType || 1;
    },

	/*_render: function(ctx) {
		ctx.fillStyle = '#4FC3F7';
		ctx.globalAlpha = 0.3;
		ctx.fillRect(-this.width/2,-this.height/2,this.width,this.height);
    }*/
    
    _render: function(ctx) {
		this.width = this.w/this.canvas.getZoom();
		this.height = this.w/this.canvas.getZoom();
		ctx.lineWidth= 2/this.canvas.getZoom();
		
		switch(this.cornerType){
		case 1:
			ctx.beginPath(); 
			ctx.moveTo(0,0);
			ctx.lineTo(-this.width/2,0);
			ctx.lineTo(0,this.height/2);
			ctx.closePath();
		    ctx.fill();
			
			break;
		case 2:
			ctx.beginPath(); 
			ctx.moveTo(0,0);
			ctx.lineTo(this.width/2,0);
			ctx.lineTo(0,this.height/2);
			ctx.closePath();
		    ctx.fill();
			break;
		case 3:
			ctx.beginPath(); 
			ctx.moveTo(0,0);
			ctx.lineTo(this.width/2,0);
			ctx.lineTo(0,-this.height/2);
			ctx.closePath();
		    ctx.fill();
			break;
		case 4:
			ctx.beginPath(); 
			ctx.moveTo(0,0);
			ctx.lineTo(-this.width/2,0);
			ctx.lineTo(0,-this.height/2);
			ctx.closePath();
		    ctx.fill();
			break;
		}
		
    },
  });

var Hawkeye = fabric.util.createClass(fabric.Object, {
	type:'hawkeye',
	hasRotatingPoint:false,
	transparentCorners: false,
    objectCaching: true,
	hasControls: false,
	hasBorders:false,
	visible:true,
	originX:"center",
	originY:"center",
	cornerSize:5,
	hoverCursor:'move',
	stroke:"red",
	fill:false,
	
    initialize: function(options) {
    	this.callSuper('initialize', options);
    	
    	this.w=30;
    },
    
    leftp:function(ctx,x,y){
		ctx.beginPath();
		ctx.moveTo(x+this.width/12,y-this.height/12); 
		ctx.lineTo(x,y);
		ctx.lineTo(x+this.width/12,y+this.height/12); 
		ctx.stroke(); 
    },
    rightp:function(ctx,x,y){
		ctx.beginPath();
		ctx.moveTo(x-this.width/12,y-this.height/12); 
		ctx.lineTo(x,y);
		ctx.lineTo(x-this.width/12,y+this.height/12); 
		ctx.stroke(); 
    },
    downp:function(ctx,x,y){
		ctx.beginPath();
		ctx.moveTo(x-this.width/12,y-this.height/12); 
		ctx.lineTo(x,y);
		ctx.lineTo(x+this.width/12,y-this.height/12); 
		ctx.stroke(); 
    },
    upp:function(ctx,x,y){
		ctx.beginPath();
		ctx.moveTo(x-this.width/12,y+this.height/12); 
		ctx.lineTo(x,y);
		ctx.lineTo(x+this.width/12,y+this.height/12); 
		ctx.stroke(); 
    },
    _render: function(ctx) {
		this.width = this.w/this.canvas.getZoom();
		this.height = this.w/this.canvas.getZoom();
		//this.strokeWidth = 1/this.canvas.getZoom();
		ctx.lineWidth= Math.round(1/this.canvas.getZoom());

		switch(this.coord){
		case 0:
			ctx.beginPath(); 
			ctx.moveTo(-this.width/4,0);
			ctx.lineTo(this.width/4,0);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0,-this.height/2);
			ctx.lineTo(0,this.height/2); 
			ctx.stroke(); 
			
			this.leftp(ctx,-this.width/4,0);
			this.downp(ctx,0,this.height/2);
			break;
		case 1:
			ctx.beginPath(); 
			ctx.moveTo(-this.width/4,0);
			ctx.lineTo(this.width/4,0);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0,-this.height/2);
			ctx.lineTo(0,this.height/2); 
			ctx.stroke(); 
			
			this.downp(ctx,0,this.height/2);
			this.rightp(ctx,this.width/4,0);
			break;
		case 2:
			ctx.beginPath(); 
			ctx.moveTo(-this.width/4,0);
			ctx.lineTo(this.width/4,0);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0,-this.height/2);
			ctx.lineTo(0,this.height/2); 
			ctx.stroke(); 
			
			this.upp(ctx,0,-this.height/2);
			this.rightp(ctx,this.width/4,0);
			break;
		case 3:
			ctx.beginPath(); 
			ctx.moveTo(-this.width/4,0);
			ctx.lineTo(this.width/4,0);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0,-this.height/2);
			ctx.lineTo(0,this.height/2); 
			ctx.stroke(); 
			
			this.upp(ctx,0,-this.height/2);
			this.leftp(ctx,-this.width/4,0);
			break;
			
		case 4:
			ctx.beginPath(); 
			ctx.moveTo(-this.width/2,0);
			ctx.lineTo(this.width/2,0);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0,-this.height/4);
			ctx.lineTo(0,this.height/4); 
			ctx.stroke(); 
			
			this.leftp(ctx,-this.width/2,0);
			this.downp(ctx,0,this.height/4);
			break;
		case 5:
			ctx.beginPath(); 
			ctx.moveTo(-this.width/2,0);
			ctx.lineTo(this.width/2,0);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0,-this.height/4);
			ctx.lineTo(0,this.height/4); 
			ctx.stroke(); 
			
			this.downp(ctx,0,this.height/4);
			this.rightp(ctx,this.width/2,0);
			break;
		case 6:
			ctx.beginPath(); 
			ctx.moveTo(-this.width/2,0);
			ctx.lineTo(this.width/2,0);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0,-this.height/4);
			ctx.lineTo(0,this.height/4); 
			ctx.stroke(); 
			
			this.upp(ctx,0,-this.height/4);
			this.rightp(ctx,this.width/2,0);
			break;
		case 7:
			ctx.beginPath(); 
			ctx.moveTo(-this.width/2,0);
			ctx.lineTo(this.width/2,0);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0,-this.height/4);
			ctx.lineTo(0,this.height/4); 
			ctx.stroke(); 
			
			this.upp(ctx,0,-this.height/4);
			this.leftp(ctx,-this.width/2,0);
			break;
			
		case 8:
			ctx.beginPath(); 
			ctx.moveTo(-this.width/2,0);
			ctx.lineTo(0,0);
			ctx.lineTo(0,this.height); 
			ctx.stroke(); 
			
			this.leftp(ctx,-this.width/2,0);
			this.downp(ctx,0,this.height);
			break;
			
		case 9:
			ctx.beginPath(); 
			ctx.moveTo(this.width/2,0);
			ctx.lineTo(0,0);
			ctx.lineTo(0,this.height); 
			ctx.stroke(); 
			
			this.downp(ctx,0,this.height);
			this.rightp(ctx,this.width/2,0);
			break;
		case 10:
			ctx.beginPath(); 
			ctx.moveTo(this.width/2,0);
			ctx.lineTo(0,0);
			ctx.lineTo(0,-this.height); 
			ctx.stroke(); 
			
			this.upp(ctx,0,-this.height);
			this.rightp(ctx,this.width/2,0);
			break;
		case 11:
			ctx.beginPath(); 
			ctx.moveTo(-this.width/2,0);
			ctx.lineTo(0,0);
			ctx.lineTo(0,-this.height); 
			ctx.stroke(); 
			
			this.upp(ctx,0,-this.height);
			this.leftp(ctx,-this.width/2,0);
			break;	
			
		case 12:
			ctx.beginPath(); 
			ctx.moveTo(-this.width,0);
			ctx.lineTo(0,0);
			ctx.lineTo(0,this.height/2); 
			ctx.stroke(); 
			
			this.leftp(ctx,-this.width,0);
			this.downp(ctx,0,this.height/2);
			break;
		case 13:
			ctx.beginPath(); 
			ctx.moveTo(this.width,0);
			ctx.lineTo(0,0);
			ctx.lineTo(0,this.height/2); 
			ctx.stroke(); 
			
			this.downp(ctx,0,this.height/2);
			this.rightp(ctx,this.width,0);
			break;
		case 14:
			ctx.beginPath(); 
			ctx.moveTo(this.width,0);
			ctx.lineTo(0,0);
			ctx.lineTo(0,-this.height/2); 
			ctx.stroke(); 
			
			this.upp(ctx,0,-this.height/2);
			this.rightp(ctx,this.width,0);
			break;
		case 15:
			ctx.beginPath(); 
			ctx.moveTo(-this.width,0);
			ctx.lineTo(0,0);
			ctx.lineTo(0,-this.height/2); 
			ctx.stroke(); 
			
			this.upp(ctx,0,-this.height/2);
			this.leftp(ctx,-this.width,0);
			break;	
		}
		
    },
  });


var Polyline = Class.extend({
	init: function(widget,type,obj,color,readonly=false,noselect=false){
		this.widget = widget;
		this.strokeDash = false;
		this.readonly = readonly;
		this.noselect = noselect;
		
		this.obj = obj;
		this.type = type;
		this.color = color || 'yellow';
		this.visible = true,

		this.points = _.map(obj.points,widget._geo2map.bind(widget));
		this.crosses = new Array();
		this.lines = new Array();
		this.widget.map.polylines.push(this);
	},
	
	specialHandle: function(){
		return true;
	},
	
	focus: function(focused){
		var self = this;
		this.obj.focused = focused;
		this.widget.map.curPolyline = focused ? this : this.widget.map.curPolyline;
		var edit = this.widget.getParent().mode == 'edit';
		_.each(this.crosses,function(c){
			c.visible = edit && (focused || self.showCross);// && self.visible;
	     	c.bringToFront();
		})
	},
	
	select: function(selected){
		this.obj.selected = selected;
		var dash = 4 / this.widget.map.getZoom();
		_.each(this.lines,function(l){
			l.strokeDashArray = selected? [dash,dash] : [];
			//l.stroke = 'red';
			l.dirty=true;
			l.setCoords();
		})
		
/*		if(this.text){
			this.text.fill = selected? 'red': this.color;
			this.text.dirty=true;
		}*/
	},
	
	update: function(visible,color){
		var self = this;
		this.visible = visible;
		this.color = color;
		var edit = this.widget.getParent().mode == 'edit';
		_.each(this.crosses,function(c){
			c.visible = edit && visible && (c.visible || self.showCross);
		})
		_.each(this.lines,function(l){
			l.visible =  visible;
			if(l.visible){
				l.fill = color;
				l.stroke = color;
				l.dirty=true
			}	
		})
		
		if(this.text) this.text.visible = visible;
	},
	
	render:function(){
		var self = this;
		this._render();
		return true;
	},
	
	checkCross:function(){
		return true;
	},
	
	checkPoint:function(point){
		if(this.points && this.points.length >= 3 && this._checkIntersection(point)){
			return false;
		}
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
			poly = new fabric.Polygon([{x:left,y:top},{x:right,y:top},{x:right,y:bottom},{x:left,y:bottom}]);
			return  poly.containsPoint(point,null,true,true);
		}else{
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
			this.widget.map.remove(cross);
		}
		while(this.lines.length)
		{
			var line = this.lines.pop()
			this.widget.map.remove(line);
		}
		if(this.text)
			this.widget.map.remove(this.text);
	},
	
	updateCross(show){
		this.crosses.forEach(function(c){
			c.visible = show;
			//c.lockMovementX = !show;
    		//c.lockMovementY = !show;
		})

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

		var wh = 10/this.widget.map.getZoom();
		for(var i = 0; i < this.points.length; i++){
			if(i >= 1){
				var attr = {visible:true,strokeDash:this.strokeDash,fill: this.color,stroke: this.color};
				if(this.points.length == 2){
					var line1 = new Line([this.points[0].x,this.points[0].y,this.points[0].x,this.points[1].y],attr);
			 		var line2 = new Line([this.points[0].x,this.points[0].y,this.points[1].x,this.points[0].y],attr);
			 		var line3 = new Line([this.points[1].x,this.points[1].y,this.points[1].x,this.points[0].y],attr);
			 		var line4 = new Line([this.points[1].x,this.points[1].y,this.points[0].x,this.points[1].y],attr);
			 		this.lines.push(line1,line2,line3,line4);
			 		this.widget.map.add(line1,line2,line3,line4);
				}else{
					var line = new Line([this.points[i-1].x,this.points[i-1].y,this.points[i].x,this.points[i].y],attr);
					this.lines.push(line);
					this.widget.map.add(line);
					
					if(i == this.points.length -1){
						var line = new Line([this.points[0].x,this.points[0].y,this.points[i].x,this.points[i].y],attr);
						this.lines.push(line);
						this.widget.map.add(line);
					}
				}
			}
			
			if(this.readonly || this.obj.nocross)
				continue;
			
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
			this.widget.map.add(cross);
		}
		
		var colors = [0,'#f06050','#f4a460','#f7cd1f','#6cc1ed','#814968','#eb7e7f','#2c8397','#475577','#d6145f','#30c381','#9365b8']
		if(this.obj.name && this.points.length >= 2 &&( this.type == 'block' ||  this.type == 'panel')){
			var name = this.obj.name;
			var color = this.color;
			if(this.type == 'panel' && !this.obj.gsp){
				//name += ':' + this.obj.gsp;
				//color = colors[this.obj.color] || 10
				var attr = {visible:true,strokeDash:this.strokeDash,fill: this.color,stroke: this.color};
				var line = new Line([this.points[0].x,this.points[0].y,this.points[2].x,this.points[2].y],attr);
				this.lines.push(line);
				this.widget.map.add(line);
				line = new Line([this.points[1].x,this.points[1].y,this.points[3].x,this.points[3].y],attr);
				this.lines.push(line);
				this.widget.map.add(line);
			}	
				
			this.text = new fabric.Text(name, { 
				left:  _.reduce(this.points, function(memo, p){ return memo + p.x; }, 0) / this.points.length, 
				top: _.reduce(this.points, function(memo, p){ return memo + p.y; }, 0) / this.points.length,
				fill: color,hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false,hasBorders:false }
			);
			this.widget.map.add(this.text);
		}
	}
});

var Period = fabric.util.createClass(fabric.Object, {
	type:'period',
    fill:false,
    hasBorders:false,
    transparentCorners: false,
    cornerSize:5,
	originX:"center",
	originY:"center",
	hoverCursor:"move",

	x_period:20,
	y_period:20,
	number:5,
	width:100,
	height:100,
    initialize: function(options) {
    	this.callSuper('initialize', options);
    	this.x_period = options.x_period || 20;
    	this.y_period = options.y_period || 20;
    	this.width = this.x_period * 5;
    	this.height = this.y_period * 5;
    },

	_render: function(ctx) {	
		var i;
		ctx.lineWidth= 1/(this.canvas.getZoom()*this.scaleY);
		ctx.strokeStyle="yellow";
		for(i =0; i < this.number+1; i++){
			ctx.beginPath(); 
			ctx.moveTo(-this.width/2,-this.height/2+i*this.x_period);
			ctx.lineTo(this.width/2,-this.height/2+i*this.y_period);
			ctx.stroke();
		}
		
		ctx.lineWidth= 1/(this.canvas.getZoom()*this.scaleX);
		for(i =0; i < this.number+1; i++){
			ctx.beginPath(); 
			ctx.moveTo(-this.width/2+i*this.x_period,-this.height/2);
			ctx.lineTo(-this.width/2+i*this.x_period,this.height/2);
			ctx.stroke();
		}
    },
});

return {
	Line,
	Cross,
	Hawkeye,
	Polyline,
	Corner,
	Arc,
	Period
};

});