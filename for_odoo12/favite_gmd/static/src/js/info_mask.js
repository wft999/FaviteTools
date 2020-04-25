odoo.define('favite_gmd.InfoMask', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var Widget = require('web.Widget');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');

var Mixin = require('favite_common.Mixin');

var QWeb = core.qweb;
var _t = core._t;


return Widget.extend({
	template: 'favite_gmd.info_mask',
    events: {
    	'change input': '_onMaskDataChange',
    },
    
    _onMaskDataChange: function(e){
    	var name = $(e.currentTarget).attr('name');
    	if(name == 'threshold'){
    		this.geo.mask.objs[this.oid][name] = parseInt($(e.currentTarget)[0].value);
    	}if(name == 'pseudopoint_enable'){
    		this.geo.mask[name] = $(e.currentTarget)[0].checked;
    	}else{
    		this.geo.mask[name] = $(e.currentTarget)[0].value;
    	}

    	this.trigger_up('field_changed', {
            dataPointID: this.getParent().getParent().state.id,
            changes:{geo:this.geo},
            noundo:true
        });
    },

    init: function(parent,curPolyline, geo,oid){
    	this.geo = geo;
    	this.oid = oid;
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
/*        	self.$('input[name="pseudopoint_enable"]')[0].checked = self.geo.mask['pseudopoint_enable'] || false;
        	self.$('input[name="distance_x"]')[0].value = self.geo.mask['distance_x'] || '';
        	self.$('input[name="distance_y"]')[0].value = self.geo.mask['distance_y'] || '';*/
        	self.$('input[name="threshold"]')[0].value = self.geo.mask.objs[self.oid]['threshold'] || '';
        	return $.when();
        });
    },
    
    
    
});



});