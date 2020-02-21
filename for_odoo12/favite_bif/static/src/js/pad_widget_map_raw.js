odoo.define('favite_bif.PadWidgetMapRaw', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var PadWidgetMap = require('favite_bif.PadWidgetMap');
var Raw = require('favite_common.WidgetMapRaw');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');

var QWeb = core.qweb;
var _t = core._t;


var WidgetMapRaw = Raw.extend(PadWidgetMap,{
    events: {
//        'keydown.canvas-map': '_onKeydown'
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


widgetRegistry.add('subview_favite_bif_pad_raw', WidgetMapRaw);

});