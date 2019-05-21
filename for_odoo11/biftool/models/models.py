# -*- coding: utf-8 -*-

from odoo import models, fields, api,_
from odoo.http import request
import odoo
import json
import os
import re
import math
from PIL import Image
from io import BytesIO
import base64
from ctypes import *

from lxml import etree
from lxml.etree import LxmlError
from lxml.builder import E

from odoo.exceptions import UserError, ValidationError
from suds import null
from odoo.tools import pickle
from _collections import defaultdict

try:
    import configparser as ConfigParser
except ImportError:
    import ConfigParser
import logging   

_logger = logging.getLogger(__name__) 


BIFNAME_PATTERN = '^[a-zA-Z0-9][a-zA-Z0-9_-]+$'

class BiftoolMixIn(models.AbstractModel):
    _name = "biftool.mixin"
    _description = 'Biftool Mixin'
    
    _order = 'sequence, id'
    
    @api.depends('sequence')
    def _compute_desc(self):
        for item in self:
            ids = self.env[self._name].search([('bif_id', '=', item.bif_id.id)]).ids
            item.name = '%s%d' %(self._description,ids.index(item.id))
    
    name = fields.Char(compute='_compute_desc')
    
    sequence = fields.Integer(default=0)
    bif_id = fields.Many2one('biftool.bif',string = "bif",default=lambda self: self.env.context.get('default_bif_id'),ondelete='cascade')
    
    @api.model
    def _get_default_form_view(self):
        g1 = {}
        g2 = {}
            
        
        sheet = E.sheet()
        form = E.form(sheet)
        
        fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
        for fname, field in sorted(fields_data.items(), key=lambda f: f[1]['x_sequence']):
            if field['state'] != 'manual':
                continue
            if not fname.startswith('x_'):
                continue
                
            if 'x_scope' not in field or field['x_scope'] is None:
                names = ['Others']
            else:
                names = [field['x_scope']]
            if len(names) == 1:
                names = ['Common']+ names
                    
            key2 = names[0]
            if key2 not in g1:
                g = E.group()
                g1[key2] = g
                sheet.append(g)
                    
            key3 = names[0] + '.' + names[1] 
            if key3 not in g2:
                g = E.group(string=names[1])
                g2[key3] = g
                g1[key2].append(g)
                    
            g2[key3].append(E.field(name=fname))
  
        return form
    
    @api.model
    def _get_default_tree_view(self):
        tree = E.tree(string=self._description)
        
        element = E.field(name='sequence',widget="handle")
        tree.append(element)
        element1 = E.field(name='name')
        tree.append(element1)
        
        fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
        for fname, field in sorted(fields_data.items(), key=lambda f: f[1]['x_sequence']):
            if field['state'] != 'manual':
                continue
            if not fname.startswith('x_'):
                continue
                
            element = E.field(name=fname)
            tree.append(element)
        
        return tree         
            
