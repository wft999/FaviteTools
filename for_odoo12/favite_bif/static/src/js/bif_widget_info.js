odoo.define('favite_bif.WidgetInfo', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');
var dialogs = require('web.view_dialogs');

var Widget = require('web.Widget');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');


var QWeb = core.qweb;
var _t = core._t;

var InfoPanel = Widget.extend({
	template: 'favite_bif.info_panel',
    events: {
    	'change select': '_onGspChange',
    },
    
    
    _applyGsp: function(gsp_id){
    	var self = this;
    	var polylines;
    	if(self.$('input[name="is_all"]')[0].checked)
    		polylines = this.polylines;
    	else
    		polylines = _.filter(this.polylines,p=>p.obj.selected);
    	_.each(polylines,function(p){
    		_.each(self.geo['panel'].objs,function(o){
    			if(p.obj.name == o.name){
    				o.gsp = gsp_id;
    			}
    		});
    	});

    	this.trigger_up('field_changed', {
            dataPointID: this.getParent().getParent().state.id,
            changes:{geo:this.geo},
            noundo:true
        });
    },
    
    _onGspChange: function(e){
    	var self = this;
    	var gsp_id = $(e.currentTarget)[0].value;
    	
    	if(gsp_id == 'New'){
    		
    		var data = this.getParent().getParent().state.data;
    		var bif_id = data.id;
    		var polylines = _.filter(this.polylines,p=>p.obj.selected);
    		var src_panel = polylines[0].obj.name;
    		this._rpc({
                model: 'favite_bif.gsp',
                method: 'newFromPanel',
                args: [bif_id,src_panel],
            })
            .then(function (id) {
            	self._applyGsp(id);
            });
    	}else{
    		self._applyGsp(gsp_id);
    	}
    },

    init: function(parent,polylines, geo,names,ids){
    	this.geo = geo;
    	this.gsp_names = names;
    	this.gsp_ids = ids;
    	this.polylines = polylines;

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
        var edit = this.getParent().getParent().mode == 'edit';
        return this._super.apply(this, arguments).then(function () {
        	_.each(_.zip(self.gsp_names,self.gsp_ids),function(g){
        		self.$('select[name="panel_gsp"]').append('<option value="' + g[1]+ '">'+g[0]+'</option>')
        	});
        	self.$('select[name="panel_gsp"]').append('<option vaule="New">New</option>')
        	
        	self.$('select[name="panel_gsp"]')[0].value = null;
        	
        	for (var i = 0; i < self.polylines.length; i++){
        		if(self.polylines[i].obj.selected){
        			for (var j = 0; j <  self.geo['panel'].objs.length; j++){
            			if(self.polylines[i].obj.name == self.geo['panel'].objs[j].name){
            				if(self.geo['panel'].objs[j].gsp){
            					self.$('select[name="panel_gsp"]')[0].value = self.geo['panel'].objs[j].gsp;
            				}
            				break;
            			}
            		}
        			break;
        		}
        	}

        	
        	self.$('input[name="is_all"]')[0].checked = false;
        	self.$('input[name="is_all"]')[0].disabled = !edit;
        	self.$('select[name="panel_gsp"]')[0].disabled = !edit;
        	return $.when();
        });
    },
    
    
    
});


var WidgetInfo = Widget.extend({
	template: 'favite_bif.info',
    events: {
    	'click tbody td.o_data_cell': '_onCellClick',
    },

    init: function(){
    	this.fold = false;
    	this.widget_info = null;
    	
    	
        return this._super.apply(this, arguments);
    },
   
   
    willStart: function () {
    	var self = this;
        return this._super.apply(this, arguments).then(function () {
        	self.geo = {};
        	$.extend(true,self.geo,self.getParent().state.data.geo);
            return $.when();
        });
    },
    
    start: function () {
        var self = this;
        return this._super.apply(this, arguments).then(function () {
        	core.bus.on('map_select_change', self, self._onMapSelectChange);
        	
        	
        	return $.when();
        });
    },
    
    destroy: function(){	
    	core.bus.off('map_select_change', this, this._onMapSelectChange);
    	this._super.apply(this, arguments);
    },
    
    
    updateState: function(state){
    	var self = this;
    	if(!this.getParent())
    		return;
    	self.geo = {};
    	$.extend(true,self.geo,this.getParent().state.data.geo);
    	self.$('td.o_data_cell').prop('special_click', true);
    },
    
    _openPanel: function () {
        var self = this;
        this._rpc({
            model: 'favite_bif.panel',
            method: 'get_formview_action',
            args: [[130]],
        })
        .then(function (action) {
            self.trigger_up('do_action', {action: action});
        });
    },
    
    _openPanelDialog: function () {
        var self = this;
        this._rpc({
                model: 'favite_bif.panel',
                method: 'get_formview_id',
                args: [[110]],
            })
            .then(function (view_id) {
                new dialogs.FormViewDialog(self, {
                    res_model: 'favite_bif.panel',
                    res_id: 5,
                    title: _t("Open: ") + self.string,
                    view_id: view_id,
                    readonly: false,
                }).open();
            });
    },
    
    _onMapSelectChange:function(src){
    	if(this.getParent() !== src.getParent())
    		return;
    	if(this.widget_info) {
    		this.widget_info.destroy();
    		this.widget_info.$el.remove();
    	}
    	this.widget_info = null;
    	
    		
    	this.geo = {};
    	$.extend(true,this.geo,this.getParent().state.data.geo);
    	
    	var names = _.map(this.getParent().state.data.gsp_ids.data,g=>g.data.sequence);
    	var ids = _.map(this.getParent().state.data.gsp_ids.data,g=>g.data.id);
    	var polylines = _.filter(src.map.polylines,p=>p.obj.selected);
    	
    	if(polylines.length > 0 && _.every(polylines, p=>p.type == 'panel')){
    		this.widget_info = new InfoPanel(this, src.map.polylines,this.geo,names,ids);
			this.widget_info.appendTo('.bif_info');
    	}
    },
    
    _onCellClick: function (event) {
        // The special_click property explicitely allow events to bubble all
        // the way up to bootstrap's level rather than being stopped earlier.
//        if (this.getParent().mode == 'readonly' || $(event.target).prop('special_click')) {
//            return;
//        }
    	event.stopPropagation();
        var $td = $(event.currentTarget);
        var $tr = $td.parent();
        var rowIndex = this.$('.o_data_row').index($tr);
        var fieldIndex = Math.max($tr.find('.o_data_cell').not('.o_list_button').index($td), 0);

        var record = this.getParent().state.data.panel_ids.data[rowIndex];
        
        this.getParent().thumbWidget.map.polylines.forEach(function(p){
        	var sel = p.obj.name == record.data.name;
        	p.focus(sel);
        	p.select(sel);
        })
        this.getParent().thumbWidget.map.renderAll();
    },
    
});

widgetRegistry.add('subview_favite_bif_bif_info', WidgetInfo);
return WidgetInfo;

});