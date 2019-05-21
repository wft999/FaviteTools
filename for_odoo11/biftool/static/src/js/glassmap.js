odoo.define('padtool.Glassmap', function (require) {
"use strict";

var ControlPanelMixin = require('web.ControlPanelMixin');
var core = require('web.core');
var Widget = require('web.Widget');
var framework = require('web.framework');

var Coordinate = require('padtool.coordinate');
var Mycanvas = require('padtool.Canvas');
var QWeb = core.qweb;
var _t = core._t;

var Glassmap = Widget.extend(ControlPanelMixin,{
    template: 'Map',
/*    
    events: {
        'click .o_setup_company': 'on_setup_company'
    },
*/
    init: function(parent,action){
    	this.action_manager = parent;
    	if(action){
    		this.menu_id = action.context.params.menu_id;
    		this.active_id = action.context.active_id;
    	}else{
    		var queryString = document.location.hash.slice(1);
        	var params = this._parseQueryString(queryString);
        	if ('menu_id' in params) {
        		this.menu_id = params.menu_id;
        	}
    	}
        return this._super.apply(this, arguments);
    },
    
    willStart: function () {
        var self = this;
        return this._rpc({model: 'padtool.pad',method: 'glass_information',args: [this.menu_id],})
            .then(function(res) {
            	if(res){
            		_.extend(self,res);
                	self.coordinate = new Coordinate(res.cameraConf,res.bifConf,res.padConf,res.panelName);
            	}
            });
    },

    start: function(){    
    	var self = this;
    	this._super.apply(this, arguments);
    	
    	if(this.glassName === undefined)
    		return;
    	
    	framework.blockUI();
    	this.defImage = new $.Deferred();
    	this.image = new fabric.Image();
    	var src = '/glassdata/'+this.glassName +'/' + this.padConf.GLASS_INFORMATION.glass_map;
    	this.image.setSrc(src, function(img){
    		self.coordinate.gmpGlassMapPara.iGlassMapWidth = self.image.width;
    		self.coordinate.gmpGlassMapPara.iGlassMapHeight = self.image.height;
    		
    		img.set({left: 0,top: 0,hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false });
    		self.map  = new fabric.Canvas('map',{hoverCursor:'default',stopContextMenu:true});
    		self.map.pads = new Array();
    		var zoom = Math.max(self.map.getWidth()/img.width,self.map.getHeight()/img.height);
    		zoom = Math.floor(zoom*100)/100;
    		self.minZoom = zoom;
    		self.map.setZoom(zoom);
    		self.map.setDimensions({width:img.width*zoom,height:img.height*zoom});
    		self.map.wrapperEl.style['width'] = '';
       	 	self.map.wrapperEl.style['height'] = '';
    		//this.map.setBackgroundImage(img);
    		self.map.add(img);

    		self.map.on('mouse:move',self._onMouseMove.bind(self));    		
    		self.map.on('mouse:out', self._onMouseOut.bind(self));  
    		self.map.on('mouse:up', self._onMouseUp.bind(self));
    		self.map.on('mouse:down',self._onMouseDown.bind(self));
    		
    		self._renderButtons();
    		self._updateControlPanel();
    		
    		self._loadPad();
    		framework.unblockUI();
    	});
    },
    
    destroy: function(){	
    	
    	if(this.map){
    		this.map.off('mouse:move');    		
        	this.map.off('mouse:out');  
        	this.map.off('mouse:up');
        	this.map.off('mouse:down');
    		while(this.map.pads.length){
    			var pad = this.map.pads.pop()
    			pad.clear();
    			delete pad.points;
    		}

    		this.map.clear();
    		delete this.image;
    		delete this.map;
    	}
    	this._super.apply(this, arguments);
    },


    do_show: function () {
        this._super.apply(this, arguments);
        this._updateControlPanel();
        
    },
    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    _onMouseDown:function(opt){
    	this.map._isMousedown = true;
    	this.map.startPointer = opt.pointer;
    },
	_onMouseMove:function(opt){
		if(this.map){
			var zoom = this.map.getZoom();
			var x = opt.e.offsetX;
			var y = opt.e.offsetY;
			$(".map-info").text("image(x:"+Math.round(x/zoom)+",y:"+Math.round(y/zoom)+") window(x:"+x+",y:"+y+")");
		}
		
    	opt.e.stopPropagation();
        opt.e.preventDefault();
    		
	},
	_onMouseOut:function(opt){
		$(".map-info").text("");
	},
	
	_onMouseUp:function(opt){
		
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
	},
    
    _parseQueryString: function(query) {
        var parts = query.split('&');
        var params = {};
        for (var i = 0, ii = parts.length; i < ii; ++i) {
          var param = parts[i].split('=');
          var key = param[0].toLowerCase();
          var value = param.length > 1 ? param[1] : null;
          params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
        return params;
      },
      
    _onButtonSelectMode:function(e){
    	this.map.hoverCursor = e.currentTarget.dataset.mode;
    	$('.glassmap-mode button').removeClass('active');
    	$(e.currentTarget).addClass('active');
    	
    },
    _renderButtons: function () {
    	this.$buttons = $(QWeb.render('Glassmap.Buttons'));
    	//this.$switch_buttons = $(QWeb.render('Glassmap.info'));
    	this.$buttons.on('click', '.fa-mouse-pointer',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-search-plus',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-search-minus',this._onButtonSelectMode.bind(this) );
     },
     _updateControlPanel: function () {    			
     	this.update_control_panel({
               breadcrumbs: this.action_manager.get_breadcrumbs(),
               cp_content: {
             	  $searchview: this.$buttons,
             	  //$buttons: this.$buttons,
             	  //$switch_buttons:this.$switch_buttons,
             },
     	});
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
    		
    		var innerFrame = null;
     		var outerFrame = null;
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
 		}
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
            args: [this.active_id, ['content','glassName','panelName']]
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
        });
     },

});

core.action_registry.add('padtool.glassmap', Glassmap);


return Glassmap;

});