class Bif(models.Model):
    _name = 'biftool.bif'
    
    _inherit = ['padtool.mixin']
    
    name = fields.Char(required=True)
    summary = fields.Text('Summary', translate=True)
    camera_ids = fields.One2many('biftool.camera', 'bif_id', string='Cameras')
    mark_ids = fields.One2many('biftool.mark', 'bif_id', string='Marks')
    gsp_ids = fields.One2many('biftool.gsp', 'bif_id', string='Gsp')
    subpanel_ids = fields.One2many('biftool.subpanel', 'bif_id', string='subpanel')
    save_region_ids = fields.One2many('biftool.save_region', 'bif_id', string='save_region')
    review_region_ids = fields.One2many('biftool.review_region', 'bif_id', string='review_region')
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Bif name already exists !"),
    ]
    
    @api.depends('subpanel_ids')
    def _compute_subpanel_count(self):
        for bif in self:
            bif.subpanel_count = len(bif.subpanel_ids)
    subpanel_count = fields.Integer(compute='_compute_subpanel_count', string="subpanel Count")
    
    @api.depends('gsp_ids')
    def _compute_gsp_count(self):
        for bif in self:
            bif.gsp_count = len(bif.gsp_ids)
    gsp_count = fields.Integer(compute='_compute_gsp_count', string="Gsp Count")
    
    @api.depends('mark_ids')
    def _compute_mark_count(self):
        for bif in self:
            bif.mark_count = len(bif.mark_ids)
    mark_count = fields.Integer(compute='_compute_mark_count', string="Mark Count")
    
    @api.depends('camera_ids')
    def _compute_camera_count(self):
        for bif in self:
            bif.camera_count = len(bif.camera_ids)
    camera_count = fields.Integer(compute='_compute_camera_count', string="Camera Count")
    
    @api.depends('save_region_ids')
    def _compute_save_region_count(self):
        for bif in self:
            bif.save_region_count = len(bif.save_region_ids)
    save_region_count = fields.Integer(compute='_compute_save_region_count', string="save_region Count")
    
    @api.depends('review_region_ids')
    def _compute_review_region_count(self):
        for bif in self:
            bif.review_region_count = len(bif.review_region_ids)
    review_region_count = fields.Integer(compute='_compute_review_region_count', string="review_region Count")
    
    @api.model
    def load_views(self, views, options=None):
        result = super(Bif, self).load_views(views, options)
        
        spec = self.env['ir.model.fields'].get_scopes(self);
        
        
        if 'form' in result['fields_views'] and result['fields_views']['form']['name'] == 'Bif Parameter':
            root = E.xpath(expr="//sheet", position="inside")
            
            notebook = E.notebook()
            root.append(notebook)
            
            pages = {}
            g1 = {}
            g2 = {}

            fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
            for fname, field in sorted(fields_data.items(), key=lambda f: f[1]['x_sequence']):
                if field['state'] != 'manual':
                    continue
                if not fname.startswith('x_'):
                    continue
                
                if 'x_scope' not in field or field['x_scope'] is None:
                    names = ['Common','  ','  ']
                else:
                    names = field['x_scope'].split('.')
                    if len(names) == 1:
                        names = names + ['  ','  ']
                    elif len(names) == 2:
                        names = names + ['  ']
                        
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
            
            
            root.append(notebook)
            src = etree.fromstring(result['fields_views']['form']['arch'])
            View = self.env['ir.ui.view']
            dest = View.apply_inheritance_specs(src,root,0)
            result['fields_views']['form']['arch'] = etree.tostring(dest, encoding='unicode')
        
        return result
        
    
    @api.model
    def create(self, vals):
        if not re.match(BIFNAME_PATTERN, vals['name']):
            raise ValidationError(_('Invalid pad name. Only alphanumerical characters, underscore, hyphen are allowed.'))

            
        bif = super(Bif, self).create(vals)
        return bif
    
    @api.multi
    def copy(self, default=None):
        if default is None:
            default = {}
        if not default.get('name'):
            default['name'] = "%s_copy" % self.name

        return super(Bif, self).copy(default)
    
    
            
    @api.multi
    def write(self, values):

        return super(Bif, self).write(values)
    
    @api.multi
    def close_dialog(self):
        return {'type': 'ir.actions.act_window_close'}

    @api.multi
    def edit_dialog(self):
        form_view = self.env.ref('biftool.bif_view_form')
        return {
            'name': _('Bif'),
            'res_model': 'biftool.bif',
            'res_id': self.id,
            'views': [(form_view.id, 'form'),],
            'type': 'ir.actions.act_window',
            'target': 'inline'
        }
        
    @api.model
    def open_kanban(self):
        menu_id = self.env.context['params']['menu_id']
        menu = self.env['ir.ui.menu'].browse(menu_id)
        parts=[c for c in menu.complete_name.split('/') if c]
        return {
            'type': 'ir.actions.act_window',
            'name': "Bifs",
            'res_model': "biftool.bif",
            'view_mode': 'kanban,form',
            'view_id': False,
            'view_type': 'form',
            'domain': [],
            'target': 'current',
            'flags':{'import_enabled':False,'import_bif_enabled':True}
            }
        
    
        
    @api.model
    def import_bif(self,file,menu_id):
        written = True
        message = ''
       
        try:
            parser = ConfigParser.RawConfigParser()
            parser.read_string("[DEFAULT]\r\n" + file.read().decode())
            par = parser._defaults
            
            def fill_value(model,data,prefix=''):
                fields_data = self.env['ir.model.fields']._get_manual_field_data(model._name)
                for name, field in model._fields.items():
                    if not field.manual or not name.startswith('x_'):
                        continue
                
                    complete_name = prefix + fields_data[name]['complete_name']
                    if complete_name.lower() in par:
                        value = par[complete_name.lower()]
                        data[name] = field.convert_to_cache(value, model)   
                        if isinstance(data[name], bool):
                            data[name] = value == '1' 
            
            bif = {'name':file.filename.split('.')[0]}                
            fill_value(self,bif)                
            bif_rec = self.create(bif)
            
            cameraNumber = int(par.get('auops.config.camera.num',0))
            camera_model = self.env['biftool.camera']
            for c in range(0, cameraNumber):
                camera = {'bif_id' : bif_rec.id} 
                fill_value(camera_model,camera,'auops.config.camera.%d.' % c)     
                camera_rec = camera_model.create(camera) 
                 
                scanNumber = int(par.get('auops.config.camera.%d.scan_num' % c,0))
                scan_model = self.env['biftool.camera_scan']
                for s in range(0, scanNumber):       
                    scan = {'bif_id' : bif_rec.id,'camera_id':camera_rec.id} 
                    fill_value(scan_model,scan,'auops.config.camera.%d.scan.%d.' % (c,s))     
                    fill_value(scan_model,scan,'cellneighbor.check.greyregion.camera%d.scan%d.' % (c,s)) 
                    scan_model.create(scan) 
                    
                    
            number = int(par.get('auops.test.review_region_number',0))
            model = self.env['biftool.review_region']
            for n in range(0, number):
                dt = {'bif_id' : bif_rec.id} 
                fill_value(model,dt,'auops.test.review_region%d.' % n)     
                model.create(dt) 
                
            number = int(par.get('auops.image.save_region_num',0))
            model = self.env['biftool.save_region']
            for n in range(0, number):
                dt = {'bif_id' : bif_rec.id} 
                fill_value(model,dt,'auops.image.save_region_%d.' % n)     
                model.create(dt)
                
            model = self.env['biftool.mark']
            for n in range(1, 100):
                if 'auops.mark.mark_%d.type'%n not in par:
                    break
                
                dt = {'bif_id' : bif_rec.id} 
                fill_value(model,dt,'auops.mark.mark_%d.' % n)     
                if len(dt) > 1:   
                    model.create(dt)

            model = self.env['biftool.gsp']
            pad = self.env['padtool.pad']
            gsp = {}
            for n in range(1, 100):
                if 'auops.global_subpanel_data.gsp_%d.cellneighbor.check.cellsize'%n not in par:
                    break
                
                pad_name = par['auops.global_subpanel_data.gsp_%d.cellneighbor.check.padfile'%n].split('.')[0]
                pad_id = pad.search([('name','=',pad_name)]).id
                dt = {'bif_id' : bif_rec.id,'pad_id':pad_id} 
                fill_value(model,dt,'auops.global_subpanel_data.gsp_%d.' % n)  
                if len(dt) > 1:   
                    rec = model.create(dt)
                    gsp['gsp_%d'%n] = rec.id
            
            model = self.env['biftool.subpanel']
            for n in range(1, 100):
                if 'auops.subpanel.subpanel_%d.global_subpanel_data'%n not in par:
                    break
                
                gsp_name = par['auops.subpanel.subpanel_%d.global_subpanel_data'%n]
                dt = {'bif_id' : bif_rec.id,'gsp_id':gsp[gsp_name]} 
                fill_value(model,dt,'auops.subpanel.subpanel_%d.' % n)  
                if len(dt) > 1:   
                    model.create(dt)
                    
        except Exception as e:
            written = False
            message = str(e)
        return {'success': written,'message':message}
    
    

