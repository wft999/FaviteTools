# -*- coding: utf-8 -*-
from lxml import etree
from lxml.etree import LxmlError
from lxml.builder import E

from odoo import models, fields, api
from odoo.tools import pycompat,safe_eval,constraint_definition,drop_constraint,add_constraint
from odoo.exceptions import UserError, ValidationError
from suds import null
from numpy.f2py.auxfuncs import isinteger

class View(models.Model):
    _inherit = 'ir.ui.view'

    type = fields.Selection(selection_add=[('map', "Map")])
    
class ActWindowView(models.Model):
    _inherit = 'ir.actions.act_window.view'

    view_mode = fields.Selection(selection_add=[('map', "Map")])

class GeometryModel(models.Model):
    _name = 'favite_common.geometry'
    
    name = fields.Char(required=True,)
    description = fields.Text()
    imgs_path = fields.Char(required=True,string = "image data directory")
    geo = fields.Jsonb(required=True,string = "geometry value",default="{}")

    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Name already exists !"),
    ]
    
    @api.multi
    def close_dialog(self):
        return {'type': 'ir.actions.act_window_close'}
    
    @api.multi  
    def open_map(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': self.name,
            'res_model': self._name,
            'res_id': self.id,
            'view_id': False,
            'view_type': 'map',
            'view_mode': 'map',
            'target': 'current',
            'flags':{'hasSearchView':False}
            }
        
    @api.model
    def open_kanban(self):
        return {
            'type': 'ir.actions.act_window',
            'name': self._name.split('.')[-1],
            'res_model': self._name,
            'view_mode': 'kanban,form',
            'view_id': False,
            'view_type': 'form',
            'target': 'current',
            'flags':{'import_enabled':False}
            }
    
    @api.model
    def load_views(self, views, options=None):
        result = super(GeometryModel, self).load_views(views, options)

        if 'form' in result['fields_views'] and result['fields_views']['form']['name'].endswith('parameter'):
            notebook = E.xpath(expr="//notebook", position="inside")

            pages = {}
            g1 = {}
            g2 = {}
            
            fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
            for fname, field in sorted(fields_data.items(), key=lambda f: f[1]['sequence']):
                if field['state'] != 'manual':
                    continue
                if not fname.startswith('x_'):
                    continue
                
                if 'locate' not in field or field['locate'] is None:
                    names = ['Common','Unnamed','Others']
                else:
                    names = field['locate'].split('.')
                    if len(names) == 1:
                        names = ['Common','Unnamed']+ names
                    elif len(names) == 2:
                        names = ['Common']+names
                        
                key1 = names[0]
                if key1 not in pages:
                    p = E.page(string=names[0])
                    pages[key1] = p
                    notebook.append(p)
                    
                key2 = names[0] + '.' + names[1]
                if key2 not in g1:
                    g = E.group(string=names[1])
                    g1[key2] = g
                    pages[key1].append(g)
                    
                key3 = names[0] + '.' + names[1]  + '.' + names[2]
                if key3 not in g2:
                    g = E.group(string=names[2])
                    g2[key3] = g
                    g1[key2].append(g)
                    
                g2[key3].append(E.field(name=fname))

            src = etree.fromstring(result['fields_views']['form']['arch'])
            View = self.env['ir.ui.view']
            dest = View.apply_inheritance_specs(src,notebook,0)
            result['fields_views']['form']['arch'] = etree.tostring(dest, encoding='unicode')
        
        return result   