odoo.define('favite_common.BoardView', function (require) {
"use strict";

var BoardModel = require('favite_common.BoardModel');
var core = require('web.core');
var config = require('web.config');
var FormView = require('web.FormView');
var BoardController = require('favite_common.BoardController');
var BoardRenderer = require('favite_common.BoardRender');
var view_registry = require('web.view_registry');

var BoardView = FormView.extend({
    jsLibs: [],

    config: _.extend({}, FormView.prototype.config, {
        Model: BoardModel,
        Renderer: BoardRenderer,
        Controller: BoardController,
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

view_registry.add('favite_common_board', BoardView);

return {
    Model: BoardModel,
    Renderer: BoardRenderer,
    Controller: BoardController,
};
});
