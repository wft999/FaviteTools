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
    	if(curPolyline){
    		var oid = _.findIndex(this.geo[curPolyline.type].objs,o=>{return _.isEqual(o.points,curPolyline.obj.points)});
    		if(curPolyline.type == 'panel'){
    			//this._openPanel();
    		}
    	}
    },
    
});

widgetRegistry.add('subview_favite_bif_lut_info', WidgetInfo);
return WidgetInfo;

});


odoo.define('favite_bif.LutWidgetMap', function (require) {
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



odoo.define('favite_bif.LutWidgetMapRaw', function (require) {
	"use strict";

	var core = require('web.core');
	var Dialog = require('web.Dialog');

	var WidgetMap = require('favite_bif.LutWidgetMap');
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


	widgetRegistry.add('subview_favite_bif_lut_raw', WidgetMapRaw);

	});


odoo.define('favite_bif.LutWidgetMapThumb', function (require) {
	"use strict";

	var core = require('web.core');
	var Dialog = require('web.Dialog');
	var widgetRegistry = require('web.widget_registry');

	var WidgetMap = require('favite_bif.LutWidgetMap');
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

	widgetRegistry.add('subview_favite_bif_lut_thumb', WidgetMapThumb);
	return WidgetMapThumb;

	});