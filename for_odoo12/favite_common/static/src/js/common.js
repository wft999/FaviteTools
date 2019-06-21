odoo.define('favite.common', function (require) {
'use strict';
var SystrayMenu = require('web.SystrayMenu');
var Widget = require('web.Widget');
var KanbanRecord = require('web.KanbanRecord');
var field_utils = require('web.field_utils');

var client = require('web.web_client');


client.set_title_part('zopenerp','FaviteTools');

var fullScreenMenu = Widget.extend({
    name: 'full_screen_menu',
    template:'systray.FullScreenMenu',
    events: {
        'click a': '_onActivityActionClick',
    },

    start: function () {
        return this._super();
    },
    //--------------------------------------------------
    // Private
    //--------------------------------------------------


    //------------------------------------------------------------
    // Handlers
    //------------------------------------------------------------

    /**
     * Redirect to specific action given its xml id
     * @private
     * @param {MouseEvent} ev
     */
    _onActivityActionClick: function (ev) {
    	var docElm = document.documentElement;
    	if (docElm.requestFullscreen) {
    	  docElm.requestFullscreen();
    	} else if (docElm.mozRequestFullScreen) {
    	  docElm.mozRequestFullScreen();
    	} else if (docElm.webkitRequestFullScreen) {
    	  docElm.webkitRequestFullScreen();
    	} else if (docElm.msRequestFullscreen) {
    	  docElm.msRequestFullscreen();
    	}
    },

});

//SystrayMenu.Items.push(fullScreenMenu);


/*KanbanRecord.include({
    _openRecord: function () {
        if (this.modelName === 'favite_gmd.gmd') {
        	this.do_action({
                name: this.recordData.name,
                res_model: 'favite_gmd.gmd',
                domain: [['gmd_id', '=', this.recordData.id]],
                context: {default_gmd_id: this.recordData.id},
                views: [[false, 'map'], [false, 'list']],
                type: 'ir.actions.act_window',
                view_type: "map",
                view_mode: "map"
            });
        } else {
            this._super.apply(this, arguments);
        }
    },

});*/

field_utils.format.jsonb = function(value, field, options){
	if (value === false) {
        return "";
    }
	
	return JSON.stringify(value);
};


});

