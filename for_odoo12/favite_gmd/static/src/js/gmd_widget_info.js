odoo.define('favite_gmd.WidgetInfo', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var Widget = require('web.Widget');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');

var InfoMask = require('favite_gmd.InfoMask');
var {InfoMark,InfoMarkOffset} = require('favite_gmd.InfoMark');
var InfoBlock = require('favite_gmd.InfoBlock');
var PanelResort = require('favite_gmd.PanelResort');

var QWeb = core.qweb;
var _t = core._t;


var WidgetInfo = Widget.extend({
	template: 'favite_gmd.info',
    events: {
        'click div.o_corner_type_list > ul > li': '_onCornerTypeSelect',
        'click div.o_coord_type_list > ul > li': '_onCoordTypeSelect',
        'change input.o_glass_data': '_onGlassDataChange',
        'change select.o_glass_data': '_onGlassDataChange',
        
        'click .o_button_resort': '_onResort',
        
        'click .o_button_add_mask_group': '_onAddMask',
        'click .o_button_delete_mask_group': '_onDeleteMask',
        'change select.o_mask_group': '_onMaskChange',
        'change input.o_mask_threshold': '_onMaskThresholdChange',
        
    },

    init: function(){
    	this.fold = false;
    	this.widget_info = null;
    	this.radios = [
    		{
    			name:'sort_range',
    			label:'Range',
    			items:[{label:'block',value:0,id:'sort_range_block'},{label:'glass',value:1,id:'sort_range_glass'}]
    		},
    		{
    			name:'sort_direction',
    			label:'Direction',
    			items:[{label:'x',value:0,id:'sort_dir_x'},{label:'y',value:1,id:'sort_dir_y'}]
    		},
    		{
    			name:'sort_trend_x',
    			label:'Trend x(close to corner)',
    			items:[{label:'smaller',value:0,id:'sort_tr_x_small'},{label:'bigger',value:1,id:'sort_tr_x_big'}]
    		},
    		{
    			name:'sort_trend_y',
    			label:'Trend y(close to corner)',
    			items:[{label:'smaller',value:0,id:'sort_tr_y_small'},{label:'bigger',value:1,id:'sort_tr_y_big'}]
    		},
    	
    	];
    	
        return this._super.apply(this, arguments);
    },
   
    willStart: function () {
    	var self = this;
        return this._super.apply(this, arguments).then(function () {
        	self.geo = {};
        	self.glass = {};
        	$.extend(true,self.geo,self.getParent().state.data.geo);
        	$.extend(true,self.glass,self.getParent().state.data.glass);
        	self.cameraConf = JSON.parse(self.getParent().state.data.camera_ini);
            var pos = self.cameraConf['glass.center.position.0'].split(',');
        	
            return $.when();
        });
    },

    start: function () {
        var self = this;
        return this._super.apply(this, arguments).then(function () {
        	core.bus.on('map_select_change', self, self._onMapSelectChange);
        	
        	var disabled = self.getParent().mode != 'edit';
        	self.$('a.dropdown-toggle').attr("data-toggle",!disabled?'dropdown':'#');
        	
        	self.$('input[name="galss_size"]')[0].value = self.glass.size[0] + ',' + self.glass.size[1];
        	
        	self.$('input.o_glass_data')[0].disabled = disabled;
        	self.$('select.o_glass_data')[0].disabled = disabled;
        	self.$('select.o_glass_data')[0].disabled = disabled;
        	self.$('select.o_glass_data')[0].disabled = disabled;
        	self.$('select.o_glass_data')[0].disabled = disabled;
        	
        	self.$el.find('li.width_long')[0].disabled = disabled;
        	self.$el.find('li.width_short')[0].disabled = disabled;
        	
        	self.$('input[name="use_hsd"]')[0].checked = self.glass.use_hsd == 1;
        	self.$('input[name="use_hsd"]')[0].disabled = disabled;

        	
        	self.$('#sort_range_glass')[0].checked = self.glass.sort_range == 1;
        	self.$('#sort_range_glass')[0].disabled = disabled;
        	self.$('#sort_range_block')[0].checked = self.glass.sort_range == 0;
        	self.$('#sort_range_block')[0].disabled = disabled;
        	
        	
        	self.$('#sort_dir_x')[0].checked = self.glass.sort_direction == 0;
        	self.$('#sort_dir_x')[0].disabled = disabled;
        	self.$('#sort_dir_y')[0].checked = self.glass.sort_direction == 1;
        	self.$('#sort_dir_y')[0].disabled = disabled;
        	
        	self.$('#sort_tr_x_small')[0].checked = self.glass.sort_trend_x == 0;
        	self.$('#sort_tr_x_small')[0].disabled = disabled;
        	self.$('#sort_tr_x_big')[0].checked = self.glass.sort_trend_x == 1;
        	self.$('#sort_tr_x_big')[0].disabled = disabled;
        	
        	self.$('#sort_tr_y_small')[0].checked = self.glass.sort_trend_y == 0;
        	self.$('#sort_tr_y_small')[0].disabled = disabled;
        	self.$('#sort_tr_y_big')[0].checked = self.glass.sort_trend_y == 1;
        	self.$('#sort_tr_y_big')[0].disabled = disabled;
        	self.$('select[name="sort_start_pos"]')[0].value = self.glass.sort_start_pos || 0;
        	self.$('select[name="sort_start_pos"]')[0].disabled = disabled;
        	
        	self._useHsdChange();
        	self.$('.sort_trend_x')[0].disabled = disabled;
        	self.$('.sort_trend_y')[0].disabled = disabled;
        	self.$('.sort_start_pos')[0].disabled = disabled;
        	
        	self.$('input[name="mask_threshold"]')[0].disabled = disabled;
        	self.$('.o_button_add_mask_group').hide();
        	self.$('.o_button_delete_mask_group').hide();
        	
        	if(self.geo.block.mask.length){
        		_.each(self.geo.block.mask,function(m){
            		self.$('.o_mask_group').append('<option>'+m.panels+'</option>')
            	});
        		
        		self.$('select[name="mask_group"]')[0].value = null;
        	}
        	
        	return $.when();
        });
    },
    
    destroy: function(){	
    	core.bus.off('map_select_change', this, this._onMapSelectChange);
    	if(this.widget_info) {
    		this.widget_info.destroy();
    		this.widget_info.$el.remove();
    	}
    	this._super.apply(this, arguments);
    },
    
    updateState: function(state){
    	var self = this;
    	if(self.geo,this.getParent()){
    		self.geo = {};
        	$.extend(true,self.geo,this.getParent().state.data.geo);
    	}
    	
    },
    
    _onResort: function(){
    	var disabled = this.getParent().mode != 'edit';
    	if(disabled)
    		return;
    	
    	this.glass.sort_range = this.$('input[name="sort_range"]:checked').data('value');
    	this.glass.sort_direction = this.$('input[name="sort_direction"]:checked').data('value');
    	this.glass.sort_trend_x = this.$('input[name="sort_trend_x"]:checked').data('value');
    	this.glass.sort_trend_y = this.$('input[name="sort_trend_y"]:checked').data('value');
    	
    	framework.blockUI();
    	PanelResort.panel_resort(this.geo,this.glass);
    	framework.unblockUI();
    	
    	this.geo.no_render_map = false;
    	this.trigger_up('field_changed', {
            dataPointID: this.getParent().state.id,
            changes:{geo:this.geo,glass:this.glass},
            noundo:true
        });
    },
    
    _showCoordList: function(){
		if(this.width_short){
			this.$el.find('li.width_long').toggleClass('o_hidden',false);
    		this.$el.find('li.width_short').toggleClass('o_hidden',true);
		}else{
			this.$el.find('li.width_long').toggleClass('o_hidden',true);
    		this.$el.find('li.width_short').toggleClass('o_hidden',false);
		}
    },
    
    _glassSizeChange: function(value){
    	value = value.toLowerCase();
    	if(value.match(/^\d+,\d+$/)){
    		var size = _.map(value.split(','),v=>parseInt(v));
    		
    		this.glass.size = size;
        	this.glass.coord = 0;
        	this.$el.find('.o_coord_type_list .o_coord_type_img').attr('src',"/favite_gmd/static/src/img/icon0.ico");
        	
        	this.trigger_up('field_changed', {
                dataPointID: this.getParent().state.id,
                changes:{geo:this.geo,glass:this.glass},
                noundo:true
            });
            	
    	}else{
    		this.do_warn(_t('Incorrect Operation'),_t('Please enter valid size!'),false);
    	}
    },
    
    _useHsdChange: function(){
    	//this.$('.sort_range').toggleClass('o_hidden',this.glass.use_hsd===true);
    	this.$('.sort_trend_x').toggleClass('o_hidden',this.glass.use_hsd===true);
    	this.$('.sort_trend_y').toggleClass('o_hidden',this.glass.use_hsd===true);
    	this.$('.sort_start_pos').toggleClass('o_hidden',this.glass.use_hsd!==true);
    	
    	if(this.widget_info && this.widget_info instanceof InfoBlock){
    		$(this.widget_info.$el[2]).toggleClass('o_hidden',this.glass.use_hsd===true);
    		$(this.widget_info.$el[4]).toggleClass('o_hidden',this.glass.use_hsd!==true);
    		$(this.widget_info.$el[6]).toggleClass('o_hidden',this.glass.use_hsd!==true);
    	}
    	
    	
    },
    
    _onGlassDataChange: function(e){
    	var name = $(e.currentTarget).attr('name');
    	var value = $(e.currentTarget)[0].value;
    	
    	if(name == 'galss_size'){
    		this._glassSizeChange(value);
    	}else{
    		if(name == 'use_hsd'){
    			this.glass[name] = $(e.currentTarget)[0].checked;
    			this._useHsdChange();
    		}else if(name == 'sort_start_pos'){
    			this.glass[name] = parseInt(value);
    		}

    		this.trigger_up('field_changed', {
                dataPointID: this.getParent().state.id,
                changes:{geo:this.geo,glass:this.glass},
                noundo:true
            });
    	}
    	
    	
    },

    
    _onCornerTypeSelect: function(e){
    	
    	var $el = $(e.currentTarget);
    	this.glass.corner = $el.find('a').data('type');
    	this.no_render_map = true;
    	
    	this.trigger_up('field_changed', {
            dataPointID: this.getParent().state.id,
            changes:{geo:this.geo,glass:this.glass},
            noundo:true
        });

    	
    	var src = $el.find('img').attr('src');
    	this.$el.find('.o_corner_type_list .o_corner_type_img').attr('src',src);
    },
    
    _onCoordTypeSelect: function(e){
    	var $el = $(e.currentTarget);
    	this.glass.coord = $el.find('a').data('type');
    	
    	if(this.glass.coord < 0){
    		this.glass.iCenterMode = -1;
    		this.glass.iLongEdge = -1;
    		this.glass.iStartQuandrant = -1;
    	}
    	else if(this.glass.coord < 4){
    		this.glass.iCenterMode = 1;
    		this.glass.iLongEdge = 1;
    		this.glass.iStartQuandrant = this.glass.coord + 1;
    	}else if(this.glass.coord < 8){
    		this.glass.iCenterMode = 1;
    		this.glass.iLongEdge = 0;
    		this.glass.iStartQuandrant = this.glass.coord - 3;
    	}else if(this.glass.coord < 12){
    		this.glass.iCenterMode = 0;
    		this.glass.iLongEdge = 1;
    		this.glass.iStartQuandrant = this.glass.coord - 7;
    	}else if(this.glass.coord < 16){
    		this.glass.iCenterMode = 0;
    		this.glass.iLongEdge = 0;
    		this.glass.iStartQuandrant = this.glass.coord - 11;
    	}else{
    		this.glass.iCenterMode = -1;
    		this.glass.iLongEdge = -1;
    		this.glass.iStartQuandrant = -1;
    	}
    	
    	this.geo.no_render_map = true;
    	this.trigger_up('field_changed', {
            dataPointID: this.getParent().state.id,
            changes:{geo:this.geo,glass:this.glass},
            noundo:true
        });

    	
    	var src = $el.find('img').attr('src');
    	this.$el.find('.o_coord_type_list .o_coord_type_img').attr('src',src);
    },
    
    _onMaskThresholdChange: function(e){
    	var panels = self.$('select[name="mask_group"]')[0].value;
    	
    	for (var i = 0;i< this.geo.block.mask.length;i++){
    		if(this.geo.block.mask[i].panels == panels){
    			this.geo.block.mask[i].threshold = $(e.currentTarget)[0].value;
    			break;
    		}
    	}

    	this.geo.no_render_map = true;
    	this.trigger_up('field_changed', {
            dataPointID: this.getParent().state.id,
            changes:{geo:this.geo},
            noundo:true
        });
    },
    
    _onMaskChange: function(e){
    	var value = $(e.currentTarget)[0].value;
    	var panels = value.split(',');
    	
    	var map = this.getParent().thumbWidget.map;
    	_.each(map.polylines,function(poly){
			if(poly.type !== 'block')
				return;
			_.each(poly.panels,function(p){
					p.select(_.contains(panels, p.obj.panel_index.toString()));
			});
			
		});
    	map.requestRenderAll();
    	
    	_.each(this.geo.block.mask,function(m){
    		if(m.panels == value){
    			self.$('input[name="mask_threshold"]')[0].value = m.threshold;
    		}
    	});
    	
 
    	if(this.getParent().mode == 'edit')
			this.$('.o_button_delete_mask_group').show();
    },
    
    _onAddMask: function(){
    	var disabled = this.getParent().mode != 'edit';
    	if(disabled)
    		return;
    	
    	this.$('.o_button_add_mask_group').hide();
    	var option = $('<option>'+this.curPanels+'</option>');
    	this.$('select[name="mask_group"]')[0].add(option[0],null);
    	this.$('select[name="mask_group"]')[0].value = this.curPanels;
    	this.$('input[name="mask_threshold"]')[0].value = 10;
    	
    	this.geo.block.mask.push({panels:this.curPanels,threshold:10});
    	this.geo.no_render_map = true;
    	this.trigger_up('field_changed', {
            dataPointID: this.getParent().state.id,
            changes:{geo:this.geo},
            noundo:true
        });
    },
    
    _onDeleteMask: function(){
    	var disabled = this.getParent().mode != 'edit';
    	if(disabled)
    		return;
    	
    	var panels = self.$('select[name="mask_group"]')[0].value;
    	
    	for (var i = 0;i< this.geo.block.mask.length;i++){
    		if(this.geo.block.mask[i].panels == panels){
    			this.geo.block.mask.splice(i, 1);
    			break;
    		}
    	}
    	
    	this.geo.no_render_map = true;
    	this.trigger_up('field_changed', {
            dataPointID: this.getParent().state.id,
            changes:{geo:this.geo},
            noundo:true
        });
    	this.$('.o_button_delete_mask_group').hide();
    	self.$('select[name="mask_group"]')[0].value = null;
    	self.$('input[name="mask_threshold"]')[0].value = null;
    },
    
    _onMapSelectChange:function(src){
    	var edit = this.getParent().mode == 'edit';

    	if(this.getParent() !== src.getParent())
    		return
    		
    	var curPolyline = src.map.curPolyline;
    	this.geo = {};
    	$.extend(true,this.geo,this.getParent().state.data.geo);
    	this.curPanels = null;
    	
    	this.$('.o_button_add_mask_group').hide();
    	this.$('.o_button_delete_mask_group').hide();
    	if(this.widget_info) {
    		this.widget_info.destroy();
    		this.widget_info.$el.remove();
    	}
    	this.widget_info = null;
    	if(curPolyline){
    		var oid = _.findIndex(this.geo[curPolyline.type].objs,o=>{return _.isEqual(o.points,curPolyline.obj.points)});
    		if(curPolyline.type == 'mark'){
    			this.widget_info = new InfoMark(this, curPolyline,this.geo,oid);
    			this.widget_info.appendTo('.gmd_info');
    		}else if(curPolyline.type == 'markoffset'){
    			this.widget_info = new InfoMarkOffset(this, curPolyline,this.geo,oid);
    			this.widget_info.appendTo('.gmd_info');
    		}else if(curPolyline.type == 'block'){
    			this.widget_info = new InfoBlock(this, curPolyline,this.geo,this.glass,oid);
    			this.widget_info.appendTo('.gmd_info');
    		}
    	}else{
    		var panels = [];
    		_.each(src.map.polylines,function(poly){
    			if(poly.type !== 'block')
    				return;
    			_.each(poly.panels,function(p){
    				if(p.obj.selected){
    					panels.push(p.obj.panel_index.toString());
    				}
    			});
    			
    		});
    		
    		var self = this;
    		function panelMatch(m){
    			var u = _.union(m.panels.split(','),panels);
    			if(u.length == panels.length && m.panels.split(',').length == panels.length){
    				self.curPanels = m.panels;
    				return true;
    			}else{
    				return false;
    			}
    		}
    		
    		if(panels.length){
    			if(_.any(this.geo.block.mask,panelMatch)){
    				if(edit)
    					this.$('.o_button_delete_mask_group').show();
    			}else{
    				this.curPanels = panels.join(',');
    				
    				if(edit){
    					this.$('.o_button_add_mask_group').show();
    				}
    			}
    				
    		}else{
    			this.$('.o_button_delete_mask_group').hide();
    			this.$('.o_button_delete_mask_group').hide();
    			this.$('select[name="mask_group"]')[0].value = null;
    			this.$('input[name="mask_threshold"]')[0].value = null;
    		}
    		
    	}
    },
    
});

widgetRegistry.add('subview_favite_gmd_gmd_info', WidgetInfo);
return WidgetInfo;

});