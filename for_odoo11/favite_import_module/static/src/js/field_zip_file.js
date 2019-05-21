odoo.define('mrp.mrp_state', function (require) {
"use strict";

var basic_fields = require('web.basic_fields');
var field_registry = require('web.field_registry');
var FieldBinaryFile = basic_fields.FieldBinaryFile;

var FieldZipFile = FieldBinaryFile.extend({
    supportedFieldTypes: ['binary'],
    template: 'ZipFieldBinaryFile',

});

field_registry.add('zip_upload', FieldZipFile);

});
