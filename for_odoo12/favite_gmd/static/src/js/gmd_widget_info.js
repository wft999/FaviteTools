odoo.define('favite_gmd.WidgetInfo', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

var Widget = require('web.Widget');
var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');

var WidgetGlobal = require('favite_gmd.WidgetGlobal');
var WidgetMark = require('favite_gmd.WidgetMark');

var QWeb = core.qweb;
var _t = core._t;


var WidgetInfo = Widget.extend({
	template: 'favite_gmd.info',
    events: {
//        'keydown.canvas-map': '_onKeydown'
    },

    init: function(){
    	this.fold = false;
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
        	core.bus.on('map_select_change', self, self._onMapSelectChange);
        	return $.when();
        });
    },
    
    
    _onMapSelectChange:function(ev){
    	this.geo = {};
    	$.extend(true,this.geo,this.getParent().state.data.geo);
    	
    	this.$('.gmd-object').empty();
    	if(ev){
    		var obj_id = _.findIndex(this.geo[ev.type].objs,o=>{return _.isEqual(o.points,ev.obj.points)});
    		if(ev.type = 'mark'){
    			var widget = new WidgetMark(this, this.geo,obj_id);
    			widget.appendTo('.gmd-object');
    		}
    			
    	}
    	
    	
    	
    },
    
});

widgetRegistry.add('subview_favite_gmd_gmd_info', WidgetInfo);
return WidgetInfo;

});