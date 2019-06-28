odoo.define('favite_common.MapModel', function (require) {
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
        var record = self.localData[recordID];
        for(var key in record._changes.geo){
        	_.each(record._changes.geo[key].objs,o=>{delete o.selected;delete o.focused;});
        	_.filter(record._changes.geo[key].objs,o=>o.points.length>1);
        }
        
        return this._super.apply(this, arguments).then(function (result) {
            return result;
        });
    },
});

});


