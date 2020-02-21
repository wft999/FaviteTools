odoo.define('favite_common.WidgetInfo', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var Widget = require('web.Widget');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');

var Mixin = require('favite_common.Mixin');

var QWeb = core.qweb;
var _t = core._t;


var WidgetInfo = Widget.extend({
	template: 'favite_common.DashBoard.subview',
    events: {
//        'keydown.canvas-map': '_onKeydown'
    },

    init: function(){
    	this.fold = false;
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
    
    
    onButtonsClick:function(event){


    },
    
});

widgetRegistry.add('subview_info', WidgetInfo);
return WidgetInfo;

});