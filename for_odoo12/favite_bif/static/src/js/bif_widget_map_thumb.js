odoo.define('favite_bif.WidgetMapThumb', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');
var widgetRegistry = require('web.widget_registry');

var BifWidgetMap = require('favite_bif.BifWidgetMap');
var Thumb = require('favite_common.WidgetMapThumb');
var framework = require('web.framework');

var QWeb = core.qweb;
var _t = core._t;


var WidgetMapThumb = Thumb.extend(BifWidgetMap,{
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
            return $.when();
        });
    },
    
    start: function () {
        var self = this;
        var pos = self.cameraConf['image.dm.resizerate'].split(',');
    	self.ratio.x = 1/parseFloat(pos[0]);
    	self.ratio.y = 1/parseFloat(pos[1]);
        return this._super.apply(this, arguments).then(function () {
        	return $.when();
        });
    },
    
    
    
});

widgetRegistry.add('subview_favite_bif_bif_thumb', WidgetMapThumb);
return WidgetMapThumb;

});