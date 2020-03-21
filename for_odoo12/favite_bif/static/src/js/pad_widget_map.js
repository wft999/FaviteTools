odoo.define('favite_bif.PadWidgetMap', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');


var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');

var Canvas = require('favite_common.Canvas');
var canvas_registry = require('favite_common.canvas_registry');
var Submark = require('favite_bif.submark');
var QWeb = core.qweb;
var _t = core._t;

var Frame = Canvas.Polyline.extend({
	showCross:true,
	checkCross:function(){
		return (this.crosses[0].left < this.crosses[1].left) && 
				(this.crosses[1].left < this.crosses[2].left) && 
				(this.crosses[2].left < this.crosses[3].left) &&
				
				(this.crosses[0].top > this.crosses[1].top) &&
				(this.crosses[1].top > this.crosses[2].top) &&
				(this.crosses[2].top > this.crosses[3].top);

	},
	
	specialHandle: function(){
		this.widget._recreate_region();
		return true;
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

		var wh = 10/this.widget.map.getZoom();
		var attr = {visible:true,strokeDash:this.strokeDash,fill: this.color,stroke: this.color};
		var line1 = new Canvas.Line([this.points[0].x,this.points[0].y,this.points[0].x,this.points[3].y],attr);
 		var line2 = new Canvas.Line([this.points[0].x,this.points[0].y,this.points[3].x,this.points[0].y],attr);
 		var line3 = new Canvas.Line([this.points[3].x,this.points[3].y,this.points[3].x,this.points[0].y],attr);
 		var line4 = new Canvas.Line([this.points[3].x,this.points[3].y,this.points[0].x,this.points[3].y],attr);
 		this.lines.push(line1,line2,line3,line4);
 		this.widget.map.add(line1,line2,line3,line4);
 		
 		line1 = new Canvas.Line([this.points[1].x,this.points[1].y,this.points[1].x,this.points[2].y],attr);
 		line2 = new Canvas.Line([this.points[1].x,this.points[1].y,this.points[2].x,this.points[1].y],attr);
 		line3 = new Canvas.Line([this.points[2].x,this.points[2].y,this.points[2].x,this.points[1].y],attr);
 		line4 = new Canvas.Line([this.points[2].x,this.points[2].y,this.points[1].x,this.points[2].y],attr);
 		this.lines.push(line1,line2,line3,line4);
 		this.widget.map.add(line1,line2,line3,line4);
		
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

canvas_registry.add('favite_bif_pad_frame',Frame);

var PadWidgetMap = {
    
    _onTypeButtonClick: function(ev){
    	var key = $(ev.currentTarget).data('type');
/*    	if(key == 'markoffset' && this.geo[key].objs.length>=1){
    		this.do_warn(_t('Incorrect Operation'),_t('markoffset already exists !'),false);
    		return;
    	}
    	if(key == 'mark' && this.geo[key].objs.length>=2){
    		this.do_warn(_t('Incorrect Operation'),_t('mark already exists !'),false);
    		return;
    	}*/
		
		return this._super.apply(this, arguments);
	},
	
	_showObjsList(sel){
    	var self = this;
    	var $types = this.$('div.obj-types');
    	$types.empty();
    	for(var key in sel){
    		if(_.isString(sel[key]) || (_.has(sel[key],'objs') && (!_.has(sel[key],'readonly')) && (!_.has(sel[key],'no_add')) )){
    			var $it = $('<a class="dropdown-item" data-type="'+key+'">'+key+'</a>');
        		$types.append($it);
        		$it.click(self._onTypeButtonClick.bind(self));
    		}
    		
    	}
    },

    _get_geo: function(state){
    	this._super.apply(this, arguments);
    	
    	if(this.geo.frame.objs.length == 0){
    		var offset = 3000;
    		
    		this.geo.frame.objs.push({points:[]})
    		
    		var x = this.geo.panel.objs[0].points[0].x;
    		var y = this.geo.panel.objs[0].points[0].y;
    		this.geo.frame.objs[0].points.push({x:x - offset,y:y - offset});
    		this.geo.frame.objs[0].points.push({x:x + offset,y:y + offset});
    		
    		x = this.geo.panel.objs[0].points[1].x;
    		y = this.geo.panel.objs[0].points[1].y;
    		this.geo.frame.objs[0].points.push({x:x - offset,y:y - offset});
    		this.geo.frame.objs[0].points.push({x:x + offset,y:y + offset});
    		
    		
    	}
    	
    	if(this.geo.region.objs.length == 0){
    		this._recreate_region();
    	}
    	if(this.geo.submark.objs.length == 0){
    		this._recreate_submark();
    	}
    },
    
    _recreate_submark: function(){
    	var dMarkWidth = this.getParent().state.data.x_submark_size[0];
    	var dMarkHeight = this.getParent().state.data.x_submark_size[1];
    	var offsetX = this.getParent().state.data.x_submark_offset[0];
    	var offsetY = this.getParent().state.data.x_submark_offset[1];
    	
    	var submark = new Submark(this,dMarkWidth,dMarkHeight,offsetX,offsetY);
 		//var {dPanelLeft,dPanelBottom,dPanelRight,dPanelTop} = submark.getPanelPara();
    	var dPanelLeft = this.geo.panel.objs[0].points[0].x;
    	var dPanelBottom = this.geo.panel.objs[0].points[0].y;
    	var dPanelRight = this.geo.panel.objs[0].points[1].x;
    	var dPanelTop =this.geo.panel.objs[0].points[1].y;
    	
 		if(this.getParent().state.data.x_submark_type){
 			_.each(this.geo.submark.objs,function(obj){submark.getPlygonSubMark(obj)});
 		}
 		else
 			submark.pMarkRegionArray = submark.getNormalSubMark(dPanelLeft,dPanelBottom,dPanelRight,dPanelTop,dMarkWidth,dMarkHeight);
 		
 		for(var i = 0; i < submark.pMarkRegionArray.length; i++){
 			var width = submark.pMarkRegionArray[i].dMarkWidth ;
 			var height = submark.pMarkRegionArray[i].dMarkHeight;
 			
 			var obj = {points:[],iMarkDirectionType:submark.pMarkRegionArray[i].iMarkDirectionType};
 			var x = submark.pMarkRegionArray[i].dPositionX- width/2;
			var y = submark.pMarkRegionArray[i].dPositionY+ height/2;
			obj.points.push({x,y});

    		x = submark.pMarkRegionArray[i].dPositionX+ width/2;
			y = submark.pMarkRegionArray[i].dPositionY- height/2;
			obj.points.push({x,y});
			

 			var uLeft = submark.pMarkRegionArray[i].dPositionX - submark.pMarkRegionArray[i].dMarkWidth/2;
 			var uRight = submark.pMarkRegionArray[i].dPositionX + submark.pMarkRegionArray[i].dMarkWidth/2;
 			var uTop = submark.pMarkRegionArray[i].dPositionY + submark.pMarkRegionArray[i].dMarkHeight/2;
 			var uBottom = submark.pMarkRegionArray[i].dPositionY - submark.pMarkRegionArray[i].dMarkHeight/2;
 			
 			this.coord.GetRectIntersectionInfoInBlockMapMatrix(uLeft,uBottom,uRight,uTop,true);
 			obj.blocks = _.map(this.coord.bmpBlockMapPara.m_BlockMap[0],function(item){
	    		return {
	    			iIPIndex:item.iIPIndex,
	    			iScanIndex:item.iScanIndex,
	    			iBlockIndex:item.iBlockIndex,
	    			iInterSectionStartX:item.iInterSectionStartX,
	    			iInterSectionStartY:item.iInterSectionStartY,
	    			iInterSectionWidth:item.iInterSectionWidth,
	    			iInterSectionHeight:item.iInterSectionHeight,
	    			iBlockMapHeight:item.iBlockMapHeight
	    			};
	    		});
 			this.geo.submark.objs.push(obj);
 		}
 		this.geo.submark.modified = true;
 		
    },
    
    _recreate_region: function(){
    	var region_overlap = this.getParent().state.data.x_region_overlap;
    	var region_height = this.getParent().state.data.x_region_height;
    	
    	this.geo.region = {"objs":[],"no_add":true,"readonly":true};
    	
    	var x,y,ux,uy,obj; 
 		var innerFrame = this.innerFrame;
 		var outerFrame = this.outerFrame;
 		
 	    
 		 var top = this.geo.frame.objs[0].points[2].y + region_overlap;
 		 while(true){
 			var bottom = top - region_height;
 			var nextTop = bottom + region_overlap;
 			if(bottom < this.geo.frame.objs[0].points[1].y - region_overlap){
 				bottom = this.geo.frame.objs[0].points[1].y - region_overlap;
 			}
 			else if((nextTop - region_height)  < this.geo.frame.objs[0].points[1].y - region_overlap ){
 				bottom = (top + this.geo.frame.objs[0].points[1].y)/2 - region_overlap;
 				nextTop = bottom + region_overlap;
 			}
 			
 			obj = {points:[],iFrameNo:0};
 			x = this.geo.frame.objs[0].points[0].x;
 			y = bottom;
 			obj.points.push({x,y});
 			x = this.geo.frame.objs[0].points[1].x;
 			y = top;
 			obj.points.push({x,y});
 			this.geo.region.objs.push(obj);
 			
 			obj = {points:[],iFrameNo:2};
 			x = this.geo.frame.objs[0].points[2].x;
 			y = bottom;
 			obj.points.push({x,y});
 			x = this.geo.frame.objs[0].points[3].x;
 			y = top;
 			obj.points.push({x,y});
 			this.geo.region.objs.push(obj);
 			
 			top = nextTop;
 			if(top <= this.geo.frame.objs[0].points[1].y)
 				break;
 		 }
 		 
 		obj = {points:[],iFrameNo:1};
		x = this.geo.frame.objs[0].points[0].x;
		y = this.geo.frame.objs[0].points[0].y;
		obj.points.push({x,y});
		x = this.geo.frame.objs[0].points[3].x;
		y = this.geo.frame.objs[0].points[1].y;
		obj.points.push({x,y});
		this.geo.region.objs.push(obj);
			
		obj = {points:[],iFrameNo:3};
		x = this.geo.frame.objs[0].points[0].x;
		y = this.geo.frame.objs[0].points[2].y;
		obj.points.push({x,y});
		x = this.geo.frame.objs[0].points[3].x;
		y = this.geo.frame.objs[0].points[3].y;
		obj.points.push({x,y});
		this.geo.region.objs.push(obj);

    }
    
};

return PadWidgetMap;

});