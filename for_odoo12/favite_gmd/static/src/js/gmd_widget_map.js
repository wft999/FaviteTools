var events = [];

odoo.define('favite_gmd.GmdWidgetMap', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');


var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');

var QWeb = core.qweb;
var _t = core._t;


var GmdWidgetMap = {
    
    _onTypeButtonClick: function(ev){
    	if(!this.map)
    		return;
    	
    	var key = $(ev.currentTarget).data('type');
    	if(key == 'markoffset' && this.geo[key].objs.length>=1){
    		this.do_warn(_t('Incorrect Operation'),_t('markoffset already exists !'),false);
    		return;
    	}
    	if(key == 'mark' && this.geo[key].objs.length>=2){
    		console.log(JSON.stringify(events));
    		this.do_warn(_t('Incorrect Operation'),_t('mark already exists !'),false);
    		return;
    	}
    	
		this._super.apply(this, arguments);
		if(key == 'block'){
			var self = this;
	        var $content = $(QWeb.render("BlockLayoutDialog"));
	            
	        var dialog = new Dialog(this, {
	        	title: _t('Block layout'),
	        	size: 'medium',
	        	$content: $content,
	        	buttons: [{text: _t('Confirm'), classes: 'btn-primary', close: true, click: function(){
	        		self.map.curPolyline.obj.col = parseFloat(this.$content.find('#col').val());
	            	self.map.curPolyline.obj.row = parseFloat(this.$content.find('#row').val());
	        	}}],
	        });
	        dialog.open();
    	}
		
	},

    
    
};

return GmdWidgetMap;

});