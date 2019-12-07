odoo.define('favite_bif.InfoBlock', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var Widget = require('web.Widget');
var framework = require('web.framework');
var QWeb = core.qweb;
var _t = core._t;


return Widget.extend({
	template: 'favite_bif.info_block',
    events: {
    	
    	'click .o_button_apply': 'panelEdit',
    	'change input.o_panel_data': '_onPanelDataChange',
    	'change input.o_block_data': '_onBlockDataChange',
    },
    
    panelEdit: function(e) {
        e.preventDefault();
        return this.do_action({
            type: 'ir.actions.act_window',
            res_model: 'favite_bif.panel',
            res_id: 75,
            views: [[false, 'form']],
            target: 'new'
        });
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
    
    

    init: function(parent,curPolyline, geo,oid){
    	this.geo = geo;
    	this.oid = oid;
    	this.curPolyline = curPolyline;
    	
    	this.radios = [
    		{
    			name:'active',
    			label:'Active',
    			items:[{label:'True',value:1,id:'active_false'},{label:'False',value:0,id:'active_true'}]
    		},
    	
    	];
    	
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
        	
        	
        	return $.when();
        });
    },
    
    
    
});


});