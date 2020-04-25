odoo.define('favite_gmd.InfoMark', function (require) {
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
    	'change input': '_onMarkDataChange',
    },
    
    _onMarkDataChange: function(e){
    	var name = $(e.currentTarget).attr('name');
    	this.geo.mark[name] = $(e.currentTarget)[0].value;
    	
    	this.trigger_up('field_changed', {
            dataPointID: this.getParent().getParent().state.id,
            changes:{geo:this.geo},
            noundo:true
        });
    },

    init: function(parent,curPolyline, geo,obj_id){
    	this.geo = geo;
    	this.obj_id = obj_id;
    	this.curPolyline = curPolyline;

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
//        	self.$('input[name="shift"]')[0].value = self.geo.mark['shift'] || '';
        	return $.when();
        });
    },
    
    
    
});


});