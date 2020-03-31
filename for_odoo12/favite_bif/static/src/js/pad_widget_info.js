odoo.define('favite_bif.PadWidgetInfo', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');
var dialogs = require('web.view_dialogs');

var Widget = require('web.Widget');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');

var QWeb = core.qweb;
var _t = core._t;

var WidgetRegular = Widget.extend({
	template: 'favite_pad.info_regular',
    events: {
    	'change input': '_onDataChange',
    	'click .o_button_calc': '_onSearchGOA',
    },
    
    _onDataChange: function(e){
    	var name = $(e.currentTarget).attr('name');
    	
    	if(name == 'enable_d1g1'){
    		this.geo[this.curPolyline.type].objs[this.obj_id][name] = $(e.currentTarget)[0].checked;
    	}else{
    		this.geo[this.curPolyline.type].objs[this.obj_id][name] = parseFloat($(e.currentTarget)[0].value);
    	}
    	
    	
    	this.trigger_up('field_changed', {
            dataPointID: this.getParent().getParent().state.id,
            changes:{geo:this.geo},
            noundo:true
        });
    },

    init: function(parent,curPolyline, geo,obj_id,readonly){
    	this.geo = geo;
    	this.obj_id = obj_id;
    	this.curPolyline = curPolyline;
    	this.readonly = readonly;

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
        	self.$('input[name="enable_d1g1"]')[0].checked = self.geo[self.curPolyline.type].objs[self.obj_id]['enable_d1g1'] || true;
        	self.$('input[name="periodX"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['periodX'] || 0;
        	self.$('input[name="periodY"]')[0].value = self.geo[self.curPolyline.type].objs[self.obj_id]['periodY'] || 0;
        	return $.when();
        });
    },
    _onSearchGOA:function(){

    	var pad = this.curPolyline.obj;
    	var coord = this.getParent().getParent().thumbWidget.coord;
    	var dResolutionX = coord.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionX;
    	var dResolutionY = coord.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionY;
    	
    	var uLeft = pad.points[0].x;
    	var uRight = pad.points[0].x;
    	var uBottom = pad.points[0].y;
    	var uTop = pad.points[0].y;
    	for(var i = 1; i < pad.points.length; i++){
    		if(pad.points[i].x > uRight)
    			uRight = pad.points[i].x;
    		else if(pad.points[i].x < uLeft)
    			uLeft = pad.points[i].x;
    		
    		if(pad.points[i].y > uTop)
    			uTop = pad.points[i].y;
    		else if(pad.points[i].y < uBottom)
    			uBottom = pad.points[i].y;
    	}
    	var centerx = (uLeft + uRight)/2;
    	var centery = (uBottom + uTop)/2;
    	var width = 2000*dResolutionX;
    	var height = 2000*dResolutionY;
    	uLeft = centerx - width/2;
    	uRight = centerx + width/2;
    	uBottom = centery - height/2;
    	uTop = centery + height/2;
    	if(uLeft < 0) uLeft = 0;
    	if(uBottom < 0) uBottom = 0;
    	
    	coord.GetRectIntersectionInfoInBlockMapMatrix(uLeft,uBottom,uRight,uTop,true);
    	width = _.reduce(coord.bmpBlockMapPara.m_BlockMap, function(memo, block){ 
    		return memo + (block[0]&&block[0].bHasIntersection?block[0].iInterSectionWidth:0); 
    		}, 0);
    	height = _.reduce(coord.bmpBlockMapPara.m_BlockMap[0], function(memo, block){ 
    		return memo  + (block&&block.bHasIntersection?block.iInterSectionHeight:0); 
    		}, 0);
    	var strBlocks = JSON.stringify(coord.bmpBlockMapPara.m_BlockMap);
    	
    	var points = {x:[],y:[]};
    	pad.points.forEach(function(p){
    		points.x.push(Math.floor((p.x-uLeft)/dResolutionX));
    		points.y.push(Math.floor((p.y-uBottom)/dResolutionY));
    	});
    	var strPoints = JSON.stringify(points);
    	
    	var self = this;
    	var type = parseInt(self.$('select.o_panel_data').val());
    	var id = this.getParent().getParent().state.data.id;
    	framework.blockUI();
    	this._rpc({model: 'favite_bif.pad',method: 'search_goa',args: [id,{width,height,strBlocks,strPoints,type}],})
        .then(function(res) {
        	framework.unblockUI();
        	if(res.result){
        		self.$('input[name=periodX]').val(Math.floor(100 * res.periodX*dResolutionX)/100.0);
                self.$('input[name=periodY]').val(Math.floor(100 * res.periodY*dResolutionY)/100.0);
                self.getParent().$('.img-geo')[0].src = "data:image/jpeg;base64,"+res.map;
                self.getParent().$('.img-geo')[0].style="margin-top:10px;padding-top:10px;border-top: 1px solid #e5e5e5;"
                	
                self.geo[self.curPolyline.type].objs[self.obj_id]['periodX'] = Math.floor(100 * res.periodX*dResolutionX)/100.0;	
                self.geo[self.curPolyline.type].objs[self.obj_id]['periodY'] = Math.floor(100 * res.periodY*dResolutionY)/100.0;
                self.trigger_up('field_changed', {
                        dataPointID: self.getParent().getParent().state.id,
                        changes:{geo:self.geo},
                        noundo:true
                    });
                
                self.do_notify(_t('Operation Result'),_t('The search is success!'),false);
        	}else{
        		self.do_warn(_t('Operation Result'),_t('The search failed!'),false);
        	}
        }).fail(function(){
        	framework.unblockUI();
        	self.do_warn(_t('Operation Result'),_t('The search failed!'),false);
        	});
    },
});

var WidgetInfo = Widget.extend({
	template: 'favite_pad.info',
    events: {

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
    
    updateState: function(state){
    	if(!this.getParent())
    		return;
    	
    	var self = this;
    	self.geo = {};
    	$.extend(true,self.geo,this.getParent().state.data.geo);
    },
    
    _onMapSelectChange:function(src){
    	if(this.getParent() !== src.getParent())
    		return;
    	
    	this.geo = {};
    	$.extend(true,this.geo,this.getParent().state.data.geo);
    	
    	this.widget_info && this.widget_info.destroy();
    	this.widget_info = null;
    	this.$('.pad_info').empty();
    	
    	var readonly = this.getParent().mode == 'readonly';
    	var curPolyline = src.map.curPolyline;
    	if(curPolyline){
    		var oid = _.findIndex(this.geo[curPolyline.type].objs,o=>{return _.isEqual(o.points,curPolyline.obj.points)});
    		if(curPolyline.type == "regular"){
        		this.widget_info = new WidgetRegular(this, curPolyline,this.geo,oid,readonly);
    			this.widget_info.appendTo('.pad_info');
        	}
    	}
    	
    },
    
});

widgetRegistry.add('subview_favite_bif_pad_info', WidgetInfo);
return WidgetInfo;

});