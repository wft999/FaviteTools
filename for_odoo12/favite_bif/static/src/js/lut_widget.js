odoo.define('favite_bif.LutWidgetInfo', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');
var dialogs = require('web.view_dialogs');

var Widget = require('web.Widget');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');


var QWeb = core.qweb;
var _t = core._t;


var WidgetInfo = Widget.extend({
	template: 'favite_bif.info',
    events: {

    },

    init: function(){
    	this.fold = false;
    	this.widget_info = null;
    	
    	
        return this._super.apply(this, arguments);
    },
   
   
    willStart: function () {
    	var self = this;
        return this._super.apply(this, arguments).then(function () {
        	self.geo = {};
        	$.extend(true,self.geo,self.getParent().state.data.geo);
            return $.when();
        });
    },
    
    start: function () {
        var self = this;
        return this._super.apply(this, arguments).then(function () {
        	core.bus.on('map_select_change', self, self._onMapSelectChange);
        	
        	return $.when();
        });
    },
    
    updateState: function(state){
    	var self = this;
    	self.geo = {};
    	$.extend(true,self.geo,this.getParent().state.data.geo);
    },

    _onMapSelectChange:function(curPolyline){

    },
    
});

//widgetRegistry.add('subview_favite_bif_lut_info', WidgetInfo);
return WidgetInfo;

});

odoo.define('favite_bif.LutWidgetMapRaw', function (require) {
	"use strict";

	var core = require('web.core');
	var Dialog = require('web.Dialog');

	var Raw = require('favite_common.WidgetMapRaw');
	var framework = require('web.framework');
	var widgetRegistry = require('web.widget_registry');
	var Coordinate = require('favite_common.coordinate');
	var QWeb = core.qweb;
	var _t = core._t;


	var WidgetMapRaw = Raw.extend({
	    events: {
//	        'keydown.canvas-map': '_onKeydown'
	    },

	    init: function(){
	    	this.offset = {x:0,y:0};
	    	this.ratio = {x:1,y:1};
	    	this.map_type = "raw";
	        return this._super.apply(this, arguments);
	    },
	   
	    willStart: function () {
	    	var self = this;
	        return this._super.apply(this, arguments).then(function () {
	            return $.when();
	        });
	    },
	    
	    start: function () {
	        var self = this;
	        return this._super.apply(this, arguments).then(function () {
	        	return $.when();
	        });
	    },
	    

	    
	    showMap: function(){
	    	var self = this;
	    	var data = this.getParent().state.data;
	    	var dim = {width:self.$('.oe_content').width(),height:self.$('.oe_content').height()};
	    	
	    	if(self.map){
	    		this.map.clear();
	    	}else{
	    		var dim = {width:self.$('.oe_content').width(),height:self.$('.oe_content').height()};
	        	self.map  = new fabric.Canvas(self.$el.find('canvas')[0],{hoverCursor:'default',stopContextMenu:true});
	    		
	    		self.map.setDimensions(dim);
	    		self.map.on('mouse:move',self._onMouseMove.bind(self));    		
				self.map.on('mouse:out', self._onMouseOut.bind(self));  
				self.map.on('mouse:up', self._onMouseUp.bind(self));
				self.map.on('mouse:down',self._onMouseDown.bind(self));
				self.map.on('mouse:wheel',self._onMouseWheel.bind(self));
				
				self.map.on('object:moving',_.debounce(self._onObjectMoving.bind(self), 100));
				self.map.on('object:moved',self._onObjectMoved.bind(self));
				self.map.on('selection:updated',self._onObjectSelect.bind(self));
				self.map.on('selection:created',self._onObjectSelect.bind(self));
				
				self.map.polylines = [];
	    	}
	    	
	    	var strBlocks = JSON.stringify(this.hawkeyeObj.blocks);
	    	var first_block = this.hawkeyeObj.blocks[0][0];
			var last_block = this.hawkeyeObj.blocks[this.hawkeyeObj.blocks.length-1][this.hawkeyeObj.blocks[0].length-1];
			var imgWidth = _.reduce(this.hawkeyeObj.blocks, function(memo, block){ 
	    		return memo + (block[0]&&block[0].bHasIntersection?block[0].iInterSectionWidth:0); 
	    		}, 0);
	    	var imgHeight = _.reduce(this.hawkeyeObj.blocks[0], function(memo, block){ 
	    		return memo  + (block&&block.bHasIntersection?block.iInterSectionHeight:0); 
	    		}, 0);
			
			this.size = {x:imgWidth,y:imgHeight};
			this.offset = {
					x:first_block.iRange_Left + first_block.iInterSectionStartX,
					y:first_block.iRange_Bottom + first_block.iInterSectionStartY
					};
			
			if(self.coord){
				delete self.coord;
			}
			
			var dMapRatioX = self.ratio.x;
	    	var dMapRatioY = self.ratio.y;
	    	var dMapLeft = self.offset.x;
	    	var dMapBottom = self.offset.y;
	    	self.coord = new Coordinate(self.cameraConf,dMapRatioX,dMapRatioY,dMapLeft,dMapBottom);
	    	
	    	var image = new fabric.Image();
	    	var id = data.gmd_id ? data.gmd_id.res_id : data.id;
	    	var x1 = data.geo.controlpoint[0].x;
	    	var y1 = data.geo.controlpoint[0].y;
	    	var controlpoint = this.id == 'info' ? ('/p'+x1+'X'+y1) : '';
	    	image.setSrc('/gmd/'+id+'/image'+imgWidth+'X'+imgHeight+controlpoint+'?strBlocks='+strBlocks, function(img) {
	    		if(img.width == 0 || img.height == 0){
	    			self.do_warn(_t('Incorrect Operation'),_t('Image is not exsit!'),false);
	    			return;
	    		}
	        	if(self.image !== undefined)
	        		delete self.image;

	    		self.image = img;
	    		self.map.add(img);
	    		var p = self._geo2map(self.hawkeyeObj.point);
				self.map.viewportTransform[4] = (-p.x + dim.width/2)*self.map.getZoom();
			    self.map.viewportTransform[5] = (-p.y + dim.height/2)*self.map.getZoom();
			    
			    self.map.requestRenderAll();
	        });
	    },
	    
	});


	widgetRegistry.add('subview_favite_bif_lut_raw', WidgetMapRaw);
	widgetRegistry.add('subview_favite_bif_lut_info', WidgetMapRaw);

});


