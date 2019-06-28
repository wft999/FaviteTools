odoo.define('favite_common.Mixin', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');
var _t = core._t;

var MapMouseHandle = {

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
    	this.map.isDragging = true;
    	this.map.lastPosX = opt.e.clientX;
	    this.map.lastPosY = opt.e.clientY;
	    
	    this.map.lastPointer = this.map.getPointer(opt.e);
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
			this.$(".map-info").text("x:"+Math.round(pointer.x)+",y:"+Math.round(pointer.y));
		}
	},
	
	_onMouseOut:function(opt){
		this.$(".map-info").text("");
	},
	
	_onMouseUp:function(opt){
		this.map.isDragging = false;
		var newPointer = this.map.getPointer(opt.e);
		var isClick = _.isEqual(newPointer,this.map.lastPointer);
		
		if(this.map.hoverCursor == 'default'){
			if(this._isSelectCross){
				this._isSelectCross = false;
				return;
			}
			if(this._isObjectMoving){
				this._isObjectMoving = false;
				return;
			}
				
			this.map.discardActiveObject();
			if(this.map.curPolyline){
				this.map.curPolyline.focus(false);
				this.map.curPolyline = null;
			}
			
			
			var selected = new Array();
			for(var i = 0; i < this.map.polylines.length; i++){
				this.map.polylines[i].focus(false);
				if(!this.map.polylines[i].visible)
					continue;

				if(isClick){
					var sel = this.map.polylines[i].containsPoint(newPointer);
					if(opt.e.ctrlKey){
						if(sel){
							this.map.polylines[i].select(!this.map.polylines[i].obj.selected);
						}
					}else{
						this.map.polylines[i].select(sel);
						this.map.polylines[i].focus(sel);
					}
				}else{
					var left = Math.min(this.map.lastPointer.x,newPointer.x);
					var bottom = Math.max(this.map.lastPointer.y,newPointer.y);
					var right = Math.max(this.map.lastPointer.x,newPointer.x);
					var top = Math.min(this.map.lastPointer.y,newPointer.y);
					
					var sel = this.map.polylines[i].withinRect(left,right,top,bottom);
					if(opt.e.ctrlKey){
						if(sel){
							this.map.polylines[i].select(!this.map.polylines[i].obj.selected);
						}
					}else{
						this.map.polylines[i].select(sel);
					}
				}
				if(this.map.polylines[i].obj.selected){
					//this.map.polylines[i].crosses.forEach(function(c){selected.push(c);})
					this.map.polylines[i].lines.forEach(function(c){selected.push(c);})
				}
			}
			if(selected.length > 0){
				var sel = new fabric.ActiveSelection(selected, {canvas: this.map,hasControls: false,hoverCursor:"move",hasBorders:false});
				this.map.setActiveObject(sel);
			}
			
			this._showCommand('Delete',selected.length > 0 || this.map.curPolyline);
			this._showCommand('Copy',selected.length > 0 || this.map.curPolyline);
			this._showMode('crosshair',this.map.curPolyline);
			this.$('a.dropdown-toggle').toggleClass('o_hidden',!!this.map.curPolyline);
			
			core.bus.trigger('map_select_change', this.map.curPolyline?{obj:this.map.curPolyline.obj,type:this.map.curPolyline.type} : null);
		}else if(this.map.hoverCursor == this.CROSSHAIR && this.map.curPolyline){
			if(this.map.curPolyline.checkPoint(newPointer)){
				var obj = this.map.curPolyline.obj;
				obj.points.push({x:newPointer.x,y:newPointer.y});

				this.trigger_up('field_changed', {
		            dataPointID: this.getParent().state.id,
		            changes:{geo:this.geo},
		        });
			}else{
				this.do_warn(_t('Incorrect Operation'),_t('Please enter valid point!'),false);
			}
			
		}

    	this.map.renderAll();
    	
	},

};

