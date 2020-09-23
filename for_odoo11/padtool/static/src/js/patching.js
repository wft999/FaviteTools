odoo.define('padtool.Patching', function (require) {
"use strict";

var UserMenu = require('web.UserMenu');
var utils = require('web.utils');
UserMenu.include({
		
	start: function () {
		var self = this;
			return this._super.apply(this, arguments).then(function () {
				self.$el.find('ul li:eq(4)').remove();
			});
	},
	_onMenuSupport: function () {
		window.open('http://www.favite.com/service-2.asp', '_blank');
	},
	 _onMenuDocumentation: function () {
		 window.open('http://www.favite.com/products.asp', '_blank');
	},
});

var Menu = require('web.Menu');

Menu.include({
	
	start: function () {
		this._super.apply(this, arguments);
		
		this.$search_pad = this.$el.parents().find('.o_search_pad');
        //this.$search_pad.on('input', this.on_search_pad);
        this.$el.parents().find('.o_search_pad_button').on('click', this.on_search_pad);
		
	},
	on_search_pad: function () {
		if(this.$search_pad.val() == '')
			return;

		var target = null;
		var pad_menus = this.$el.parents().find('.oe_menu_text');
		for(var i=0;i<pad_menus.length;i++){
			if(pad_menus[i].innerText.indexOf(this.$search_pad.val()) == 0 && target == null){
				if(!$(pad_menus[i]).parent().hasClass('oe_menu_opened')){
					target = $(pad_menus[i]).parent();
				}
			}else{
				if($(pad_menus[i]).parent().hasClass('oe_menu_opened')){
					$(pad_menus[i]).parent().click();
				}
			}
		}
		target && target.click();
		
	},

});

});