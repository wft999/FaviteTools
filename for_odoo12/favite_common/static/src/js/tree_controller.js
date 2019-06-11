odoo.define('favite_common.TreeController', function (require) {
"use strict";

var core = require('web.core');
var config = require('web.config');
var ListController = require('web.ListController');
var Dialog = require('web.Dialog');

var _t = core._t;
var _lt = core._lt;
var QWeb = core.qweb;

return ListController.extend({
	custom_events: _.extend({}, ListController.prototype.custom_events, {
        switch_botton_click:'_onSwitchBottonClick',
    }),
    
    init: function () {
        this._super.apply(this, arguments);
    },
    
    start: function () {
        var self = this;

        return $.when(
            this._super.apply(this, arguments)
        ).then(function () {
            $('.o_control_panel .o_cp_switch_buttons').removeClass('btn-group');
            return $.when();
        });
    },
    
    _renderControlPanelElements: function () {
        var elements = {};

        if (this.withControlPanel) {
            elements = {
                $buttons: $('<div>'),
                $sidebar: $('<div>'),
                $pager: $('<div>'),
            };

            this.renderButtons(elements.$buttons);
            this.renderSidebar(elements.$sidebar);
            //this.renderPager(elements.$pager);
            // remove the unnecessary outer div
            elements = _.mapObject(elements, function($node) {
                return $node && $node.contents();
            });
            elements.$switch_buttons = this._renderSwitchButtons();
        }

        return elements;
    },
    
    _renderSwitchButtons: function () {
        var self = this;
        var buttons =[
        	[
        		{accessKey:'l',icon:'fa-map',type:'thumbnail'},
        		{accessKey:'i',icon:'fa-image',type:'raw image'},
        		{accessKey:'l',icon:'fa-list-alt',type:'information'},

        	],
        	[
        		{accessKey:'l',icon:'fa-th-large',type:'layout'},
        		
        	]
        ];


        var $switchButtons = $(QWeb.render('favite_common.ControlPanel.SwitchButtons', {
        	buttons: buttons,
        }));
        // create bootstrap tooltips
        _.each(buttons, function (button) {
            $switchButtons.filter('.o_cp_switch_' + button.type).tooltip();
        });
        // add onclick event listener
        var $switchButtonsFiltered = $switchButtons.find('button');
        $switchButtonsFiltered.click(_.debounce(function (event) {
            var buttonType = $(event.target).data('button-type');
            self.trigger_up('switch_botton_click', {button_type: buttonType});
        }, 200, true));

        if (config.device.isMobile) {
            // set active view's icon as view switcher button's icon
            var activeView = _.findWhere(buttons, {type: this.buttonType});
            $switchButtons.find('.o_switch_view_button_icon').addClass('fa fa-lg ' + activeView.icon);
        }

        return $switchButtons;
    },

  //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------
    _onSwitchBottonClick:function(event) {
    	event.stopPropagation();
    	if(event.data.button_type == 'layout'){
    		var currentLayout = this.$('.oe_dashboard').attr('data-layout');
    		this._changeLayout({currentLayout:currentLayout});
    	}
    },
    
    _changeLayout: function (data) {
        var self = this;
        var dialog = new Dialog(this, {
        	size: 'medium',
            title: _t("Choose layout"),
            $content: QWeb.render('favite_common.DashBoard.layouts', _.clone(data))
        });
        dialog.opened().then(function () {
            dialog.$('li').click(function () {
                var layout = $(this).attr('data-layout');
                self.renderer.changeLayout(layout);
                self.renderer.saveBoard();
                dialog.close();
            });
        });
        dialog.open();
    },


});

});