class Camera(models.Model):
    _name = "biftool.camera"
    _description = "Camera"
    _inherit = ['padtool.mixin','biftool.mixin']

    scan_ids = fields.One2many('biftool.camera_scan', 'camera_id', string='Scans')

    @api.model
    def _get_default_form_view(self):
        form = result = super(Camera, self)._get_default_form_view()
        sheet = form[0]
        sheet.append(E.newline())
        sheet.append(E.field(name='scan_ids'))
        sheet.append(E.newline())    
        return form

class CameraScan(models.Model):
    _name = "biftool.camera_scan"
    _description = "Scan"
    _inherit = ['padtool.mixin','biftool.mixin']
    
    camera_id = fields.Many2one('biftool.camera',string = "camera",ondelete='cascade')
    
    @api.depends('sequence')
    def _compute_desc(self):
        for item in self:
            ids = self.env[self._name].search([('camera_id', '=', item.camera_id.id)]).ids
            item.name = '%s%d' %(self._description,ids.index(item.id))


class SaveRegion(models.Model):
    _name = "biftool.save_region"
    _description = "save_region"
    _inherit = ['padtool.mixin','biftool.mixin']
    
class ReviewRegion(models.Model):
    _name = "biftool.review_region"
    _description = "review_region"
    _inherit = ['padtool.mixin','biftool.mixin']

class Mark(models.Model):
    _name = "biftool.mark"
    _description = "Mark"
    _inherit = ['padtool.mixin','biftool.mixin']
    

class Gsp(models.Model):
    _name = "biftool.gsp"
    _description = "Gsp"
    _inherit = ['padtool.mixin','biftool.mixin']
    
    pad_id = fields.Many2one('padtool.pad',string = "pad")
    
    @api.model
    def _get_default_form_view(self):
        
        form = result = super(Gsp, self)._get_default_form_view()
        group = form[0][0][0]
        
        group.append(E.field(name='pad_id',options="{'no_create': True}"))
            
        return form
    
class Subpanel(models.Model):
    _name = "biftool.subpanel"
    _description = "Subpanel"
    _inherit = ['padtool.mixin','biftool.mixin']
    
    gsp_id = fields.Many2one('biftool.gsp',string = "gsp", domain="[('bif_id', '=', default_bif_id)]")
    
    @api.model
    def _get_default_form_view(self):
        
        form = result = super(Subpanel, self)._get_default_form_view()
        group = form[0][0][0]
        
        group.append(E.field(name='gsp_id',options="{'no_create': True}"))
            
        return form
