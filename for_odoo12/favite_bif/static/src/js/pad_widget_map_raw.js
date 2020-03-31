odoo.define('favite_bif.PadWidgetMapRaw', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var PadWidgetMap = require('favite_bif.PadWidgetMap');
var Raw = require('favite_common.WidgetMapRaw');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');

var QWeb = core.qweb;
var _t = core._t;


var WidgetMapRaw = Raw.extend(PadWidgetMap,{
    events: {
//        'keydown.canvas-map': '_onKeydown'
    },

    init: function(){
    	this.offset = {x:0,y:0};
    	this.ratio = {x:1,y:1};
    	this.map_type = "raw";
        return this._super.apply(this, arguments);
    },
   
    willStart: function () {
    	var self = this;
        return this._super.apply(this, arguments).then(function () {
            return $.when();
        });
    },
    
    _onObjectModified: function(opt){
		if(opt.target.type == "goa"){

    		var dResolutionX =  this.coord.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionX;
    		var dResolutionY =  this.coord.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionY;
			var period = opt.target.period * opt.target.scaleY 
			
			var periodX = period*fabric.util.sin(fabric.util.degreesToRadians(opt.target.angle))*dResolutionX;
			var periodY = period*fabric.util.cos(fabric.util.degreesToRadians(opt.target.angle))*dResolutionY;
			
			if(opt.target.regular.obj.periodX != periodX || opt.target.regular.obj.periodY != periodY){
				opt.target.regular.obj.periodX = periodX;
				opt.target.regular.obj.periodY = periodY;
				this.trigger_up('field_changed', {
		            dataPointID: this.getParent().state.id,
		            changes:{geo:this.geo},
		            noundo:true
		        });
			}
			
    	}
    },
    
    start: function () {
        var self = this;
        return this._super.apply(this, arguments).then(function () {
        	
        	return $.when();
        });
    },
    
    showMap: function(){
    	this._super.apply(this, arguments);
    	this.map.on('object:modified',this._onObjectModified.bind(this));
    },
    
});


widgetRegistry.add('subview_favite_bif_pad_raw', WidgetMapRaw);

});