odoo.define('favite_common.BoardModel', function (require) {
"use strict";

var BasicModel = require('web.BasicModel');
var core = require('web.core');
var config = require('web.config');


return BasicModel.extend({
    /**
     * @override
     */
    save: function (recordID) {
        var self = this;
        return this._super.apply(this, arguments).then(function (result) {
            return result;
        });
    },
});

});


