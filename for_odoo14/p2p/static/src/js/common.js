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
        if (this.modelName =='p2p_learning'  || this.modelName == "ir.model") {
        	this.$('.dropdown-menu a').first().click();
        } else {
            this._super.apply(this, arguments);
        }
    },
});



});



