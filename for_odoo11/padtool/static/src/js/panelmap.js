odoo.define('padtool.Panelmap', function (require) {
"use strict";

var ControlPanelMixin = require('web.ControlPanelMixin');
var core = require('web.core');
var Dialog = require('web.Dialog');


var Map = require('padtool.Map');
var Mycanvas = require('padtool.Canvas');
var Hawkmap = require('padtool.Hawkmap');
var Coordinate = require('padtool.coordinate');


var QWeb = core.qweb;
var _t = core._t;


var Panelmap = Map.extend(ControlPanelMixin,{
    template: 'Map',
    
    events: {
//        'keydown.canvas-map': '_onKeydown'
    },

    init: function(parent,action){
    	
    	this.pad = {
    		curType: 'frame',
    		isModified:false,
    		isSubMarkModified:false,
    	};
    	
    	this.undoStack = [];
        this.redoStack = [];
    	
        return this._super.apply(this, arguments);
    },
    
    willStart: function () {
        var self = this;
        return this._rpc({model: 'padtool.pad',method: 'panel_information',args: [this.menu_id],})
            .then(function(res) {
            	if(res !== undefined){
            		_.extend(self,res);
                	self.coordinate = new Coordinate(res.cameraConf,res.bifConf,res.padConf,res.panelName,res.gmdConf);
                	self.tmpCoordinate = new Coordinate(res.cameraConf,res.bifConf,res.padConf,res.panelName);
            	}	
            });
    },
    
    start: function(){
    	this._super.apply(this, arguments);
    	if(this.panelName === undefined)
    		return;

        if(this.coordinate.giGlassInformationPara == undefined){
    		this.do_warn(_t('Operation Result'),_t("GMD file doesn't exist !"),false);
    	}
        
        var self = this;
    	$.when(self.defImage).then(function ( ) { 	
    		self.coordinate.pmpPanelMapPara.iPanelMapWidth = self.image.width;
    		self.coordinate.pmpPanelMapPara.iPanelMapHeight = self.image.height;
    		
    		self._loadPad();
    		self._drawHawk();
    		
    		self._renderButtons();
    		self._updateControlPanel();
    		self._showToolbar();
    		
    		$('.breadcrumb').append('<li>frame</li>');
    	});
    },
    
    deleteMap:function(){
    	while(this.map.pads.length){
			var pad = this.map.pads.pop();
			pad.clear();
			delete pad.points;
		}

    	this.map.clear();
		delete this.image;
		delete this.map;	
    },
    
    destroy: function(){	
    	if(this.pad.isModified){
    		var self = this;
    		var su = self._super;
    		Dialog.confirm(this, (_t("The current pad was modified. Save changes?")), {
                confirm_callback: function () {
                    self._onButtonSave().then(function(){
                    	self.map && self.deleteMap.call(self);
                    	su.apply(self, arguments);
                    });
                },
                cancel_callback:function(){
                	self.deleteMap.call(self);
                	su.apply(self, arguments);
                }
            });
    	}else{
    		this._super.apply(this, arguments);
    		if(this.map){
        		this.deleteMap();
        	}
    	}
    	
    	this.hawkmap&&this.hawkmap.destroy();
    },

    do_show: function () {
        this._super.apply(this, arguments);
        this._updateControlPanel();
        
    },
    
    register:function(pad,action) {
    	var pads = [];
    	if(Array.isArray(pad)){
    		pads = pad;
    	}else{
    		pads.push(pad);
    	}
    	
    	var points = [];
    	pads.forEach(function(item){
    		var tmp = [];
    		
    		item.points.forEach(function(p){
    			if(action !== 'copy')
    				tmp.push({x:p.x,y:p.y,ux:p.ux,uy:p.uy});
        	});

    		points.push(tmp);
    	})
    	
        this.undoStack.push({pads,points,action});
        this.redoStack.length = 0;
    },
    
    undo:function() {
        var c = this.undoStack.pop();
        if (c) {
        	var points = [];
        	for(var i = 0; i< c.pads.length; i++){
        		if(c.action == 'delete')
        			points.push([]);
        		else
        			points.push(c.pads[i].points);
        		
        		c.pads[i].points = c.points[i];
                c.pads[i].update();
        	}
            this.redoStack.push({pads:c.pads,points,action:c.action});
            this.hawkmap && this.hawkmap.showImage();
        }
    },
    
    redo:function() {
        var c = this.redoStack.pop();
        if (c) {
        	var points = [];
        	for(var i = 0; i< c.pads.length; i++){
        		points.push(c.pads[i].points);
        		
        		c.pads[i].points = c.points[i];
                c.pads[i].update();
        	}
        	
            this.undoStack.push({pads:c.pads,points,action:c.action});
            this.hawkmap && this.hawkmap.showImage();
        }
    },

  //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    _drawHawk:function(){
    	this.hawkeye = new Mycanvas.Hawkeye({ 
 			left: this.image.width/2, 
 			top: this.image.height/2,
 			width:100,
 			height:100,
 			});
    	this.map.add(this.hawkeye);
    	this.hawkeye.bringToFront();
    },
    
    _onButtonSelectMode:function(e){
    	var self = this;
    	this.map.hoverCursor = e.currentTarget.dataset.mode;

    	$('.glassmap-mode button').removeClass('active');
    	$(e.currentTarget).addClass('active');
    	
    	if(this.map.hoverCursor == 'default'){
    		this.map.discardActiveObject();
    	}
    	this.map.forEachObject(this.showObj.bind(this));
    	this.map.requestRenderAll();
    	this._showToolbar();
    },
    
    _showToolbar(){
    	if(this.pad.curType === undefined)
    		this.pad.curType = 'frame';
    	
    	var hidden = this.pad.curType == 'frame' || this.pad.curType == 'subMark' 
    	this.$buttons.find('.fa-trash').toggleClass('o_hidden',hidden);
    	this.$buttons.find('.fa-undo').toggleClass('o_hidden',hidden);
    	this.$buttons.find('.fa-repeat').toggleClass('o_hidden',hidden);
    	
    	this.$buttons.find('.fa-eye').toggleClass('o_hidden',this.coordinate.giGlassInformationPara == undefined);
    	this.$buttons.find('.submask-checkbox-label').toggleClass('o_hidden',this.pad.curType !== 'subMark');
    	this.$buttons.find('.fa-th').toggleClass('o_hidden',this.pad.curType !== 'subMark');

    },
    
    showObj:function(obj){
		if(obj.pad){
			obj.visible = obj.pad.padType == this.pad.curType 
			|| (obj.pad.padType == 'region' && this.pad.curType == 'frame') 
			|| (obj.pad.padType == 'inspectZone' && this.pad.curType == 'uninspectZone')
			|| (obj.pad.padType == 'uninspectZone' && this.pad.curType == 'inspectZone');
			if(obj.type == 'cross'){
				obj.visible = this.pad.curType == 'frame' && obj.pad.padType == 'frame' && this.map.hoverCursor == 'default';
			}
		}
		
	},
    
    _onButtonSelectObject:function(e){
    	if(e.currentTarget.children[0].text == 'Save'){
    		this._onButtonSave();
    		return;
    	}
    	
    	
    	var self = this;
    	this.pad.curType = e.currentTarget.children[0].text;
    	
    	this._showToolbar();
    	
    	var objectList = this.$buttons.find('.o_pad_object_list');
    	objectList.find('li').each(function (index, li) {
    		var addOrRemove  = li === e.currentTarget;
            $(li).toggleClass('selected',addOrRemove);
            if(addOrRemove){
            	if($('.breadcrumb')[0].children[2])
            		$('.breadcrumb')[0].removeChild($('.breadcrumb')[0].children[2]);
            	$('.breadcrumb').append('<li>'+self.pad.curType+'</li>')
            }
        });
    	
    	if(this.pad.curType == 'subMark'){
    		if(this.isPolygonSubMark == false && _.some(this.map.pads,function(obj){return obj.padType == 'subMark'}) == false){
    			this._drawSubMark();
    		}
    			
    	}else{
    		if(this.markShow){
    			this.markShow.forEach(function(obj){
        			self.map.remove(obj);
         		});
    			this.markShow = null;
    		}
    	}
    	
    	this.map.forEachObject(this.showObj.bind(this));
    	this.map.discardActiveObject();
    	this.map.renderAll();
    	
    	if(this.hawkmap){
    		this.hawkmap.map.curPad = null;
    		this.hawkmap.map.forEachObject(this.showObj.bind(this));
    		this.hawkmap.map.discardActiveObject();
    		this.hawkmap.map.renderAll();
    		
    		this.hawkmap.$el.find('button.fa-mouse-pointer').click();
    		var hidden = this.pad.curType == 'frame' || (this.pad.curType == 'subMark' && this.isPolygonSubMark==false);
        	this.hawkmap.$el.find('.fa-edit').toggleClass('o_hidden',hidden);
         	this.hawkmap.$el.find('.fa-copy').toggleClass('o_hidden',hidden);
    	}
    	
    	this.$buttons.find('.fa-mouse-pointer').click();
    	
    	e.preventDefault();
		e.stopPropagation();

    },
    
    _getMarkImage:function(data){
    	var self = this;
    	var d = new Date();
    	if(data.length && data[0].mainMark_attachment_id){
    		var src = '/web/content/'+ data[0].mainMark_attachment_id[0]+'?t='+ d.getTime();
    		fabric.Image.fromURL(src, function(img) {
    			self.mainMarkImage = img;
    			self.mainMarkImage.originX = 'left';
    			self.mainMarkImage.originY = 'top';
    		});
    		
    	}
		
    	if(data.length && data[0].subMark_attachment_id){
    		var src = '/web/content/'+ data[0].subMark_attachment_id[0]+'?t='+ d.getTime();
    		fabric.Image.fromURL(src, function(img) {
    			self.subMarkImage = img;
    			self.subMarkImage.originX = 'left';
    			self.subMarkImage.originY = 'top';
    		});
    	}
		
    },
    
    _onButtonSave:function(){
    	var self = this;
    	var pad = new Object();
    	pad.dPanelCenterX = parseFloat(this.padConf[this.panelName]['PANEL_CENTER_X'.toLowerCase()]);
    	pad.dPanelCenterY = parseFloat(this.padConf[this.panelName]['PANEL_CENTER_Y'.toLowerCase()]);
    	pad.region_overlap = this.globalConf.region_overlap;
    	pad.region_height = this.globalConf.region_height;
    	pad.isSubMarkModified = this.pad.isSubMarkModified;
    	pad.isMainMarkModified = this.pad.isMainMarkModified;
    	
    	pad.objs = new Array();
    	var mainMarkStartX = 0;
    	var subMarkStartX = 0;
    	this.map.pads.forEach(function(obj){
    		if(obj.points.length < 2)
    			return;
    		if(_.some(obj.points,function(p){return p.ux == undefined || p.uy == undefined})){
    			self.do_warn(_t('Operation Result'),_t('Point is not correct !'),false);
    			return;
    		}
    		if(obj.padType == 'subMark' && obj.points.length <= 2  && obj.blocks == undefined)
    			return;
    		
    		var o = {
    			padType: obj.padType,
    			points:obj.points,
    		};
    		if(obj.padType == 'mainMark'){
    			o.blocks = obj.blocks;
    			o.iMarkDirectionType = obj.iMarkDirectionType;
    			o.imgStartX = mainMarkStartX;
    			obj.imgStartX = mainMarkStartX;
    			mainMarkStartX += o.blocks[0].iInterSectionWidth;
    		}else if(obj.padType == 'subMark'){
    			o.blocks = obj.blocks;
    			if(o.blocks){
    				o.iMarkDirectionType = obj.iMarkDirectionType;
        			o.imgStartX = subMarkStartX;
        			obj.imgStartX = subMarkStartX;
        			subMarkStartX += o.blocks[0].iInterSectionWidth;
    			}
    		}
    		else if(obj.padType == 'inspectZone'){
    			o.zone = obj.zone || 9;
				o.toleranceX = obj.toleranceX || 10;
				o.toleranceY = obj.toleranceY || 10;
				
    			o.periodX = obj.periodX || 0;
    			o.periodY = obj.periodY || 0;
    			o.D1G1 = obj.D1G1 || 0;
    			o.goaUX = obj.goaUX || 0;
    			o.goaUY = obj.goaUY || 0;
    		}else if(obj.padType == 'region'){
    			o.iFrameNo = obj.iFrameNo;
    		}
    		
    		pad.objs.push(o);
    	});
    	//pad.pMarkRegionArray = this.pMarkRegionArray;
    	
    	return this._rpc({model: 'padtool.pad',method: 'write',args: [this.active_id,{content:JSON.stringify(pad)}],}).then(function(values){
    		self.do_notify(_t('Operation Result'),_t('Pad was succesfully saved!'),false);
    		self.pad.isModified = false;
    		self.pad.isSubMarkModified = false;
    		self.pad.isMainMarkModified = false;
 
        	self._rpc({
                model: 'padtool.pad',
                method: 'read',
                args: [self.active_id, ['mainMark_attachment_id','subMark_attachment_id']]
            })
            .then(function (data) {
            	self._getMarkImage(data);
            });
    		
        });
    },
    
    _onButtonTrash:function(){
    	var self = this;
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
            		if(objs[i].padType == 'mainMark'){
            			self.pad.isMainMarkModified = true;
            		}
            		objs[i].points = [];
            	}
            	
            	self.pad.isModified = true;
            	if(self.pad.isModified && self.hawkeye.visible)
            		self.hawkmap.drawPad();
            },
        });
    	
    	
    },
    
    _onButtonRefresh:function(){
    	if(this.pad.curType === 'subMark'){
			this._drawSubMark();
			if(this.pad.isModified && this.hawkeye.visible)
        		this.hawkmap.drawPad();
    	}else if(this.pad.curType === 'frame'){
    		this._drawRegion();
        	this.do_notify(_t('Operation Result'),_t('Region has refreshed!'),false);
    	}else{
    		var self = this;
    		var objs = _.filter(this.map.pads,function(pad){return pad.padType == self.pad.curType});
        	if(objs.length == 0){
        		return;
        	}
    		Dialog.confirm(this, (_t("Are you sure you want to remove all objects?")), {
                confirm_callback: function () {
                	self.register(objs,'delete');
                	for(var i = 0; i< objs.length;i++){
                		objs[i].clear();
                		if(objs[i].padType == 'mainMark'){
                			self.pad.isMainMarkModified = true;
                		}
                		objs[i].points = [];
                	}
                	
                	self.pad.isModified = true;
                	if(self.pad.isModified && self.hawkeye.visible)
                		self.hawkmap.drawPad();
                	self.do_notify(_t('Operation Result'),_t('Objects has refreshed!'),false);
                },
            });
    	}
    	
    },
    
    _getUmCoordinateForPanleMap(dOutputX,dOutputY){
    	var id = 1;
    	var res = {};
    	var cur = 0;
    	while(this.bifConf['auops.subpanel.subpanel_'+id+'.global_subpanel_data'] != undefined){
    		if(this.bifConf['auops.subpanel.subpanel_'+id+'.global_subpanel_data'] != this.panelName){
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
    		
    		var dd = (dOutputY-panel_center_y)*(dOutputY-panel_center_y) + (dOutputX-panel_center_x)*(dOutputX-panel_center_x);
    		if(cur == 0 || dd < cur ){
    			cur = dd;
        		var ux = dOutputX - panel_center_x + parseFloat(this.padConf[this.panelName].panel_center_x);
 				var uy = dOutputY - panel_center_y + parseFloat(this.padConf[this.panelName].panel_center_y);
    			
    			res =  {ux,uy};
    		}
    		id++;
 		}
    	return res;
    },
    
    _onButtonHawkeye: function(){
    	var self = this;
        var $content = $(QWeb.render("SetHawkeyeDialog"));
            
        this.dialog = new Dialog(this, {
        	title: _t('Hawkeye'),
        	size: 'medium',
        	$content: $content,
        	buttons: [{text: _t('Confirm'), classes: 'btn-primary', close: true, click: function(){
        		var x = parseFloat(this.$content.find('.o_set_customerx_input').val());
            	var y = parseFloat(this.$content.find('.o_set_customery_input').val());
            	let {dOutputX,dOutputY} = self.coordinate.CustomerCoordinateToUmCoordinate(x,y);
            	
            	if(dOutputX !== undefined && dOutputY !== undefined){
            		if(self.hawkeye && self.map.hoverCursor == 'default'){
            			var out1 = self._getUmCoordinateForPanleMap(dOutputX,dOutputY);
            			var out = self.coordinate.UMCoordinateToPanelMapCoordinate(out1.ux,out1.uy);
            			self.hawkeye.set({ 
           	     			left: out.dOutputX, 
           	     			top: self.image.height - out.dOutputY,
           	     			visible:true,
           	     		});
           	 	    	self.hawkeye.setCoords();
           	 	    	self.hawkeye.bringToFront();

           	 	    	if(!self.hawkmap){
           	 	    		self.hawkmap = new Hawkmap(self);
           	 	    		self.hawkmap.pad = self.pad;
           	 	    		self.hawkmap.appendTo('body');
           	 	    	}
           	 	    	self.hawkmap.do_show();
           	 	    	self.hawkmap.showImage();
            		}
            	}
        	}},
        		{text: _t('Discard'), close: true}],
        });
        this.dialog.opened().then(function () {
            var $input = self.dialog.$('input.form-control');
            $input.val(0);
            $input.on('change', function (event){
            	var x = parseFloat(self.dialog.$content.find('.o_set_customerx_input').val());
            	var y = parseFloat(self.dialog.$content.find('.o_set_customery_input').val());
            	let {dOutputX,dOutputY} = self.coordinate.CustomerCoordinateToUmCoordinate(x,y);
            	let {iIP,iScan} = self.coordinate.JudgeIPScanUM(dOutputX,dOutputY,0,0);
            	iIP++;
            	iScan++;
            	var $span = self.dialog.$('span.ipscan');
            	$span.html("ip:"+iIP+",scan:"+iScan);
            });
        });
        this.dialog.open();
    },
    
    _showMark:function(markImage,pad,i){
		var self = this;
		var tempCanvas = new fabric.StaticCanvas();
	    tempCanvas.setDimensions({
	      width: pad.blocks[0].iInterSectionWidth+6,
	      height:_.reduce(pad.blocks, function(memo, block){return (memo + (block.iInterSectionHeight?block.iInterSectionHeight:0));}, 0)+6
	    });
	    
	    tempCanvas.add(markImage);
	    markImage.left = -pad.imgStartX +2;
	    markImage.top = -markImage.height + tempCanvas.height + 2;
	    markImage.setCoords();
	    
	    tempCanvas.add(new fabric.Rect({
	    	left:3,
	    	top:3,
	    	width:tempCanvas.width -6,
	    	height:tempCanvas.height -6,
	    	fill:false,
	    	strokeWidth:3,
	    	stroke:'yellow'
	    }));
	    
	    tempCanvas.renderAll();
	    
	    var img = new Image();
	    img.onload = function() {
	    	self.markShow[i] = new fabric.Image(img, {
	    		left: pad.points[0].x > (self.image.width/2)? (pad.points[0].x - tempCanvas.width):(pad.points[1].x),
	    		top: pad.points[1].y > (self.image.height/2)? (pad.points[1].y - tempCanvas.height):(pad.points[0].y),
	    		hasControls: false,
	    	});
	    	self.markShow[i].pad = pad;
	    	self.map.add(self.markShow[i]);
	    	self.map.renderAll();
	    }
	    img.src = tempCanvas.toDataURL();
	},
    
    _onButtonSubmark: function(){
    	var self = this;
    	
    	if(self.markShow){
    		self.markShow.forEach(function(obj){
    			self.map.remove(obj);
     		});
    		self.markShow = null;
		}else{
			self.markShow = new Array();
			for(var i = 0; i < this.map.pads.length; i++){
				if(this.map.pads[i].padType == 'subMark')
					this._showMark(this.subMarkImage,this.map.pads[i],i)
			}
		}
    },
    
    _renderButtons: function () {
    	this.$buttons = $(QWeb.render('Panelmap.Buttons'));
    	//this.$switch_buttons = $(QWeb.render('Panelmap.status'));
    	//this.$buttons.on('click', '.fa-eye',this._onButtonHawkeye.bind(this) );
    	this.$buttons.on('click', '.fa-refresh',this._onButtonRefresh.bind(this) );
    	
    	this.$buttons.on('click', '.fa-mouse-pointer',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-search-plus',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-search-minus',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-trash',this._onButtonTrash.bind(this) );
    	this.$buttons.on('click', '.fa-eye',this._onButtonHawkeye.bind(this) );
    	this.$buttons.on('click', '.fa-th',this._onButtonSubmark.bind(this) );
    	
    	this.$buttons.on('click', '.fa-undo',this.undo.bind(this) );
    	this.$buttons.on('click', '.fa-repeat',this.redo.bind(this) );

    	this.$buttons.on('click', '.o_pad_object_list>li',this._onButtonSelectObject.bind(this) );
    	
    	this.$buttons.on('click', '.submask-checkbox-label > input',function(){
    		this.isPolygonSubMark = this.$buttons.find('.submask-checkbox-label > input')[0].checked;
    		var res = _.partition(this.map.pads, function(obj){
     			return obj.padType == 'subMark';
     		});
     		this.map.pads = res[1];
     		res[0].forEach(function(obj){
     			obj.clear();
     		});
    	}.bind(this) );
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
     
     _loadPad: function(){
    	var pos = this.cameraConf.general.glass_center.split(',');
 		this.glass_center_x = parseFloat(pos[0]);
 		this.glass_center_y = parseFloat(pos[1]);
 		this.glass_angle = parseFloat(this.cameraConf.general.angle);
 		
 		var self = this;
 		this._rpc({
            model: 'padtool.pad',
            method: 'read',
            args: [this.active_id, ['content','mainMark_attachment_id','subMark_attachment_id','x_SubmarkSize']]
        })
        .then(function (data) {
        	if(data.length && data[0].content){
        		self._getMarkImage(data);
        		self.jsonpad = JSON.parse(data[0].content);
        		self.submarkSize = _.map(data[0].x_SubmarkSize, function(str){ return parseInt(str); });
        	}
        	else{
        		self.jsonpad = new Array();
        		self.submarkSize = [500,500];
        	}
        		
        	self._drawPad();
        },function(){
        	self.jsonpad = new Array();
        	self._drawPad();
        });
     },
});

core.action_registry.add('padtool.panelmap', Panelmap);


return Panelmap;

});