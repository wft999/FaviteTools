odoo.define('favite_gmd.InfoBlock', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var Widget = require('web.Widget');
var framework = require('web.framework');
var QWeb = core.qweb;
var _t = core._t;
//var panel_resort = require('favite_gmd.PanelResort');

return Widget.extend({
	template: 'favite_gmd.info_block',
    events: {
    	
    	'click .o_button_apply': '_onApplyPanelData',
    	'change input.o_panel_data': '_onPanelDataChange',
    	'change input.o_block_data': '_onBlockDataChange',
    },
    
    _onApplyPanelData: function(){
    	
    	var self = this;
    	var attr = _.omit(self.panel, 'points');
    	_.each(this.geo.block.objs[this.oid].panels,p=>{
    		if(p != self.panel){
    			_.extend(p,attr);
    		}
    	});
    	
    	this.trigger_up('field_changed', {
            dataPointID: this.getParent().getParent().state.id,
            changes:{geo:this.geo},
            noundo:true
        });
    },

    _onPanelDataChange: function(e){
    	var id = $(e.currentTarget).attr('id');
    	this.panel[id] = $(e.currentTarget)[0].value;
    	
    	this.trigger_up('field_changed', {
            dataPointID: this.getParent().getParent().state.id,
            changes:{geo:this.geo},
            noundo:true
        });
    },
    
    _onBlockDataChange: function(e){
    	var id = $(e.currentTarget).attr('id');
    	this.geo.block.objs[this.oid][id] = $(e.currentTarget)[0].value;
    	
    	this.trigger_up('field_changed', {
            dataPointID: this.getParent().getParent().state.id,
            changes:{geo:this.geo},
            noundo:true
        });
    },
    
    

    init: function(parent,curPolyline, geo,glass,oid){
    	this.geo = geo;
    	this.glass = glass;
    	this.oid = oid;
    	this.curPolyline = curPolyline;
    	
    	this.pid = _.findIndex(curPolyline.obj.panels,p=>p.selected);
    	if(this.pid >= 0)
    		this.panel = this.geo.block.objs[this.oid].panels[this.pid];
    	
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
        	
        	self.$('#panel_start_id')[0].value = self.curPolyline.obj.panel_start_id || '0';
        	self.$('#panel_start_id_x')[0].value = self.curPolyline.obj.panel_start_id_x || '0';
        	self.$('#panel_start_id_y')[0].value = self.curPolyline.obj.panel_start_id_y || '0';

        	if(self.panel){
        		self.$('#pixelsize')[0].value = self.panel.pixelsize || '';
        		self.$('#d1g1')[0].value = self.panel.d1g1 || '';
        	}
        	
        	$(self.$el[2]).toggleClass('o_hidden',self.glass.use_hsd===true);
        	$(self.$el[4]).toggleClass('o_hidden',self.glass.use_hsd!==true);
        	$(self.$el[6]).toggleClass('o_hidden',self.glass.use_hsd!==true);
        	
        	
        	return $.when();
        });
    },
    
    
    
});


});