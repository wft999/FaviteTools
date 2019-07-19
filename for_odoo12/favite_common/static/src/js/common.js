odoo.define('favite.common', function (require) {
'use strict';
var SystrayMenu = require('web.SystrayMenu');
var Widget = require('web.Widget');
var KanbanRecord = require('web.KanbanRecord');
var field_utils = require('web.field_utils');

var client = require('web.web_client');

var KanbanRecord = require('web.KanbanRecord');
KanbanRecord.include({
	_openRecord: function (event) {
        if (this.modelName === 'favite_gmd.gmd') {
        	this.$('.dropdown-menu a').first().click();
        } else {
            this._super.apply(this, arguments);
        }
    },
});


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

field_utils.format.jsonb = function(value, field, options){
	if (value === false) {
        return "";
    }
	
	return JSON.stringify(value);
};


});

odoo.define('favite_common.canvas_registry', function (require) {
    "use strict";
    var Registry = require('web.Registry');
    return new Registry();
});
