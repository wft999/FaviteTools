# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, tools
from docutils.nodes import definition
from email.policy import default


class IrModelConstraint(models.Model):
    _inherit = 'ir.model.constraint'
    
    msg = fields.Char(help="PostgreSQL constraint error message")
    
    
    def _reflect_constraint(self, model, conname, type, definition, module,msg=''):
        """ Reflect the given constraint, to make it possible to delete it later
            when the module is uninstalled. ``type`` is either 'f' or 'u'
            depending on the constraint being a foreign key or not.
        """
        if not module:
            # no need to save constraints for custom models as they're not part
            # of any module
            return
        assert type in ('f', 'u')
        cr = self._cr
        query = """ SELECT type, definition, msg
                    FROM ir_model_constraint c, ir_module_module m
                    WHERE c.module=m.id AND c.name=%s AND m.name=%s """
        cr.execute(query, (conname, module))
        cons = cr.dictfetchone()
        if not cons:
            query = """ INSERT INTO ir_model_constraint
                            (name, date_init, date_update, module, model, type, definition,msg)
                        VALUES (%s, now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC',
                            (SELECT id FROM ir_module_module WHERE name=%s),
                            (SELECT id FROM ir_model WHERE model=%s), %s, %s,%s) """
            cr.execute(query, (conname, module, model._name, type, definition,msg))
        elif cons['type'] != type or (definition and cons['definition'] != definition)  or (msg and cons['msg'] != msg):
            query = """ UPDATE ir_model_constraint
                        SET date_update=now() AT TIME ZONE 'UTC', type=%s, definition=%s, msg=%s
                        WHERE name=%s AND module=(SELECT id FROM ir_module_module WHERE name=%s) """
            cr.execute(query, (type, definition,msg, conname, module))
    
class IrModelData(models.Model):
    _inherit = 'ir.model.data'   
    
    _field_sequence = 0
    
    @api.model
    def _update(self, model, module, values, xml_id=False, store=True, noupdate=False, mode='init', res_id=False):
         
        if model == 'ir.model.fields' and (module == 'padtool' or module == 'biftool') and not xml_id:
            values['complete_name'] = values['name']
            xml_id = '%s%d' % (values['name'].replace('.','_') , values['model_id'])
            
            if 'field_description' not in values:
                values['field_description'] = values['name'].split('.')[-1]
            values['name'] = 'x_' + values['name'].replace('.','_')
            
            if 'scope' in values:
                values['x_scope'] = values['scope']
                del values['scope']
                
            values['x_sequence'] = IrModelData._field_sequence
            IrModelData._field_sequence += 1
            
        return  super(IrModelData, self)._update(model, module, values, xml_id, store, noupdate, mode, res_id)

class IrModelFields(models.Model):
    _inherit = 'ir.model.fields'
    
    def _get_field_types(self):
        return [(key, key) for key in sorted(fields.Field.by_type)]
        
    
    ttype = fields.Selection(selection=_get_field_types, string='Field Type', required=True)
    
    def get_scopes(self,model):
        fields_data = self._get_manual_field_data(model._name)
        for name, field_data in fields_data.items():
            if field_data['state'] != 'manual':
                continue
            
    
    def _add_manual_fields(self, model):
        """ Add extra fields on model. """
        fields_data = self._get_manual_field_data(model._name)
        for name, field_data in fields_data.items():
            if name not in model._fields and field_data['state'] == 'manual':
                field = self._instanciate(field_data)
                if field:
                    model._add_field(name, field)
                    
                    conname = '%s_%s' % (model._table, name)
                    cr = self._cr
                    query = """ SELECT msg, definition
                        FROM ir_model_constraint c, ir_module_module m
                        WHERE c.module=m.id AND c.name=%s AND m.name=%s """
                    cr.execute(query, (conname, model._module))
                    cons = cr.dictfetchone()
                    
                    if cons:
                        for item in model._sql_constraints:
                            if item[0] == name:
                                break
                        else:
                            model._sql_constraints.append((name,cons['definition'],cons['msg'] or ''))
                    
                    
            
    def process_parameter(self,vals):
        if self.model in ('ir.model.fields'):
            return 
        
        if 'default' in vals:
            self.env['ir.default'].set(self.model,vals['name'],vals['default'])

        if vals['ttype'] == 'float' or vals['ttype'] == 'integer'  or vals['ttype'] == 'arraynumeric':
            if vals['ttype'] == 'arraynumeric':
                tname = 'all ("%s")' % vals['name']
            else:
                tname = '"%s"' % vals['name']
                
            if 'max' in vals and 'min' in vals:
                definition = 'CHECK(%s <= %s AND %s >= %s)' % (vals['min'],tname,vals['max'],tname)
                msg = "%s must be in the range of %s to %s" % (vals['name'][2:],vals['min'],vals['max'])
            elif 'max' in vals:
                definition = 'CHECK(%s >= %s)' % (vals['max'],tname)
                msg = "%s must be less than or equal to %s" % (vals['name'][2:],vals['max'])
            elif 'min' in vals:
                definition = 'CHECK(%s <= %s)' % (vals['min'],tname)
                msg = "%s must be greater than or equal to %s" % (vals['name'][2:],vals['min'])
            else:
                definition = None
                
            obj = self.env[self.model]
            cr = self._cr
            conname = '%s_%s' % (obj._table, vals['name'])
                
            current_definition = tools.constraint_definition(cr, conname)
            if definition:
                if not current_definition:
                    tools.add_constraint(cr, obj._table, conname, definition)
                elif current_definition != definition:
                    tools.drop_constraint(cr, obj._table, conname)
                    tools.add_constraint(cr, obj._table, conname, definition)
                
                for index, item in enumerate(obj._sql_constraints):
                     if item[0] == vals['name']:
                         obj._sql_constraints[index] = (vals['name'],definition,msg)
                         break
                else:
                    obj._sql_constraints.append((vals['name'],definition,msg))
                
                    
                self.env['ir.model.constraint']._reflect_constraint(obj,conname,'u',definition,obj._module,msg)
            else:
                if current_definition:
                    tools.drop_constraint(cr, obj._table, conname)
            
        
    
    @api.multi
    def write(self, vals):
        vals2 = dict(vals)
        
        if 'default' in vals2:
            vals2.pop('default')
        if 'max' in vals2:
            vals2.pop('max')
        if 'min' in vals2:
            vals2.pop('min')
            
        res = super(IrModelFields, self).write(vals2)

        self.process_parameter(vals)
            
        return res
    
    
    @api.model
    def create(self, vals):
        vals2 = dict(vals)
        
        if 'default' in vals2:
            vals2.pop('default')
        if 'max' in vals2:
            vals2.pop('max')
        if 'min' in vals2:
            vals2.pop('min')
            
        res = super(IrModelFields, self).create(vals2)

        res.process_parameter(vals)
        
        if vals.get('state', 'manual') == 'manual':
            self.clear_caches()                     # for _existing_field_data()

            if res.model in self.pool:
                # setup models; this re-initializes model in registry
                self.pool.setup_models(self._cr)
                # update database schema of model and its descendant models
                models = self.pool.descendants([res.model], '_inherits')
                self.pool.init_models(self._cr, models, dict(self._context, update_custom_fields=True))
            
        return res