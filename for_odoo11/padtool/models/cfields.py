from odoo import models, fields, api,_
from odoo.tools import pycompat

class ArrayNumeric(fields.Field):
    type = 'arraynumeric'
    column_type = ('_numeric', 'NUMERIC[]')

    def convert_to_cache(self, value, record, validate=True):
        if value is None or value is False:
            return None
        if isinstance(value, pycompat.string_types):
            return value.split(',')
        return value

    def convert_to_read(self, value, record, use_name_get=True):
        return value
    
    def convert_to_write(self, value, record):
        return [ str(v) for v in value]

    def convert_to_column(self, value, record, values=None):
        """ Convert ``value`` from the ``write`` format to the SQL format. """
        if value is None or value is False:
            return None
        
        #vs = [pycompat.to_native(v) for v in value]
        
        return '{' + ','.join(value) + '}'

    def convert_to_export(self, value, record):
        """ Convert ``value`` from the record format to the export format. """
        if not value:
            return ''

        return ','.join([ str(v) for v in value])