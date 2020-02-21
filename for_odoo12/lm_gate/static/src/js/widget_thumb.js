odoo.define('lm_gate.WidgetThumb', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');
var widgetRegistry = require('web.widget_registry');
var Widget = require('web.Widget');
var framework = require('web.framework');

var QWeb = core.qweb;
var _t = core._t;


var WidgetThumb = Widget.extend({
	template: 'lm_gate.DashBoard.subview',
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
        
        return this._super.apply(this, arguments).then(function () {
        	return $.when();
        });
    },

});

widgetRegistry.add('subview_thumb', WidgetThumb);
return WidgetThumb;

});