# -*- coding: utf-8 -*-

import re
import json

from odoo import models, fields, api
from odoo.tools import pycompat,safe_eval,constraint_definition,drop_constraint,add_constraint
from odoo.exceptions import UserError, ValidationError

range_vaule_re = re.compile(r'^[\(\[](-?[1-9]\d*|~),(-?[1-9]\d*|~)[\)\]]$', re.I)

class Jsonb(fields.Field):
    type = 'jsonb'
    column_type = ('jsonb', 'jsonb')

    def convert_to_cache(self, value, record, validate=True):
        value = value or {}
#         return value if isinstance(value, pycompat.text_type) else json.dumps(value)
        return value if isinstance(value, dict) else json.loads(value)

    def convert_to_column(self, value, record, values=None):
        if value is None or value is False:
            return None
        
        return json.dumps(value)        
    
fields.Jsonb = Jsonb   
            
class NumericArray(fields.Field):
    type = 'float_array'
    column_type = ('_numeric', 'NUMERIC[]')

    def convert_to_cache(self, value, record, validate=True):
        if value is None or value is False:
            return None
        if isinstance(value, pycompat.string_types):
            return [float(v) for v in value.split(',')]
        return value

    def convert_to_column(self, value, record, values=None):
        if value is None or value is False:
            return None
        
        return '{' + ','.join(str(v) for v in value) + '}'
    
class IntegerArray(NumericArray):
    type = 'integer_array'
    column_type = ('_int4', 'integer[]')    
    
    def convert_to_cache(self, value, record, validate=True):
        if value is None or value is False:
            return None
        if isinstance(value, pycompat.string_types):
            return [int(v) for v in value.split(',')]
        return value

    def convert_to_column(self, value, record, values=None):
        if value is None or value is False:
            return None
        
        return '{' + ','.join(str(v) for v in value) + '}'
    

FIELD_TYPES = [(key, key) for key in sorted(fields.Field.by_type)]    
FIELD_TYPES2 = [(key, key) for key in sorted(fields.Field.by_type) if key in ('boolean','char','float','integer','selection','integer_array','float_array')]

class IrModel(models.Model):
    _inherit = ['ir.model']
     
    manual_field_id = fields.One2many('ir.model.fields', 'model_id', string='Fields', required=True, copy=True,
                                      domain=[('name','=like','x_%')])
     
    def button_open_fields(self):
        return {
            'name': 'fields',
            'view_type': 'form',
            'view_mode': 'tree',
            'res_model': 'ir.model.fields',
            'view_id': self.env.ref('favite_common.view_model_fields_tree').id,
            'type': 'ir.actions.act_window',
            'domain': [('model_id', '=', self.id),('name','=like','x_%')],
            'context':{'default_model_id':self.id,'default_model':self.model}
        }
#     
# 
#             
#         try:
#             if ttype2 == 'char':
#                 return default_value
#             elif ttype2 == 'boolean':
#                 if default_value.lower() not in ('true','false'):
#                     raise
#                 return default_value.lower() == 'true'
#             elif ttype2 == 'float':
#                 return float(default_value)
#             elif ttype2 == 'integer':
#                 return int(default_value)
#             elif ttype2 == 'selection':
#                 sel = safe_eval(selection)
#                 for value,_ in sel:
#                     if value == default_value:
#                         return value
#             elif ttype2 == 'integer_array':
#                 values = map(lambda v:int(v) ,default_value.split(','))
#                 return  ','.join(map(lambda v:str(v),values))    
#             elif ttype2 == 'float_array':
#                 values = map(lambda v:float(v) ,default_value.split(','))
#                 return  ','.join(map(lambda v:str(v),values))  
#             raise
#         except Exception as e:
#             raise ValidationError("Default value is incorrect!")
        
    
                        
                


class IrModelFields(models.Model):
    _inherit = ['ir.model.fields']
    
    ttype = fields.Selection(selection=FIELD_TYPES, string='Field Type', required=True)
    ttype2 = fields.Selection(selection=FIELD_TYPES2, string='Field Type',default='char')
    locate = fields.Char(string='Locate')
    sequence = fields.Integer(default=0)
    range_value = fields.Char(string='Range',help="specified as range for a numbric field, "
                                 "For example: (10,20) (~,200) [10,20) (10,~) ")
    default_value = fields.Char(string='Default')
    
    @api.one
    @api.constrains('ttype2', 'default_value')
    def _check_default_value(self):
        if not self.default_value:
            return
        self._parse_default_value()
        
    @api.one
    @api.constrains('ttype2', 'range_value')
    def _check_range_value(self):
        if not self.range_value:
            return
        
        result = range_vaule_re.match(self.range_value)
        if not result:
            raise ValidationError("Range value is incorrect!")
        if result.group(1) != '~' and result.group(2) != '~' and int(result.group(1)) >= int(result.group(2)):
            raise ValidationError("Range value is incorrect!")
        

    @api.onchange('complete_name')
    def _onchange_complete_name(self):
        if self.complete_name and self.state == 'manual':
            self.name = 'x_' + self.complete_name.replace('.','_')
            
    @api.onchange('ttype2')
    def _onchange_ttype2(self):
        if self.ttype2 and self.state == 'manual':
            self.ttype = self.ttype2
            
    def _instanciate_attrs(self, field_data):
        attrs = super(IrModelFields, self)._instanciate_attrs(field_data)
        
        if field_data['state'] == 'manual' and field_data['default_value']:
            attrs['default'] = field_data['default_value']
            
        return attrs
    
    def _add_manual_fields(self, model):
        super(IrModelFields, self)._add_manual_fields(model)
        
        cr = self._cr
        def process(table, key, definition):
            conname = '%s_%s' % (table, key)
            current_definition = constraint_definition(cr, table, conname)
            if not current_definition:
                # constraint does not exists
                add_constraint(cr, table, conname, definition)
            elif current_definition != definition:
                # constraint exists but its definition may have changed
                drop_constraint(cr, table, conname)
                add_constraint(cr, table, conname, definition)
        
        fields_data = self._get_manual_field_data(model._name)
        for name, field_data in fields_data.items():
            if field_data['state'] != 'manual':
                continue
            if field_data['ttype'] not in ('float','integer') :
                continue
            if  not field_data['range_value']:
                continue 
            
            result = range_vaule_re.match(field_data['range_value'])
            for i in (1,2):
                if result.group(i) == '~':
                    if i == 1:
                        conname = model._table + '_' + field_data['name'] + '_min'
                    else:
                        conname = model._table + '_' + field_data['name'] + '_max'
                        
                    drop_constraint(cr, model._table, conname)   
                    continue
                
                value = int(result.group(i))
                if i == 1:
                    key = field_data['name'] + '_min'
                    definition = 'CHECK(%s <= %s)' % (value, field_data['name']) 
                    model.pool._sql_error[model._table + '_' + key] = "%s must be greater than %d " % (field_data['name'], value)
                else:
                    key = field_data['name'] + '_max'
                    definition = 'CHECK(%s >= %s)' % (value, field_data['name']) 
                    model.pool._sql_error[model._table + '_' + key] = "%s must be less than %d " % (field_data['name'], value)
                            
                process(model._table, key, definition)
    
    def _parse_default_value(self,field_data=None):
        if field_data:
            ttype2 = field_data['ttype2']
            selection = field_data['selection']
            default_value = field_data['default_value']
        else:
            ttype2 = self.ttype2
            selection = self.selection
            default_value = self.default_value
