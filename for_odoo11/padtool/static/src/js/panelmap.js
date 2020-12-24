odoo.define('padtool.Panelmap', function (require) {
"use strict";

var ControlPanelMixin = require('web.ControlPanelMixin');
var core = require('web.core');
var Dialog = require('web.Dialog');
var framework = require('web.framework');

var Map = require('padtool.Map');
var Mycanvas = require('padtool.Canvas');
var Hawkmap = require('padtool.Hawkmap');
var Coordinate = require('padtool.coordinate');
var Submark = require('padtool.submark');


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
                	self.src = '/glassdata/'+ self.glassName +'/'+ self.panelName +'/' + self.padConf[self.panelName].panel_map
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
    



  //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
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
    	
    	this.$buttons.find('.fa-gear').toggleClass('o_hidden', this.pad.curType !== 'frame' && this.pad.curType !== 'pframe'&& this.pad.curType !== 'inspectZone');
    },
    
    showObj:function(obj){
		if(obj.pad){
			obj.visible = obj.pad.padType == this.pad.curType 
			|| (obj.pad.padType == 'region' && this.pad.curType == 'frame') 
			|| ((obj.pad.padType == 'inspectZone'||obj.pad.padType == 'unregularInspectZone') && this.pad.curType == 'uninspectZone')
			|| ((obj.pad.padType == 'uninspectZone'||obj.pad.padType == 'unregularInspectZone') && this.pad.curType == 'inspectZone')
			|| ((obj.pad.padType == 'uninspectZone'||obj.pad.padType == 'inspectZone') && this.pad.curType == 'unregularInspectZone')
			|| obj.pad.padType == 'inspectZoneFrame';
			if(obj.type == 'cross'){
				obj.visible = this.pad.curType == 'frame' && obj.pad.padType == 'frame' && this.map.hoverCursor == 'default';
			}
		}
		
	},
    
    _onButtonSelectObject:function(e){
    	var self = this;
    	
    	if(e.currentTarget.children[0].text != 'Save'){
    		if(e.currentTarget.children[0].text == 'subMark'){
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
    	}
    	
    	this._super.apply(this, arguments);
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
    		if(obj.padType == 'inspectZoneFrame')
    			return;
    		if(obj.padType == 'frame-goa')
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
    			o.period0 = obj.period0 || 0;
 				o.period1 = obj.period1 || 0;
 				o.angle0 = obj.angle0 || 0;
 				o.angle1 = obj.angle1 || 0;
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
    	}else if(this.pad.curType === 'pframe'){
    		this._drawPRegion();
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
            	var $span = self.getParent().getParent().$('span.ipscan');
            	$span.html("ip:"+iIP+",scan:"+iScan);
            });
        });
        this.dialog.open();
    },    
    
    _onButtonSetting: function(){
    	if(this.pad.curType == 'frame' || this.pad.curType == 'pframe'){
    		this._onButtonSettingRegion();
    	}else if(this.pad.curType == 'inspectZone'){
    		this._onButtonSettingInspect();
    	}
    	
    },
    
    _onButtonSettingInspect: function(){
    	var unselected = _.every(this.map.pads,p => (!p.selected) || p.padType != 'inspectZone');
    	if(unselected){
    		this.do_warn(_t('Operation Result'),_t("Please select inspectZone first !"),false);
    		return;
    	}
    	
    	var self = this;
        var $content = $(QWeb.render("SetInspectDialog"));
            
        this.dialog = new Dialog(this, {
        	title: _t('Inspect'),
        	size: 'medium',
        	$content: $content,
        	buttons: [{text: _t('Confirm'), classes: 'btn-primary', close: true, click: function(){
        		var tolerancex = parseInt(this.$content.find('#tolerancex').val());
            	var tolerancey = parseInt(this.$content.find('#tolerancey').val());
            	var periodx = parseInt(this.$content.find('#periodx').val());
            	var periody = parseInt(this.$content.find('#periody').val());
            	
            	_.each(self.map.pads, function(p){
            		if(p.selected && p.padType == 'inspectZone'){
            			p.toleranceX = tolerancex;
                		p.toleranceY = tolerancey;
                		p.periodX = periodx;
                		p.periodY = periody;
            		}
            	});
            	
            	self.pad.isModified = true;

        	}},
        		{text: _t('Discard'), close: true}],
        });
        this.dialog.opened().then(function () {
        	var pad = _.find(self.map.pads,p => p.selected && p.padType == 'inspectZone');
            self.dialog.$('#tolerancex').val(pad.toleranceX||10);
            self.dialog.$('#tolerancey').val(pad.toleranceY||10);
            self.dialog.$('#periodx').val(pad.periodX||0);
            self.dialog.$('#periody').val(pad.periodY||0);
        });
        this.dialog.open();
    },
    
    _onButtonSettingRegion: function(){
    	var unselected = _.every(this.map.pads,p => (!p.selected) || p.padType != 'region');
    	if(unselected){
    		this.do_warn(_t('Operation Result'),_t("Please select region first !"),false);
    		return;
    	}
    	
    	var self = this;
        var $content = $(QWeb.render("SetRegionDialog"));
            
        this.dialog = new Dialog(this, {
        	title: _t('Region'),
        	size: 'medium',
        	$content: $content,
        	buttons: [{text: _t('Confirm'), classes: 'btn-primary', close: true, click: function(){
        		var periodx0 = parseFloat(this.$content.find('#periodx0').val());
            	var periody0 = parseFloat(this.$content.find('#periody0').val());
            	var periodx1 = parseFloat(this.$content.find('#periodx1').val());
            	var periody1 = parseFloat(this.$content.find('#periody1').val());
            	
            	var angle0,period0,angle1,period1;
            	if(periody0 == 0){
        			angle0 = Math.Pi / 2.0;
        			period0 = periodx0;
        		}else if(periodx0 == 0){
        			angle0 = 0;
        			period0 = periody0;
        		}else{
        			angle0 = Math.atan(periody0/periodx0);
        			period0 = periodx0 / Math.cos(angle0);
        		}
            	
            	if(periody1 == 0){
        			angle1 = 0;
        			period1 = periodx1;
        		}else if(periodx1 == 0){
        			angle1 = Math.PI / 2.0;
        			period1 = periody1;
        		}else{
        			angle1 = Math.atan(periody1/periodx1);
        			period1 = periodx1 / Math.cos(angle1);
        		}
            	
            	_.each(self.map.pads, function(p){
            		if(p.selected && p.padType == 'region'){
            			p.period0 = period0;
                		p.period1 = period1;
                		p.angle0 = angle0;
                		p.angle1 = angle1;
            		}
            	});
            	
            	self.pad.isModified = true;

        	}},
        		{text: _t('Discard'), close: true}],
        });
        this.dialog.opened().then(function () {
        	var pad = _.find(self.map.pads,p => p.selected && p.padType == 'region');
        	
            var periodx0 = (pad.period0 || 0) * Math.cos(pad.angle0 || 0);
            self.dialog.$('#periodx0').val(periodx0.toFixed(2));
            var periody0 = (pad.period0 || 0) * Math.sin(pad.angle0 || 0);
            self.dialog.$('#periody0').val(periody0.toFixed(2));
            
            var periodx1 = (pad.period1 || 0) * Math.cos(pad.angle1 || 0);
            self.dialog.$('#periodx1').val(periodx1.toFixed(2));
            var periody1 = (pad.period1 || 0) * Math.sin(pad.angle1 || 0);
            self.dialog.$('#periody1').val(periody1.toFixed(2));
            
            
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
    
    _onButtonResetImageCache: function(){
    	var self = this;
    	this._rpc({route: '/padtool/restimagecahe'}).then(function (data) {
    		self.do_notify(_t('Operation Result'),_t('Image cache has reset!'),false);
        });
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
    	this.$buttons.on('click', '.fa-recycle',this._onButtonResetImageCache.bind(this) );
    	this.$buttons.on('click', '.fa-gear',this._onButtonSetting.bind(this) );
    	
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
        		self.submarkSize = [1000,1000];
        	}
        		
        	self._drawPad();
        },function(){
        	self.jsonpad = new Array();
        	self._drawPad();
        });
     },
     
     
     
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
      
	_onObjectMoved: function(opt){
    	 if(opt.target.type == "hawkeye"){
     		this.hawkmap.showImage();
     		this.isObjectMoved = true;
     	}else if(opt.target.type == "cross"){
     		this.isObjectMoved = true;
     		if(opt.target.mouseMove()){
     			opt.target.pad.points[opt.target.id].x = opt.target.left;
     			opt.target.pad.points[opt.target.id].y = opt.target.top;
    
     			let {dOutputX:ux, dOutputY:uy} = this.coordinate.PanelMapCoordinateToUMCoordinate(opt.target.left,this.image.height-opt.target.top);
     			opt.target.pad.points[opt.target.id].ux = ux;
				opt.target.pad.points[opt.target.id].uy = uy;

				this._drawRegion();
				
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
 			
 			let {dOutputX:ux, dOutputY:uy} = this.coordinate.PanelMapCoordinateToUMCoordinate(x/zoom,this.image.height- y/zoom);
 			let {iIP, iScan} = this.coordinate.JudgeIPScan_UM(ux,uy);
 			let {dCustomerPointX:cx, dCustomerPointY:cy} = this.coordinate.UmCoordinateToCustomerCoordinate(ux,uy);
 			
 			$(".map-info").text("IP("+iIP+") Scan("+iScan+") image("+Math.round(x/zoom)+","+Math.round(y/zoom)+") window("+x+","+y+") um("+Math.round(ux)+','+Math.round(uy) + ") Customer("+Math.round(cx)+","+Math.round(cy)+")");

 		}
 		
 		
     	opt.e.stopPropagation();
         opt.e.preventDefault();	
 	},
 	
    _drawSubMark:function(){
 		var res = _.partition(this.map.pads, function(obj){
 			return obj.padType == 'subMark' && obj.points.length <= 2;
 		});
 		this.map.pads = res[1];
 		res[0].forEach(function(obj){
 			obj.clear();
 		});
 		
 		var dMarkWidth = this.submarkSize[0] ,dMarkHeight = this.submarkSize[1];
 		
 		var submark = new Submark(this);
 		var {dPanelLeft,dPanelBottom,dPanelRight,dPanelTop} = submark.getPanelPara();
 		if(this.isPolygonSubMark){
 			_.each(this.map.pads,function(obj){submark.getPlygonSubMark(obj,dMarkWidth,dMarkHeight);});
 		}
 		else
 			submark.pMarkRegionArray = submark.getNormalSubMark(dPanelLeft,dPanelBottom,dPanelRight,dPanelTop,dMarkWidth,dMarkHeight);
 		
 		for(var i = 0; i < submark.pMarkRegionArray.length; i++){
 			var width = submark.pMarkRegionArray[i].dMarkWidth ;
 			var height = submark.pMarkRegionArray[i].dMarkHeight;
 			
 			var rect = new Mycanvas.MyPolyline(this.map,'subMark');
 			
 			var ux = submark.pMarkRegionArray[i].dPositionX- width/2;
			var uy = submark.pMarkRegionArray[i].dPositionY+ height/2;
 			var tmp = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
    		rect.points.push({
    			x:tmp.dOutputX, 
    			y:this.image.height - tmp.dOutputY,
    			ux,
    			uy
    		});
    		
    		ux = submark.pMarkRegionArray[i].dPositionX+ width/2;
			uy = submark.pMarkRegionArray[i].dPositionY- height/2;
    		tmp = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
			rect.points.push({
				x:tmp.dOutputX, 
				y:this.image.height - tmp.dOutputY,
				ux,
				uy
			});
			rect.update();
			
			rect.iMarkDirectionType = submark.pMarkRegionArray[i].iMarkDirectionType;

 			var uLeft = submark.pMarkRegionArray[i].dPositionX - submark.pMarkRegionArray[i].dMarkWidth/2;
 			var uRight = submark.pMarkRegionArray[i].dPositionX + submark.pMarkRegionArray[i].dMarkWidth/2;
 			var uTop = submark.pMarkRegionArray[i].dPositionY + submark.pMarkRegionArray[i].dMarkHeight/2;
 			var uBottom = submark.pMarkRegionArray[i].dPositionY - submark.pMarkRegionArray[i].dMarkHeight/2;
 			
 			this.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(uLeft,uBottom,uRight,uTop,true);
 			rect.blocks = _.map(this.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0],function(item){
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
 		}
 		this.pad.isModified = true;
 		this.pad.isSubMarkModified = true;
 		this.do_notify(_t('Operation Result'),_t('SubMark has refreshed!'),false);
 	},
 	
 	
 	_drawPad:function(){ 
 		var self = this;
 		this.isPolygonSubMark = false;
 		this.innerFrame = null;
 		this.outerFrame = null;
 		var hasRegion = false;
 			
 		this.jsonpad.objs && this.jsonpad.objs.forEach(function(pad){
 			var obj;
 			if(pad.padType == 'inspectZoneFrame')
 				return;
 			
 			obj = new Mycanvas.MyPolyline(self.map,pad.padType);
 			obj = _.extend(obj, pad);
 			for(var i = 0; i < obj.points.length; i++){
 				if(obj.points[i].x === undefined && obj.points[i].ux !== undefined){
 					var out = self.coordinate.UMCoordinateToPanelMapCoordinate(obj.points[i].ux,obj.points[i].uy);
 					obj.points[i].x = out.dOutputX;
 					obj.points[i].y = self.image.height - out.dOutputY;
 				}else if(obj.points[i].x !== undefined && obj.points[i].ux === undefined){
 					var out = self.coordinate.PanelMapCoordinateToUMCoordinate(obj.points[i].x,self.image.height-obj.points[i].y);
 					obj.points[i].ux = out.dOutputX;
 					obj.points[i].uy = out.dOutputY;
 				}
 			}
 			obj.update();
 			
 			if(pad.padType == 'frame'){
 		 		if(self.innerFrame == null)
 		 			self.innerFrame = obj;
 		 		else if(self.outerFrame == null)
 		 			self.outerFrame = obj;
 			}else if(pad.padType == 'region'){
 				hasRegion = true;
 				obj.period0 = obj.period0 || 0;
 				obj.period1 = obj.period1 || 0;
 				obj.angle0 = obj.angle0 || 0;
 				obj.angle1 = obj.angle1 || 0;
 			}else if(pad.padType == 'subMark'){
 				if(obj.points.length == 2 && pad.blocks === undefined){
 					var ux1 = obj.points[0].ux;
 					var uy1 = obj.points[0].uy;
 					var ux2 = obj.points[1].ux;
 					var uy2 = obj.points[1].uy;
 					self.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(Math.min(ux1,ux2),Math.min(uy1,uy2),Math.max(ux1,ux2),Math.max(uy1,uy2),true);
 					if(self.tmpCoordinate.bmpBlockMapPara.m_BlockMap.length == 1){
 						obj.blocks = _.map(self.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0],function(item){
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
 		    			
 		    			self.pad.isModified = true;
 		    			self.pad.isSubMarkModified = true;
 					}
 				}else if(obj.points.length > 2){
 					self.isPolygonSubMark = true;
 					self.$buttons.find('.submask-checkbox-label > input')[0].checked = true;
 				}
 			}else if(pad.padType == 'mainMark'){
 				if(pad.blocks === undefined){
 					var ux1 = obj.points[0].ux;
 					var uy1 = obj.points[0].uy;
 					var ux2 = obj.points[1].ux;
 					var uy2 = obj.points[1].uy;
 					self.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(Math.min(ux1,ux2),Math.min(uy1,uy2),Math.max(ux1,ux2),Math.max(uy1,uy2),true);
 					if(self.tmpCoordinate.bmpBlockMapPara.m_BlockMap.length == 1){
 						obj.blocks = _.map(self.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0],function(item){
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
 		    			
 		    			self.pad.isModified = true;
 		    			self.pad.isMainMarkModified = true;
 					}
 				}
 			}
 				
 		})
 		
 		if(this.innerFrame == null || this.outerFrame == null){
 			this.innerFrame = new Mycanvas.MyPolyline(this.map,'frame');
 			let {dOutputX:ux,dOutputY:uy} = this.coordinate.PanelMapCoordinateToUMCoordinate(500,500);
 			this.innerFrame.points.push({x:500,y:this.image.height-500,ux,uy});
 			let {dOutputX:ux2,dOutputY:uy2} = this.coordinate.PanelMapCoordinateToUMCoordinate(this.image.width-500,this.image.height-500);
 			this.innerFrame.points.push({x:this.image.width-500,y:500,ux:ux2,uy:uy2});
 			this.innerFrame.update();

 			this.outerFrame = new Mycanvas.MyPolyline(this.map,this.pad.curType);
			let {dOutputX:ux3,dOutputY:uy3} = this.coordinate.PanelMapCoordinateToUMCoordinate(300,300);
			this.outerFrame.points.push({x:300,y:this.image.height-300,ux:ux3,uy:uy3});
			let {dOutputX:ux4,dOutputY:uy4} = this.coordinate.PanelMapCoordinateToUMCoordinate(this.image.width-300,this.image.height-300);
			this.outerFrame.points.push({x:this.image.width-300,y:300,ux:ux4,uy:uy4});
			this.outerFrame.update();
			
			this._drawRegion();
			hasRegion = true;
		}
 		
 		if(!hasRegion)
 			this._drawRegion();
 		
 		this._drawInspectZone();

 		this.innerFrame.crosses[0].bringToFront();
 		this.innerFrame.crosses[1].bringToFront();
 		this.outerFrame.crosses[0].bringToFront();
 		this.outerFrame.crosses[1].bringToFront();
 		
 		this.innerFrame.crosses[0].outer = [this.outerFrame.crosses[0],this.outerFrame.crosses[1]];
 		this.innerFrame.crosses[1].outer = [this.outerFrame.crosses[0],this.outerFrame.crosses[1]];
 		
 		this.outerFrame.crosses[0].inner = [this.innerFrame.crosses[0],this.innerFrame.crosses[1]];
 		this.outerFrame.crosses[1].inner = [this.innerFrame.crosses[0],this.innerFrame.crosses[1]];

    	this.map.forEachObject(this.showObj.bind(this));

		this.map.discardActiveObject();
		this.map.renderAll();

     },
     
 	 _drawPRegion: function(){
 		var self = this;
 		
 		var frames = _.filter(this.map.pads,obj=>obj.padType == 'pframe' && obj.points.length > 2);
 		if(frames.length < 2){
 			self.do_warn(_t('Operation Result'),_t('The number of polygon must be 2!'),false);
 			return;
 		}
 		
 		var f0,f1;
 		if(_.every(frames[0].points,p => frames[1].containsPoint(p))){
 			f0 = frames[0];
 			f1 = frames[1];
 		}else if(_.every(frames[1].points,p => frames[0].containsPoint(p))){
 			f0 = frames[1];
 			f1 = frames[0];
 		}else{
 			self.do_warn(_t('Operation Result'),_t('The polygons are incorrect!'),false);
 			return;
 		}
 		
  		var res = _.partition(this.map.pads, function(obj){
  			return obj.padType == 'region';
  		});
  		this.map.pads = res[1];
  		res[0].forEach(function(obj){
  			obj.clear();
  		})
  		
  		var points = {x1:[],y1:[],x2:[],y2:[]};
  		f0.points.forEach(function(p){
    		points.x1.push(Math.round(p.ux));
    		points.y1.push(Math.round(p.uy));
    	});
  		f1.points.forEach(function(p){
    		points.x2.push(Math.round(p.ux));
    		points.y2.push(Math.round(p.uy));
    	});
    	var strPoints = JSON.stringify(points);
    	var dResolutionX = this.coordinate.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionX;
    	var dResolutionY = this.coordinate.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionY;
  		
  		framework.blockUI();
    	this._rpc({model: 'padtool.pad',method: 'search_pframe',args: [strPoints,dResolutionX,dResolutionY],})
        .then(function(res) {
        	framework.unblockUI();
        	if(res.result){
        		var buf = res.buf.substring(0,res.buf.indexOf(']')+1);
        		var regions = eval(buf);
        		regions.forEach(function(r){
        			var x,y,ux,uy,obj; 
        			
        			obj = new Mycanvas.MyPolyline(self.map,"region");
          			obj.iFrameNo = 0;
          			ux = r.l;
          			uy = r.b;
          			let {dOutputX:x1, dOutputY:y1} = self.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
          			obj.points.push({x:x1,y:self.image.height-y1,ux,uy});
          			
          			ux = r.r;
          			uy = r.t;
          			let {dOutputX:x2, dOutputY:y2} = self.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
          			obj.points.push({x:x2,y:self.image.height-y2,ux,uy});
          			obj.update();
        		})
        		self.pad.isModified = true;
                self.do_notify(_t('Operation Result'),_t('The search is success!'),false);
        	}else{
        		self.do_warn(_t('Operation Result'),_t('The search failed!'),false);
        	}
        }).fail(function(){
        	framework.unblockUI();
        	self.do_warn(_t('Operation Result'),_t('The search failed!'),false);
        });
  	   
 		
  	 },     
     

 	 _drawRegion: function(){
 		var x,y,ux,uy,obj; 
 		var innerFrame = this.innerFrame;
 		var outerFrame = this.outerFrame;
 		
 		var res = _.partition(this.map.pads, function(obj){
 			return obj.padType == 'region';
 		});
 		this.map.pads = res[1];
 		res[0].forEach(function(obj){
 			obj.clear();
 		})
 	    
 		 var top = innerFrame.points[1].uy + this.globalConf.region_overlap;
 		 while(true){
 			var bottom = top - this.globalConf.region_height;
 			var nextTop = bottom + this.globalConf.region_overlap;
 			if(bottom < innerFrame.points[0].uy - this.globalConf.region_overlap){
 				bottom = innerFrame.points[0].uy - this.globalConf.region_overlap;
 			}
 			else if((nextTop - this.globalConf.region_height)  < innerFrame.points[0].uy - this.globalConf.region_overlap ){
 				bottom = (top + innerFrame.points[0].uy)/2 - this.globalConf.region_overlap;
 				nextTop = bottom + this.globalConf.region_overlap;
 			}
 			
 			obj = new Mycanvas.MyPolyline(this.map,"region");
 			obj.iFrameNo = 0;
 			ux = outerFrame.points[0].ux;
 			uy = bottom;
 			let {dOutputX:x1, dOutputY:y1} = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
 			obj.points.push({x:x1,y:this.image.height-y1,ux,uy});
 			
 			ux = innerFrame.points[0].ux;
 			uy = top;
 			let {dOutputX:x2, dOutputY:y2} = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
 			obj.points.push({x:x2,y:this.image.height-y2,ux,uy});
 			obj.update();
 			
 			obj = new Mycanvas.MyPolyline(this.map,"region");
 			obj.iFrameNo = 2;
 			ux = innerFrame.points[1].ux;
 			uy = bottom;
 			let {dOutputX:x3, dOutputY:y3} = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
 			obj.points.push({x:x3,y:this.image.height-y3,ux,uy});
 			
 			ux = outerFrame.points[1].ux;
 			uy = top;
 			let {dOutputX:x4, dOutputY:y4} = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
 			obj.points.push({x:x4,y:this.image.height-y4,ux,uy});
 			obj.update();
 			
 			top = nextTop;
 			if(top <= innerFrame.points[0].uy)
 				break;
 		 }
 		 
 		obj = new Mycanvas.MyPolyline(this.map,"region");
		obj.iFrameNo = 1;
 		x = outerFrame.points[0].x;
 		ux = outerFrame.points[0].ux;
		y = outerFrame.points[0].y;
		uy = outerFrame.points[0].uy;
		obj.points.push({x,y,ux,uy});
		
		x = outerFrame.points[1].x;
		ux = outerFrame.points[1].ux;
		y = innerFrame.points[0].y;
		uy = innerFrame.points[0].uy;
		obj.points.push({x,y,ux,uy});
		obj.update();
 		 
 		obj = new Mycanvas.MyPolyline(this.map,"region");
 		obj.iFrameNo = 3;
 		x = outerFrame.points[0].x;
 		ux = outerFrame.points[0].ux;
		y = innerFrame.points[1].y;
		uy = innerFrame.points[1].uy;
		obj.points.push({x,y,ux,uy});
		
		x = outerFrame.points[1].x;
		ux = outerFrame.points[1].ux;
		y = outerFrame.points[1].y;
		uy = outerFrame.points[1].uy;
		obj.points.push({x,y,ux,uy});
		obj.update();
 		 
		this.pad.isModified = true;
 	 },
 	
 	_drawInspectZone: function(){
 		var id = 1;
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
    		
    		var x1 = left * Math.cos(-this.glass_angle) + top * Math.sin(-this.glass_angle)  + this.glass_center_x;
    		var y1 = -left * Math.sin(-this.glass_angle) + top * Math.cos(-this.glass_angle)  + this.glass_center_y;
    		var x2 = right * Math.cos(-this.glass_angle) + bottom * Math.sin(-this.glass_angle)  + this.glass_center_x;
    		var y2 = -right * Math.sin(-this.glass_angle) + bottom * Math.cos(-this.glass_angle) + this.glass_center_y;
    		
    		x1 = x1 - panel_center_x + parseFloat(this.padConf[this.panelName].panel_center_x);
    		y1 = y1 - panel_center_y + parseFloat(this.padConf[this.panelName].panel_center_y);
    		x2 = x2 - panel_center_x + parseFloat(this.padConf[this.panelName].panel_center_x);
    		y2 = y2 - panel_center_y + parseFloat(this.padConf[this.panelName].panel_center_y);
    		
    		var out1 = this.coordinate.UMCoordinateToPanelMapCoordinate(x1,y1)
    		var out2 = this.coordinate.UMCoordinateToPanelMapCoordinate(x2,y2)
    		
/*
    		x1 = out1.dOutputX;
    		y1 = this.image.height - out1.dOutputY;
    		x2 = out2.dOutputX;
    		y2 = this.image.height - out2.dOutputY;
    		var line1 = new Mycanvas.Line([x1,y1,x1,y2],{stroke: 'blue',pad:null});
	 		var line2 = new Mycanvas.Line([x1,y1,x2,y1],{stroke: 'blue',pad:null});
	 		var line3 = new Mycanvas.Line([x2,y2,x2,y1],{stroke: 'blue',pad:null});
	 		var line4 = new Mycanvas.Line([x2,y2,x1,y2],{stroke: 'blue',pad:null});
	 		this.map.add(line1,line2,line3,line4);
	 		
    		this.inspectZoneX1 = x1;
	 		this.inspectZoneY1 = y1;
	 		this.inspectZoneX2 = x2;
	 		this.inspectZoneY2 = y2;*/
    		
    		this.inspectZoneFrame = new Mycanvas.MyPolyline(this.map,'inspectZoneFrame');
    		this.inspectZoneFrame.points.push({x:out1.dOutputX,y:this.image.height - out1.dOutputY,ux:x1,uy:y1});
    		this.inspectZoneFrame.points.push({x:out2.dOutputX,y:this.image.height - out2.dOutputY,ux:x2,uy:y2});
    		this.inspectZoneFrame.update();
    		this.inspectZoneFrame.lines.forEach(function(line){line.visible = true;line.stroke= 'blue'});
	 		
    		break;
 		}
 	},
 	
 	updateForSelect:function(){
    	var self = this; 
    	var first = true;
    	this.map.pads.forEach(function(pad){
    		if(!pad.points.length)
    			return;
    			
			if(pad.padType == self.pad.curType 
					|| (pad.padType == 'region' && self.pad.curType == 'frame') 
					|| (pad.padType == 'region' && self.pad.curType == 'pframe')){
				if(pad.selected){
					pad.lines.forEach(function(line){line.dirty=true;line.stroke = 'red';line.fill='red'});
					if(first){
						//if(pad.crosses[0])
							//pad.crosses[0].visible = true;
						first = false;
					}
				}else{
					pad.lines.forEach(function(line){
						line.dirty=true;
						if(pad.padType == "uninspectZone"){
							line.fill = 'Cyan';
							line.stroke = 'Cyan';
				    	}else if(pad.padType == "unregularInspectZone"){
							line.fill = 'fuchsia';
							line.stroke = 'fuchsia';
				    	}else{
				    		line.stroke = 'yellow';
							line.fill='yellow'
				    	}
						
					});
					//if(pad.crosses[0])
						//pad.crosses[0].visible = false;
				}
			}
		});
    	this.map.renderAll();
 	}
 	
 	
});

core.action_registry.add('padtool.panelmap', Panelmap);


return Panelmap;

});