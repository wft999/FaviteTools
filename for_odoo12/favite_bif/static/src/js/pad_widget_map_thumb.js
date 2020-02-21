odoo.define('favite_bif.PadWidgetMapThumb', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');
var widgetRegistry = require('web.widget_registry');

var PadWidgetMap = require('favite_bif.PadWidgetMap');
var Thumb = require('favite_common.WidgetMapThumb');
var framework = require('web.framework');
var Coordinate = require('favite_common.coordinate');
var QWeb = core.qweb;
var _t = core._t;


var WidgetMapThumb = Thumb.extend(PadWidgetMap,{
    events: {
//        'keydown.canvas-map': '_onKeydown'
    },

    init: function(){
    	
    	this.map_type = "thumb";

        return this._super.apply(this, arguments);
    },
   
    willStart: function () {
    	var self = this;
        return this._super.apply(this, arguments).then(function () {
        	return self.LoadPanelMap();
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

widgetRegistry.add('subview_favite_bif_pad_thumb', WidgetMapThumb);
return WidgetMapThumb;

});