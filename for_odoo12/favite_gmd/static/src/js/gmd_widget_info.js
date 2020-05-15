odoo.define('favite_gmd.WidgetInfo', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var Widget = require('web.Widget');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');

var InfoMask = require('favite_gmd.InfoMask');
var InfoMark = require('favite_gmd.InfoMark');
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
        	var x = parseInt(pos[0]);
        	var y = parseInt(pos[1]);
        	self.width_short = (x < y);
        	
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
        	
        	self._showCoordList();
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
    	
    	PanelResort.panel_resort(this.geo,this.glass);
    	
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
/*    	var size = this.geo.glass.size;
    	if(size[0] > 0 && size[1] > 0){
    		if(size[0] > size[1]){
    			this.$el.find('li.width_long').toggleClass('o_hidden',true);
        		this.$el.find('li.width_short').toggleClass('o_hidden',false);
    		}else{
    			this.$el.find('li.width_long').toggleClass('o_hidden',false);
        		this.$el.find('li.width_short').toggleClass('o_hidden',true);
    		}
    			
    	}else{
    		this.$el.find('li.width_long').toggleClass('o_hidden',true);
    		this.$el.find('li.width_short').toggleClass('o_hidden',true);
    	}*/
    },
    
    _glassSizeChange: function(value){
    	value = value.toLowerCase();
    	if(value.match(/^\d+,\d+$/)){
    		var size = _.map(value.split(','),v=>parseInt(v));
    		if(this.width_short && size[0]>size[1]){
    			this.do_warn(_t('Incorrect Operation'),_t('Please enter valid size!'),false);
    		}else{
        		thisglass.size = size;
            	this.glass.coord = 0;
            	this.$el.find('.o_coord_type_list .o_coord_type_img').attr('src',"/favite_gmd/static/src/img/icon0.ico");
            	
            	this.trigger_up('field_changed', {
                    dataPointID: this.getParent().state.id,
                    changes:{geo:this.geo,glass:this.glass},
                    noundo:true
                });
            	
            	//this._showCoordList();
    		}

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
    	}else if(this.geo.glass.coord < 8){
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
    
    _onMapSelectChange:function(src){
    	
    	if(this.getParent() !== src.getParent())
    		return
    		
    	var curPolyline = src.map.curPolyline;
    	this.geo = {};
    	$.extend(true,this.geo,this.getParent().state.data.geo);
    	
    	if(this.widget_info) {
    		this.widget_info.destroy();
    		this.widget_info.$el.remove();
    	}
    	this.widget_info = null;
    	if(curPolyline){
    		var oid = _.findIndex(this.geo[curPolyline.type].objs,o=>{return _.isEqual(o.points,curPolyline.obj.points)});
    		if(curPolyline.type == 'mark'){
    			//this.widget_info = new InfoMark(this, curPolyline,this.geo,oid);
    			//this.widget_info.appendTo('.gmd_info');
    		}else if(curPolyline.type == 'mask'){
    			this.widget_info = new InfoMask(this, curPolyline,this.geo,oid);
    			this.widget_info.appendTo('.gmd_info');
    		}else if(curPolyline.type == 'block'){
    			this.widget_info = new InfoBlock(this, curPolyline,this.geo,oid);
    			this.widget_info.appendTo('.gmd_info');
    		}
    	}
    },
    
});

widgetRegistry.add('subview_favite_gmd_gmd_info', WidgetInfo);
return WidgetInfo;

});