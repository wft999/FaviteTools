odoo.define('favite_gmd.WidgetGlobal', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var Widget = require('web.Widget');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');

var Mixin = require('favite_common.Mixin');

var QWeb = core.qweb;
var _t = core._t;


var WidgetGlobal = Widget.extend({
	template: 'favite_gmd.info_global',
    events: {
//        'keydown.canvas-map': '_onKeydown'
    },

    init: function(){
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

return WidgetGlobal;

});