odoo.define('favite_gmd.InfoMark', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var Widget = require('web.Widget');
var framework = require('web.framework');
var QWeb = core.qweb;
var _t = core._t;


var InfoMark = Widget.extend({
	template: 'favite_gmd.info_mark',
    events: {
    	'change input': '_onMarkDataChange',
    },
    
    _onMarkDataChange: function(e){
    	//var name = $(e.currentTarget).attr('name');
    	var x = parseFloat(this.$('input[name="x_mark_position"]')[0].value);
    	var y = parseFloat(this.$('input[name="y_mark_position"]')[0].value);
    	var width = parseFloat(this.$('input[name="mark_width"]')[0].value);
    	var height = parseFloat(this.$('input[name="mark_height"]')[0].value);
    	
    	var p = this.geo.mark.objs[this.obj_id].points;
    	p[0].x = x - width/2;
    	p[0].y = y - height/2;
    	p[1].x = x + width/2;
    	p[1].y = y + height/2;
    	
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
        var disabled = self.getParent().getParent().mode != 'edit';
        return this._super.apply(this, arguments).then(function () {
        	var p = self.geo.mark.objs[self.obj_id].points;
        	var x = (p[0].x + p[1].x)/2;
        	var y = (p[0].y + p[1].y)/2;
        	var width = Math.abs(p[0].x - p[1].x);
        	var height = Math.abs(p[0].y - p[1].y);
        	self.$('input[name="x_mark_position"]')[0].value = x;
        	self.$('input[name="y_mark_position"]')[0].value = y;
        	self.$('input[name="mark_width"]')[0].value = width;
        	self.$('input[name="mark_height"]')[0].value = height;
        	
        	self.$('input[name="x_mark_position"]')[0].disabled = disabled;
        	self.$('input[name="y_mark_position"]')[0].disabled = disabled;
        	self.$('input[name="mark_width"]')[0].disabled = disabled;
        	self.$('input[name="mark_height"]')[0].disabled = disabled;
        	return $.when();
        });
    },
    
});

var InfoMarkOffset = Widget.extend({
	template: 'favite_gmd.info_mark_offset',
    events: {
    	'change input': '_onMarkDataChange',
    },
    
    _onMarkDataChange: function(e){
    	var width = parseFloat(this.$('input[name="mark_offset_width"]')[0].value);
    	var height = parseFloat(this.$('input[name="mark_offset_height"]')[0].value);
    	
    	var p = this.geo.markoffset.objs[this.obj_id].points;
    	p[1].x = p[0].x + width;
    	p[1].y = p[0].y + height;
    	
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
        var disabled = self.getParent().getParent().mode != 'edit';
        return this._super.apply(this, arguments).then(function () {
        	var p = self.geo.markoffset.objs[self.obj_id].points;
        	var width = Math.abs(p[0].x - p[1].x);
        	var height = Math.abs(p[0].y - p[1].y);
        	self.$('input[name="mark_offset_width"]')[0].value = width;
        	self.$('input[name="mark_offset_height"]')[0].value = height;
        	self.$('input[name="mark_offset_width"]')[0].disabled = disabled;
        	self.$('input[name="mark_offset_height"]')[0].disabled = disabled;
        	return $.when();
        });
    },
    
});

return {InfoMark,InfoMarkOffset}
});