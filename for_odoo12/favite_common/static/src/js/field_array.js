odoo.define('favite_common.field_array', function (require) {
"use strict";

var core = require('web.core');
var basic_fields = require('web.basic_fields');
var field_registry = require('web.field_registry');
var utils = require('web.utils');
var field_utils = require('web.field_utils');



var FieldArrayNumeric = basic_fields.DebouncedField.extend({
    tagName: 'span',
    supportedFieldTypes: ['float_array','integer_array'],
    
    custom_events: _.extend({}, basic_fields.DebouncedField.prototype.custom_events, {
        field_changed: '_onFieldChanged',
    }),
    events: _.extend({}, basic_fields.DebouncedField.prototype.events, {
        'input': '_onInput',
        'change': '_onChange',
    }),

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------
    /**
     * Prepares the rendering so that it creates an element the user can type
     * text into in edit mode.
     *
     * @override
     */
    init: function () {
        this._super.apply(this, arguments);

        this.isDirty = false;
        this.lastChangeEvent = undefined;

        this.isFloat = _.isString(this.value[0]) ? this.value[0].indexOf('.') != -1 : this.value[0] % 1;
    },
    
    /**
     * Returns the associated <input/> element.
     *
     * @override
     */
    getFocusableElement: function () {
        return this.$input || $();
    },
    
    /**
     * Re-renders the widget if it isn't dirty. The widget is dirty if the user
     * changed the value, and that change hasn't been acknowledged yet by the
     * environment. For example, another field with an onchange has been updated
     * and this field is updated before the onchange returns. Two '_setValue'
     * are done (this is sequential), the first one returns and this widget is
     * reset. However, it has pending changes, so we don't re-render.
     *
     * @override
     */
    reset: function (record, event) {
        this._reset(record, event);
        if (!event || event === this.lastChangeEvent) {
            this.isDirty = false;
        }
        if (this.isDirty || (event && event.target === this && event.data.changes[this.name] === this.value)) {
            return $.when();
        } else {
            return this._render();
        }
    },

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
    
    /**
     * Formats an input element for edit mode. This is in a separate function so
     * extending widgets can use it on their input without having input as tagName.
     *
     * @private
     * @param {jQuery|undefined} $input
     *        The <input/> element to prepare and save as the $input attribute.
     *        If no element is given, the <input/> is created.
     * @returns {jQuery} the prepared this.$input element
     */
    _prepareInput: function ($input) {
    	//this.$el = $input || $("<span></span>")

    	this.$input = $("<input/>")
    	this.$input.addClass('o_input o_input_double o_field_integer o_field_number');
    	this.$input.attr({
                type: 'text',
                placeholder: this.attrs.placeholder || "",
                autocomplete: this.attrs.autocomplete,
            });
    	this.$input.val(this.value.join(', '));
        //this.$el.append(this.$input)
    	this.$el =  this.$input;   
        return this.$el;
    },
    
    /**
     * Formats the HTML input tag for edit mode and stores selection status.
     *
     * @override
     * @private
     */
    _renderEdit: function () {
        // Keep a reference to the input so $el can become something else
        // without losing track of the actual input.
        this._prepareInput(this.$el);
    },
    /**
     * Resets the content to the formated value in readonly mode.
     *
     * @override
     * @private
     */
    _renderReadonly: function () {
        this.$el.text(this._formatValue(this.value));
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
    		if (self.isFloat){
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
    
    
  //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * We immediately notify the outside world when this field confirms its
     * changes.
     *
     * @private
     */
    _onChange: function () {
        this._doAction();
    },
    /**
     * Listens to events 'field_changed' to keep track of the last event that
     * has been trigerred. This allows to detect that all changes have been
     * acknowledged by the environment.
     *
     * @param {OdooEvent} event 'field_changed' event
     */
    _onFieldChanged: function (event) {
        this.lastChangeEvent = event;
    },
    /**
     * Called when the user is typing text -> By default this only calls a
     * debounced method to notify the outside world of the changes.
     * @see _doDebouncedAction
     *
     * @private
     */
    _onInput: function () {
        this.isDirty = true;
        this._doDebouncedAction();
    },
    /**
     * Stops the left/right navigation move event if the cursor is not at the
     * start/end of the input element.
     *
     * @private
     * @param {OdooEvent} ev
     */
    _onNavigationMove: function (ev) {
        this._super.apply(this, arguments);

        // the following code only makes sense in edit mode, with an input
        if (this.mode === 'edit') {
            var input = this.$input[0];
            var selecting = (input.selectionEnd !== input.selectionStart);
            if ((ev.data.direction === "left" && (selecting || input.selectionStart !== 0))
             || (ev.data.direction === "right" && (selecting || input.selectionStart !== input.value.length))) {
                ev.stopPropagation();
            }
        }
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
