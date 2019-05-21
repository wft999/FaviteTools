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


});