var MapEventHandle = {
	_onObjectSelect: function(opt){
    	if(opt.target.type === 'cross'){
    		opt.target.polyline.focus(true);
    		this._isSelectCross = true;
    		this._showCommand('Delete',true);
    		this._showCommand('Copy',true);
    	}else{
    		this._isSelectCross = false;
    	}
    },
    
    _onObjectMoving: function(opt){
    	if(this.map.hoverCursor !== 'default')
    		return;
    	
    	this._isObjectMoving = true;
    	
    	opt.e.stopPropagation();
        opt.e.preventDefault();
    },
    _onObjectMoved: function(opt){
    	var self = this;
   	 	if(opt.target.type == "hawkeye"){
    		//this.hawkmap.showImage();

    	}else if(opt.target.type == "cross"){
    		if(opt.target.mouseMove()){
    			var obj = opt.target.polyline.obj;
    			obj.points[opt.target.id].x = opt.target.left;
    			obj.points[opt.target.id].y = opt.target.top;

    			this.trigger_up('field_changed', {
    	            dataPointID: this.getParent().state.id,
    	            changes:{geo:this.geo},
    	        });
    			

    		}
    	}else if(opt.target.type == "activeSelection"){
    		this.map.lastPointer = this.map.getPointer(opt.e);
    		var offsetX = this.map.lastPointer.x - opt.transform.lastX;
    		var offsetY = this.map.lastPointer.y - opt.transform.lastY;
    		this.map.polylines.forEach(function(p){
    			if(!p.obj.selected)
    				return;
    			_.each(p.obj.points,o=>{
    				o.x += offsetX;
        			o.y += offsetY;
    			});
    		});
    		
    		this.trigger_up('field_changed', {
	            dataPointID: this.getParent().state.id,
	            changes:{geo:this.geo},
	        });
    	}
    },	

    
};

var MapCommandHandle = {
	_onDeleteClick: function(ev){
		var self = this;
		var callback;
		var polylines = [];
		var cross = this.map.getActiveObjects();
		if(cross.length == 1 && cross[0].type =='cross'){
			callback = function () {
				var p = cross[0].polyline;
				if(p.points.length <= 2){
					self.geo[p.type].objs = _.without(self.geo[p.type].objs,p.obj);
	            	if(self.map.curPolyline){
	            		self.map.curPolyline = null;
	        		}
				}else{
					p.obj.points.splice(cross[0].id,1);
				}
            	
            	self.trigger_up('field_changed', {
    	            dataPointID: self.getParent().state.id,
    	            changes:{geo:self.geo},
    	        });	
            	self._showCommand('Delete',false);
            	self._showCommand('Copy',false);
            	self._showMode('crosshair',false);
            	self.$('a.dropdown-toggle').toggleClass('o_hidden',!!self.map.curPolyline);
            }
		}else{
			if(this.map.curPolyline){
				polylines.push(this.map.curPolyline);
			}else{
				polylines = _.filter(this.map.polylines,p => p.obj.selected);
			}
			if(polylines.length == 0){
	    		this.do_warn(_t('Incorrect Operation'),_t('Please select one object!'),false);
	    		return;
	    	}
			callback = function () {
            	_.each(polylines,p=>{
            		self.geo[p.type].objs = _.without(self.geo[p.type].objs,p.obj);
            	});
            	
            	if(self.map.curPolyline){
            		self.map.curPolyline = null;
        		}
            	
            	self.trigger_up('field_changed', {
    	            dataPointID: self.getParent().state.id,
    	            changes:{geo:self.geo},
    	        });	
            	
            	self._showCommand('Delete',false);
            	self._showCommand('Copy',false);
            	self._showMode('crosshair',false);
            	self.$('a.dropdown-toggle').toggleClass('o_hidden',!!self.map.curPolyline);
            };
		}

		Dialog.confirm(this, (_t("Are you sure you want to remove these items?")), {
            confirm_callback: callback,
        });
	},
	
	_onCopyClick: function(ev){
		var self = this;
		var polylines = [];
		
		if(this.map.curPolyline){
			polylines.push(this.map.curPolyline);
		}else{
			polylines = _.filter(this.map.polylines,p => p.obj.selected);
		}
		if(polylines.length == 0){
    		this.do_warn(_t('Incorrect Operation'),_t('Please select one object!'),false);
    		return;
    	}
		
		_.each(polylines,p=>{
			var obj = {};
			$.extend(true,obj,p.obj);
			_.each(obj.points,p=>{p.x+=100;p.y+=100;})
			self.geo[p.type].objs.push(obj);
			delete p.obj.selected;
    	});
    	
    	if(self.map.curPolyline){
    		self.map.curPolyline.focus(false);
    		self.map.curPolyline = null;
		}
    	
    	self.trigger_up('field_changed', {
            dataPointID: self.getParent().state.id,
            changes:{geo:self.geo},
        });	
	},

}

return {
	MapMouseHandle,
	MapEventHandle,
	MapCommandHandle
};


});