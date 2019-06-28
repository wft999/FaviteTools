odoo.define('favite_gmd.WidgetMark', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var Widget = require('web.Widget');
var framework = require('web.framework');
var QWeb = core.qweb;
var _t = core._t;


return Widget.extend({
	template: 'favite_gmd.info_mark',
    events: {
//        'keydown.canvas-map': '_onKeydown'
    },

    init: function(parent, geo,obj_id){
    	this.geo = geo;
    	this.obj_id = obj_id;
    	this.type = 'mark';
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


});