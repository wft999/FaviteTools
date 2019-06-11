odoo.define('favite_common.TreeView', function (require) {
"use strict";


var core = require('web.core');
var config = require('web.config');

var ListView = require('web.ListView');
var TreeRenderer = require('favite_common.TreeRender');
var TreeController = require('favite_common.TreeController');

var view_registry = require('web.view_registry');

var TreeView = ListView.extend({
    config: _.extend({}, ListView.prototype.config, {
    	Renderer: TreeRenderer,
        Controller: TreeController,
    }),

    /**
     * Overrides to lazy-load touchSwipe library in mobile.
     *
     * @override
    */
    init: function () {
        this._super.apply(this, arguments);
    },
});

view_registry.add('favite_common_tree', TreeView);

return TreeView;
});
