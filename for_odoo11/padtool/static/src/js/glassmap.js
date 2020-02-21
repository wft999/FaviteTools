odoo.define('padtool.Glassmap', function (require) {
"use strict";

var ControlPanelMixin = require('web.ControlPanelMixin');
var core = require('web.core');
var Widget = require('web.Widget');
var framework = require('web.framework');
var Dialog = require('web.Dialog');

var Coordinate = require('padtool.coordinate');
var Mycanvas = require('padtool.Canvas');
var Map = require('padtool.Map');
var Hawkmap = require('padtool.Hawkmap2');

var QWeb = core.qweb;
var _t = core._t;

var Glassmap = Map.extend(ControlPanelMixin,{
    template: 'Map',
/*    
    events: {
        'click .o_setup_company': 'on_setup_company'
    },
*/
    init: function(parent,action){
    	this.pad = {
        		curType: 'curl',
        		isModified:false,
        	};
        return this._super.apply(this, arguments);
    },
    
    willStart: function () {
        var self = this;
        return this._rpc({model: 'padtool.pad',method: 'glass_information',args: [this.menu_id],})
            .then(function(res) {
            	if(res){
            		_.extend(self,res);
                	self.coordinate = new Coordinate(res.cameraConf,res.bifConf,res.padConf,res.panelName);
                	self.tmpCoordinate = new Coordinate(res.cameraConf,res.bifConf,res.padConf,res.panelName);
                	self.src = '/glassdata/'+self.glassName +'/' + self.padConf.GLASS_INFORMATION.glass_map;
                	self.isSupportCurl = !!(res.padConf['RESIZE_SCAN_INFORMATION']);
            	}
            });
    },

    start: function(){    
    	var self = this;
    	this._super.apply(this, arguments);
    	
    	if(this.glassName === undefined)
    		return;

    	$.when(self.defImage).then(function ( ) { 	
    		self._loadPad();
    		if(self.isSupportCurl){
        		self._drawHawk();
    		}
    		
    		
    		self._renderButtons();
    		self._updateControlPanel();
    		self._showToolbar();
    		
    		$('.breadcrumb').append('<li>curl</li>');
    	});
    	
    },
    
    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    _showToolbar(){
    	if(this.pad.curType === undefined)
    		this.pad.curType = 'curl';
    },
    
    showObj:function(obj){
		if(obj.pad){
			obj.visible = obj.pad.padType == this.pad.curType;
			if(obj.type == 'cross'){
				obj.visible = false;
			}
		}
		
	},
    _onButtonSave:function(){
    	var self = this;
    	if(!self.isSupportCurl){
    		self.do_warn(_t('Operation Result'),_t('Curling pad is not supported !'),false);
    		return;
    	}
    	var pad = new Object();

    	pad.dGlassCenterX = this.glass_center_x;
 		pad.dGlassCenterY = this.glass_center_y;
    	
    	pad.objs = new Array();
    	this.map.pads.forEach(function(obj){
    		if(obj.points.length < 2)
    			return;
    		if(obj.padType != "curl")
    			return;
    		if(_.some(obj.points,function(p){return p.ux == undefined || p.uy == undefined})){
    			self.do_warn(_t('Operation Result'),_t('Point is not correct !'),false);
    			return;
    		}
    		
    		var o = {
    			padType: obj.padType,
    			points:obj.points,
    		};    		
    		pad.objs.push(o);
    	});
    	
    	return this._rpc({model: 'padtool.pad',method: 'write',args: [this.active_id,{curl:JSON.stringify(pad)}],}).then(function(values){
    		self.do_notify(_t('Operation Result'),_t('Curling Pad was succesfully saved!'),false);
    		self.pad.isModified = false;
        });
    },
    _onButtonTrash:function(){
    	var self = this;
    	if(!self.isSupportCurl){
    		self.do_warn(_t('Operation Result'),_t('Curling pad is not supported !'),false);
    		return;
    	}
    	
    	
    	var objs = _.filter(this.map.pads,function(pad){return pad.selected && pad.padType == self.pad.curType});
    	if(objs.length == 0){
    		this.do_warn(_t('Incorrect Operation'),_t('Please select one object!'),false);
    		return;
    	}

		Dialog.confirm(this, (_t("Are you sure you want to remove these items?")), {
            confirm_callback: function () {
            	self.register(objs,'delete');
            	for(var i = 0; i< objs.length;i++){
            		objs[i].clear();
            		objs[i].points = [];
            	}
            	
            	self.pad.isModified = true;
            	if(self.pad.isModified && self.hawkeye.visible)
            		self.hawkmap.drawPad();
            },
        });
    	
    	
    },
    _renderButtons: function () {
    	this.$buttons = $(QWeb.render('Glassmap.Buttons'));
    	//this.$switch_buttons = $(QWeb.render('Glassmap.info'));
    	this.$buttons.on('click', '.fa-mouse-pointer',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-search-plus',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-search-minus',this._onButtonSelectMode.bind(this) );

    	this.$buttons.on('click', '.fa-trash',this._onButtonTrash.bind(this) );

    	this.$buttons.on('click', '.fa-undo',this.undo.bind(this) );
    	this.$buttons.on('click', '.fa-repeat',this.redo.bind(this) );

    	this.$buttons.on('click', '.o_pad_object_list>li',this._onButtonSelectObject.bind(this) );
    	
     },
     
     _loadPad: function(){
  		var pos = this.cameraConf.general.glass_center.split(',');
 		this.glass_center_x = parseFloat(pos[0]);
 		this.glass_center_y = parseFloat(pos[1]);
 		this.glass_angle = parseFloat(this.cameraConf.general.angle);
 		
  		var self = this;
  		this._rpc({
             model: 'padtool.pad',
             method: 'read',
             args: [this.active_id, ['content','curl','glassName','panelName']]
         })
         .then(function (data) {
         	if(data.length && data[0].content){
         		var json_data = JSON.parse(data[0].content);

         		var panelNames = _.keys(self.padConf);
             	panelNames = _.filter(panelNames,function(name){
             		return self.padConf[name].panel_map != undefined;
             	});
             	
             	_.each(panelNames,function(panelName){
             		if(panelName == data[0].panelName){
             			self._drawPad(panelName,json_data);
             		}
             	})
         	}
         	
         	if(data.length && data[0].curl){
        		self.jsonpad = JSON.parse(data[0].curl);
        	}
        	else{
        		self.jsonpad = new Array();
        	}
        		
        	self._drawCurlPad();
         },function(){
        	self.jsonpad = new Array();
        	self._drawPad();
        });
      },

      ///wft
      _onObjectScaled: function(opt){
      	 if(opt.target.type == "hawkeye"){
      		if(((opt.target.height * opt.target.scaleY) / this.coordinate.pmpPanelMapPara.dRatioY) > this.globalConf.hawk_height){
      			opt.target.scaleY = this.globalConf.hawk_height * this.coordinate.pmpPanelMapPara.dRatioY / opt.target.height ;
      			this.map.renderAll();
      		}
      		if(((opt.target.width *  opt.target.scaleX) / this.coordinate.pmpPanelMapPara.dRatioX) > this.globalConf.hawk_width){
      			opt.target.scaleX = this.globalConf.hawk_width * this.coordinate.pmpPanelMapPara.dRatioX / opt.target.width;
      			this.map.renderAll();
      		}
      		$('.panel-hawk').toggleClass('o_hidden');
      		$('.panel-hawk').toggleClass('o_hidden');
      		
       		this.hawkmap.showImage();
       		this.isObjectScaled = true;
       	}
       },
       
       ///wft
       _onObjectMoved: function(opt){
      	 if(opt.target.type == "hawkeye"){
       		this.hawkmap.showImage();
       		this.isObjectMoved = true;
       	}else if(opt.target.type == "cross"){
       		this.isObjectMoved = true;
       		if(opt.target.mouseMove()){
       			opt.target.pad.points[opt.target.id].x = opt.target.left;
       			opt.target.pad.points[opt.target.id].y = opt.target.top;
      
       			//let {dOutputX:ux, dOutputY:uy} = this.coordinate.PanelMapCoordinateToUMCoordinate(opt.target.left,this.image.height-opt.target.top);
       			opt.target.pad.points[opt.target.id].ux = ux;
  				opt.target.pad.points[opt.target.id].uy = uy;
  				
  				if(this.hawkmap){
  					this.hawkmap.drawPad();
  				}
       		}
       	}
       },   
    
    _onMouseMove:function(opt){
   		if(this.map){
   			var zoom = this.map.getZoom();
   			var x = opt.e.offsetX;
   			var y = opt.e.offsetY;
   			
   			let {dOutputX:ux, dOutputY:uy} = this.coordinate.GlassMapCoordinateToUMCoordinate(x/zoom,this.image.height- y/zoom);
   			let {iIP, iScan} = this.coordinate.JudgeIPScan_UM(ux,uy);
   			//let {dCustomerPointX:cx, dCustomerPointY:cy} = this.coordinate.UmCoordinateToCustomerCoordinate(ux,uy);
   			
   			$(".map-info").text("IP("+iIP+") Scan("+iScan+") image("+Math.round(x/zoom)+","+Math.round(y/zoom)+") window("+x+","+y+") um("+Math.round(ux)+','+Math.round(uy) + ")");

   		}
   		
   		
       	opt.e.stopPropagation();
           opt.e.preventDefault();	
   	},   
    
    _onMouseDblclick:function(opt){
   	 if(this.map.hoverCursor == 'default'){
   		if(!this.isSupportCurl){
    		this.do_warn(_t('Operation Result'),_t('Curling pad is not supported !'),false);
    		return;
    	}
   		
   		if(!this.hawkeye)
   			return;
   		
   		 var zoom = this.map.getZoom();
	 	    this.hawkeye.set({ 
	     			top: opt.pointer.y/zoom, 
	     			left: opt.pointer.x/zoom,
	     			visible:true,
	     		});
	 	    this.hawkeye.setCoords();
	     	this.hawkeye.bringToFront();
			
			
			if(!this.hawkmap){
				//this.hawkmap.destroy();
	    		//delete this.hawkmap;
				this.hawkmap = new Hawkmap(this);
		        this.hawkmap.pad = this.pad;
		        this.hawkmap.appendTo('body');
	    	}
			this.hawkmap.do_show();
	        this.hawkmap.showImage();

		}
    },   	
	
/*	_onMouseUp:function(opt){
		
		if(this.map.startPointer.x != opt.pointer.x ||this.map.startPointer.y != opt.pointer.y){
    		return;
    	}
		
		var zoom = this.map.getZoom();
		if(this.map.hoverCursor == 'default'){
			var id = 1;
			let {dOutputX, dOutputY} = this.coordinate.GlassMapCoordinateToUMCoordinate(opt.pointer.x/zoom,this.image.height-opt.pointer.y/zoom);
			
	 		while(this.bifConf['auops.subpanel.subpanel_'+id+'.global_subpanel_data'] != undefined){
	 			var pos = this.bifConf['auops.subpanel.subpanel_'+id+'.position.top_left'].split(',');
	    		var left = parseFloat(pos[0]);
	    		var top = parseFloat(pos[1]);
	    		pos = this.bifConf['auops.subpanel.subpanel_'+id+'.position.bottom_right'].split(',');
	    		var right = parseFloat(pos[0]);
	    		var bottom = parseFloat(pos[1]);
	    		
	    		var tmp = left * Math.cos(-this.glass_angle) + bottom * Math.sin(-this.glass_angle) + this.glass_center_x;
	    		bottom = -left * Math.sin(-this.glass_angle) + bottom * Math.cos(-this.glass_angle) + this.glass_center_y;
	    		left = tmp;
	    		
	    		tmp = right * Math.cos(-this.glass_angle) + top * Math.sin(-this.glass_angle) + this.glass_center_x;
	    		top = -right * Math.sin(-this.glass_angle) + top * Math.cos(-this.glass_angle) + this.glass_center_y;
	    		right = tmp;
	    		
	    		if(dOutputX > left && dOutputX < right && dOutputY < bottom && dOutputY > top){
	    			var name = this.bifConf['auops.subpanel.subpanel_'+id+'.global_subpanel_data'];
	    			var li = $("span.oe_menu_text:contains('"+name+"')").parent().parent();
	    			li.find("span.oe_menu_text:contains('PanelMap')").parent().click();
	    			break;
	    		}
	    		id++;
	 		}
		}else{
			var delta = 0;
			if(this.map.hoverCursor == 'zoom-in')
				delta = 0.2;
			else if(this.map.hoverCursor == 'zoom-out')
				delta = -0.2;

			var x = opt.e.offsetX / zoom;
			var y = opt.e.offsetY / zoom;
			
			zoom = zoom + delta;
			zoom = Math.floor(zoom*10)/10;
			if (zoom > 1.2) zoom = 1.2;
			if (zoom <= this.minZoom) zoom = this.minZoom;
			
			var div = $('div.o_content')
			x = x * zoom - (opt.e.offsetX -div.scrollLeft());
			y = y * zoom - (opt.e.offsetY-div.scrollTop());
			
			this.map.setZoom(zoom);
			this.map.setDimensions({width:this.image.width*zoom,height:this.image.height*zoom});
			this.map.wrapperEl.style['width'] = '';
	    	this.map.wrapperEl.style['height'] = '';
			
			opt.e.preventDefault();
			opt.e.stopPropagation();

			div.scrollTop(y);
			div.scrollLeft(x);
		}
	},*/
   	
   	updateForSelect:function(){
    	var self = this; 
    	var first = true;
    	this.map.pads.forEach(function(pad){
			if(pad.padType == self.pad.curType && pad.points.length){
				if(pad.selected){
					pad.lines.forEach(function(line){line.dirty=true;line.stroke = 'red';line.fill='red'});
					if(first){
						first = false;
					}
				}else{
					pad.lines.forEach(function(line){
						line.dirty=true;
						
					});
				}
			}
		});
    	this.map.renderAll();
 	},
 	
 	_drawCurlPad:function(){ 
 		var self = this;
 		this.jsonpad.objs && this.jsonpad.objs.forEach(function(pad){
 			var obj = new Mycanvas.MyPolyline(self.map,pad.padType);
 			obj = _.extend(obj, pad);
 			for(var i = 0; i < obj.points.length; i++){
 				if(obj.points[i].x === undefined && obj.points[i].ux !== undefined){
 					var out = self.coordinate.UMCoordinateToGlassMapCoordinate(obj.points[i].ux,obj.points[i].uy);
 					obj.points[i].x = out.dOutputX;
 					obj.points[i].y = self.image.height - out.dOutputY;
 				}else if(obj.points[i].x !== undefined && obj.points[i].ux === undefined){
 					var out = self.coordinate.GlassMapCoordinateToUMCoordinate(obj.points[i].x,self.image.height-obj.points[i].y);
 					obj.points[i].ux = out.dOutputX;
 					obj.points[i].uy = out.dOutputY;
 				}
 			}
 			obj.update();
 		})

    	this.map.forEachObject(this.showObj.bind(this));

		this.map.discardActiveObject();
		this.map.renderAll();

     }, 	
    

 	_drawPad: function(panelName,pads){
 		var self = this;
 		var id = 1;
 		while(this.bifConf['auops.subpanel.subpanel_'+id+'.global_subpanel_data'] != undefined){
 			if(this.bifConf['auops.subpanel.subpanel_'+id+'.global_subpanel_data'] != panelName){
 				id++;
 				continue;
 			}
 				
 			var pos = this.bifConf['auops.subpanel.subpanel_'+id+'.position.top_left'].split(',');
    		var left = parseFloat(pos[0]);
    		var top = parseFloat(pos[1]);
    		pos = this.bifConf['auops.subpanel.subpanel_'+id+'.position.bottom_right'].split(',');
    		var right = parseFloat(pos[0]);
    		var bottom = parseFloat(pos[1]);
    		
    		var x = (left + right)/2;
    		var y = (top + bottom)/2;
    		var panel_center_x = x * Math.cos(-this.glass_angle) + y * Math.sin(-this.glass_angle) + this.glass_center_x;
    		var panel_center_y = -x * Math.sin(-this.glass_angle) + y * Math.cos(-this.glass_angle) + this.glass_center_y;

    		pads.objs && pads.objs.forEach(function(pad){
     			var obj = new Mycanvas.MyPolyline(self.map,pad.padType);
     			pad.points.forEach(function(p){
     				var ux = p.ux + panel_center_x - parseFloat(self.padConf[panelName].panel_center_x);
     				var uy = p.uy + panel_center_y - parseFloat(self.padConf[panelName].panel_center_y);
     				let {dOutputX:x, dOutputY:y} = self.coordinate.UMCoordinateToGlassMapCoordinate(ux,uy)
     				obj.points.push({x,y:self.image.height-y});
     			})
     			obj.update();
    		});

    		id++;
    		//break;
 		}
 	},
 	
 
 	

});

core.action_registry.add('padtool.glassmap', Glassmap);


return Glassmap;

});