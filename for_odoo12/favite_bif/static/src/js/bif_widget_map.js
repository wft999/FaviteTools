odoo.define('favite_bif.BifWidgetMap', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');


var framework = require('web.framework');
var widgetRegistry = require('web.widget_registry');

var QWeb = core.qweb;
var _t = core._t;


var BifWidgetMap = {
    
    _onTypeButtonClick: function(ev){
    	var key = $(ev.currentTarget).data('type');
/*    	if(key == 'markoffset' && this.geo[key].objs.length>=1){
    		this.do_warn(_t('Incorrect Operation'),_t('markoffset already exists !'),false);
    		return;
    	}
    	if(key == 'mark' && this.geo[key].objs.length>=2){
    		this.do_warn(_t('Incorrect Operation'),_t('mark already exists !'),false);
    		return;
    	}*/
		
		return this._super.apply(this, arguments);
	},

    
    
};

return BifWidgetMap;

});