odoo.define('favite_bif.LutWidgetMapThumb', function (require) {
	"use strict";

	var core = require('web.core');
	var Dialog = require('web.Dialog');
	var widgetRegistry = require('web.widget_registry');

	var Thumb = require('favite_common.WidgetMapThumb');
	var framework = require('web.framework');

	var QWeb = core.qweb;
	var _t = core._t;

	var WidgetMapThumb = Thumb.extend({
	    events: {
//	        'keydown.canvas-map': '_onKeydown'
	    },

	    init: function(){
	    	
	    	this.map_type = "thumb";

	        return this._super.apply(this, arguments);
	    },
	   
	    willStart: function () {
	    	var self = this;
	        return this._super.apply(this, arguments).then(function () {
	            return self.LoadGlassMap();
	        });
	    },
	    
	    start: function () {
	        var self = this;
	        return this._super.apply(this, arguments).then(function () {
	        	self.showMap();
	    		self._drawHawk();
	    		self._drawCorner();
	    		self._drawLut();
	        	return $.when();
	        });
	    },
	    
/*	    resetMap(){
	    	var self = this;
	    	var dim = {width:self.$('.oe_content').width(),height:self.$('.oe_content').height()};
	    	
	    	var zoom = Math.min(dim.width/256,dim.height/256);
			self.map.setDimensions(dim);
			self.map.setZoom(zoom);
	    },*/
	    
	    updateState: function(state){
	    	var self = this;
	    	if(!this.getParent())
	    		return;
	    	
	    	this.geo = {};
	    	$.extend(true,this.geo,this.getParent().state.data.geo);
	    	
	        this.line.path[1][1] = this.geo.controlpoint[0].x;
	        this.line.path[1][2] = this.geo.controlpoint[0].y;
	    	
	        this.p1.left = this.geo.controlpoint[0].x;
	        this.p1.top = this.geo.controlpoint[0].y;
	        this.p1.setCoords();
	    },
	    
	    makeCurvePoint: function (left, top, line1, line2, line3) {
	        var c = new fabric.Circle({
	          left: left,
	          top: top,
	          strokeWidth: 6,
	          radius: 28,
	          fill: '#fff',
	          stroke: '#666',
	          hoverCursor:"move",
	        });

	        c.hasBorders = c.hasControls = false;

	        c.line1 = line1;
	        c.line2 = line2;
	        c.line3 = line3;

	        return c;
	      },
	      
	    _onObjectMoved: function(opt){
	    	if(opt.target.type == "circle"){
	    		var p = this.getParent();
	    		if(p.mode == 'edit'){
	    			if(opt.target.name == 'p1'){
		    			opt.target.line2.path[1][1] = Math.round(opt.target.left);
			    		opt.target.line2.path[1][2] = Math.round(opt.target.top);
			    		
			    		this.geo.controlpoint[0].x = Math.round(opt.target.left);
			    		this.geo.controlpoint[0].y = Math.round(opt.target.top);
		    		}else{
		    			opt.target.line2.path[1][3] = Math.round(opt.target.left);
			    		opt.target.line2.path[1][4] = Math.round(opt.target.top);
			    		
			    		this.geo.controlpoint[1].x = Math.round(opt.target.left);
			    		this.geo.controlpoint[1].y = Math.round(opt.target.top);
		    		}
	    			
	    			//this.geo.no_render_map = true;
	    	    	this.trigger_up('field_changed', {
	    	            dataPointID: this.getParent().state.id,
	    	            changes:{geo:this.geo},
	    	        });
	    	    	
	    	    	this._changeHawkeye({x:this.hawkeye.left,y:this.hawkeye.top});
	    		}else{
	    			if(opt.target.name == 'p1'){
		    			opt.target.left = opt.target.line2.path[1][1];
			    		opt.target.top = opt.target.line2.path[1][2];
		    		}else{
		    			opt.target.left = opt.target.line2.path[1][3];
			    		opt.target.top = opt.target.line2.path[1][4];
		    		}
	    			opt.target.setCoords();
	    		}
	    		
	    	}
	    	return this._super.apply(this, arguments)
	    },
	    
	    _drawLut: function(){
	    	var line = new fabric.Path('M 0 0 Q 100, 100, 256, 256', { 
	    		fill: '', 
	    		stroke: 'blue', 
	    		strokeWidth:10,
	    		objectCaching: false,
	    		});

	        line.path[0][1] = 0;
	        line.path[0][2] = 0;

	        line.path[1][1] = this.geo.controlpoint[0].x;
	        line.path[1][2] = this.geo.controlpoint[0].y;
	        
	    	line.path[1][3] = 2048;
	        line.path[1][4] = 2048;

	        line.selectable = false;
	        this.map.add(line);
	        this.line = line;
	        
	        this.p1 = this.makeCurvePoint(line.path[1][1], line.path[1][2], null, line, null)
	        this.p1.name = "p1";
	        this.map.add(this.p1);
	    }
	    
	});

	widgetRegistry.add('subview_favite_bif_lut_thumb', WidgetMapThumb);
	return WidgetMapThumb;

	});