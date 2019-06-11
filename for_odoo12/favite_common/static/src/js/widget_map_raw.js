odoo.define('favite_common.WidgetMapRaw', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var WidgetMap = require('favite_common.WidgetMap');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');

var QWeb = core.qweb;
var _t = core._t;


var WidgetMapRaw = WidgetMap.extend({
    events: {
//        'keydown.canvas-map': '_onKeydown'
    },

    init: function(){
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


widgetRegistry.add('subview_raw', WidgetMapRaw);
return WidgetMapRaw;

});