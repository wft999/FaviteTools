odoo.define('padtool.tour', function(require) {
"use strict";

var core = require('web.core');
var tour = require('web_tour.tour');

var _t = core._t;

tour.register('padtool_tour', {
    url: "/web",
    skip_enabled: true,
	}, 
[{
    trigger: '.oe_menu_toggler[data-menu-xmlid="padtool.menu_root"]',
    content: _t('点这里，进入程序'),
    position: 'bottom',
}, {
    trigger: '.oe_secondary_menu_section[data-menu-xmlid="padtool.menu_glass_root"] ~ .oe_secondary_submenu>li:eq(0)>a>span',
    content: _t('选择glass'),
    position: 'bottom',
    
},{
    trigger: '.oe_secondary_menu_section[data-menu-xmlid="padtool.menu_glass_root"] ~ .oe_secondary_submenu>li:eq(0)>ul>li:eq(1)>a>span',
    content: _t('选择panel'),
    position: 'bottom',
    
},{
    trigger: '.oe_secondary_menu_section[data-menu-xmlid="padtool.menu_glass_root"] ~ .oe_secondary_submenu>li:eq(0)>ul>li:eq(1)>ul>li:eq(1)>a>span',
    content: _t('选择panel map'),
    position: 'bottom',
    
},{
    trigger: '.canvas-map',
    content: _t('双击panel map'),
    position: 'bottom',
    run: function (actions) {
    	actions.click(this.$anchor);
    	actions.click(this.$anchor);
    },
    
},


]);

});
