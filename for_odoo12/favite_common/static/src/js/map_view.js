odoo.define('favite_common.MapView', function (require) {
"use strict";


var core = require('web.core');
var config = require('web.config');

var BasicView = require('web.FormView');
var MapRender = require('favite_common.MapRender');
var MapController = require('favite_common.MapController');
var MapModel = require('favite_common.MapModel');

var view_registry = require('web.view_registry');
var _lt = core._lt;

var MapView = BasicView.extend({
	display_name: _lt('Map'),
	icon: 'fa-map',
    config: _.extend({}, BasicView.prototype.config, {
    	Model: MapModel,
    	Renderer: MapRender,
        Controller: MapController,
    }),
    viewType: 'map',

    /**
     * Overrides to lazy-load touchSwipe library in mobile.
     *
     * @override
    */
    init: function (viewInfo, params) {
        this._super.apply(this, arguments);

        this.loadParams.type = 'record';
        //this.controllerParams.mode = 'edit';
        //this.rendererParams.mode = 'edit';
        
    },
});

view_registry.add('map', MapView);

return MapView;
});
