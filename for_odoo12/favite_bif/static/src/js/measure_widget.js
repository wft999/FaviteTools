odoo.define('favite_bif.MeasureWidgetInfo', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');
var dialogs = require('web.view_dialogs');

var Widget = require('web.Widget');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');


var QWeb = core.qweb;
var _t = core._t;

var WidgetMark = Widget.extend({
	template: 'favite_measure.info_mark',
    events: {
    	'change input': '_onDataChange',
    	
    },
    
    _onDataChange: function(e){
    	var name = $(e.currentTarget).attr('name');
    	this.geo[this.curPolyline.type].objs[this.obj_id][name] = $(e.currentTarget)[0].value;
    	
    	this.trigger_up('field_changed', {
            dataPointID: this.getParent().getParent().state.id,
            changes:{geo:this.geo},
            noundo:true
        });
    },

    init: function(parent,curPolyline, geo,obj_id,readonly){
    	this.geo = geo;
    	this.obj_id = obj_id;
    	this.curPolyline = curPolyline;
    	this.readonly = readonly;

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
        	self.$( "input" ).prop( "disabled", self.readonly );
        	self.$('input[name="regionindex"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['regionindex'] || 0;
        	self.$('input[name="mark_size_x"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['mark_size_x'] || 0;
        	self.$('input[name="mark_size_y"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['mark_size_y'] || 0;
        	self.$('input[name="mark_thresholdrate"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['mark_thresholdrate'] || 0.95;
        	self.$('input[name="brim_index"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['brim_index'] || 0;
        	self.$('input[name="brim_threshold"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['brim_threshold'] || 10;
        	return $.when();
        });
    },
});

var WidgetFilm = Widget.extend({
	template: 'favite_measure.info_film',
    events: {
    	'change input': '_onDataChange',
    	'change select': '_onDataChange',
    },
    
    _onDataChange: function(e){
    	var name = $(e.currentTarget).attr('name');
    	this.geo[this.curPolyline.type].objs[this.obj_id][name] = $(e.currentTarget)[0].value;
    	
    	this.trigger_up('field_changed', {
            dataPointID: this.getParent().getParent().state.id,
            changes:{geo:this.geo},
            noundo:true
        });
    },

    init: function(parent,curPolyline, geo,obj_id,readonly){
    	this.geo = geo;
    	this.obj_id = obj_id;
    	this.curPolyline = curPolyline;
    	this.readonly = readonly;

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
        	self.$( "input" ).prop( "disabled", self.readonly );
        	self.$( "select" ).prop( "disabled", self.readonly );
        	self.$('input[name="regionindex"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['regionindex'] || 0;
        	self.$('select[name="line_direction"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['line_direction'] || 0;
        	self.$('input[name="line_index"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['line_index'] || 0;
        	self.$('input[name="line_threshold"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['line_threshold'] || 10;
        	self.$('input[name="brim_index"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['brim_index'] || 0;
        	self.$('input[name="brim_threshold"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['brim_threshold'] || 10;
        	return $.when();
        });
    },
});

var WidgetInfo = Widget.extend({
	template: 'favite_measure.info',
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
    	if(!this.getParent())
    		return;
    	
    	var self = this;
    	self.geo = {};
    	$.extend(true,self.geo,this.getParent().state.data.geo);
    },

    _onMapSelectChange:function(src){
    	if(this.getParent() !== src.getParent())
    		return
    		
    	var readonly = this.getParent().mode == 'readonly'
    	var curPolyline = src.map.curPolyline;
    	
    	this.geo = {};
    	$.extend(true,this.geo,this.getParent().state.data.geo);
    	
    	this.widget_info && this.widget_info.destroy();
    	this.widget_info = null;
    	this.$('.measure_info').empty();
    	if(curPolyline){
    		var oid = _.findIndex(this.geo[curPolyline.type].objs,o=>{return _.isEqual(o.points,curPolyline.obj.points)});
    		if(curPolyline.type == 'mark_region'){
    			this.widget_info = new WidgetMark(this, curPolyline,this.geo,oid,readonly);
    			this.widget_info.appendTo('.measure_info');
    		}else if(curPolyline.type == 'film_region'){
    			this.widget_info = new WidgetFilm(this, curPolyline,this.geo,oid,readonly);
    			this.widget_info.appendTo('.measure_info');
    		}
    	}
    },
    
});

widgetRegistry.add('subview_favite_bif_measure_info', WidgetInfo);
return WidgetInfo;

});


odoo.define('favite_bif.MeasureWidgetMap', function (require) {
	"use strict";

	var core = require('web.core');
	var Dialog = require('web.Dialog');


	var framework = require('web.framework');
	var widgetRegistry = require('web.widget_registry');

	var QWeb = core.qweb;
	var _t = core._t;


	var WidgetMap = {
	    
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

	    
	    
	};

	return WidgetMap;

	});



odoo.define('favite_bif.MeasureWidgetMapRaw', function (require) {
	"use strict";

	var core = require('web.core');
	var Dialog = require('web.Dialog');

	var WidgetMap = require('favite_bif.MeasureWidgetMap');
	var Raw = require('favite_common.WidgetMapRaw');
	var framework = require('web.framework');
	var widgetRegistry = require('web.widget_registry');

	var QWeb = core.qweb;
	var _t = core._t;


	var WidgetMapRaw = Raw.extend(WidgetMap,{
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
	    
	});


	widgetRegistry.add('subview_favite_bif_measure_raw', WidgetMapRaw);

	});


odoo.define('favite_bif.MeasureWidgetMapThumb', function (require) {
	"use strict";

	var core = require('web.core');
	var Dialog = require('web.Dialog');
	var widgetRegistry = require('web.widget_registry');

	var WidgetMap = require('favite_bif.MeasureWidgetMap');
	var Thumb = require('favite_common.WidgetMapThumb');
	var framework = require('web.framework');

	var QWeb = core.qweb;
	var _t = core._t;


	var WidgetMapThumb = Thumb.extend(WidgetMap,{
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
	        	return $.when();
	        });
	    },
	    
	    
	    
	});

	widgetRegistry.add('subview_favite_bif_measure_thumb', WidgetMapThumb);
	return WidgetMapThumb;

	});