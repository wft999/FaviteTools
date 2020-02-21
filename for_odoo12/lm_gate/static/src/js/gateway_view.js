odoo.define('lm_gate.GatewayView', function (require) {
"use strict";


var core = require('web.core');
var config = require('web.config');

var BasicView = require('web.FormView');
var GatewayRender = require('lm_gate.GatewayRender');
var GatewayController = require('lm_gate.GatewayController');
var GatewayModel = require('lm_gate.GatewayModel');

var view_registry = require('web.view_registry');
var _lt = core._lt;

var GatewayView = BasicView.extend({
	display_name: _lt('Gateway'),
	icon: 'fa-map',
    config: _.extend({}, BasicView.prototype.config, {
    	Model: GatewayModel,
    	Renderer: GatewayRender,
        Controller: GatewayController,
    }),
    viewType: 'gateway',

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

view_registry.add('gateway', GatewayView);

return GatewayView;
});
