odoo.define('favite_common.field_array', function (require) {
"use strict";

var core = require('web.core');
var basic_fields = require('web.basic_fields');
var field_registry = require('web.field_registry');
var utils = require('web.utils');
var field_utils = require('web.field_utils');



var FieldArrayNumeric = basic_fields.InputField.extend({
    tagName: 'span',
    supportedFieldTypes: ['float_array','integer_array'],
    
    /**
     * For integer fields, 0 is a valid value.
     *
     * @override
     */
    isSet: function () {
        return this.value.length > 0
    },
    
    _isSameValue: function (value) {
        return _.isEqual(this.value,value);
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    _parseNumber: function(value) {
	    if (core._t.database.parameters.thousands_sep) {
	        var escapedSep = _.str.escapeRegExp(core._t.database.parameters.thousands_sep);
	        value = value.replace(new RegExp(escapedSep, 'g'), '');
	    }
	    if (core._t.database.parameters.decimal_point) {
	        value = value.replace(core._t.database.parameters.decimal_point, '.');
	    }
	    return Number(value);
	},
    
    /**
     * @override
     * @returns {string} the content of the input
     */
    _getValue: function () {
        return this.$input.val();
    },
    
    _formatValue: function (value) {
    	if (value == false) {
            return "";
        }
    	return value.join(", ")
    },
    
    _parseValue: function (value) {
    	var self = this;
    	return _.map(value.split(','),function(item){
    		var parsed = self._parseNumber(item);
    		if(isNaN(parsed))
    			throw new Error(_.str.sprintf(core._t("'%s' is not a correct numbric"), item));
    		
    		var id = item.indexOf(".");
    		if (self.formatType =="float_array"){
            	if(id == -1){
            		//throw new Error(_.str.sprintf(core._t("'%s' is not a correct float"), item));
            		item = item+'.0'
            	}
            }
    		else{
            	if(id != -1 || parsed < -2147483648 || parsed > 2147483647) {
            		throw new Error(_.str.sprintf(core._t("'%s' is not a correct integer"), item));
            	}
            }
            
            return parsed;
    	})

    },
    
});

field_registry.add('float_array', FieldArrayNumeric);
field_registry.add('integer_array', FieldArrayNumeric);
field_utils.format.arraynumeric = function(value, field, options){
	if (value === false) {
        return "";
    }
	
	return value.join(", ")
	/*
	return _.map(value,function(v){
		var fun = v%1 == 0 ? 'integer':'float';
		return field_utils.format[fun](v,field, options)
	}).join(", ");*/
};

});
