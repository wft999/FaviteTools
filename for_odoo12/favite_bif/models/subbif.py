# -*- coding: utf-8 -*-
import logging
import os       
import sympy

from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools,_
try:
    import configparser as ConfigParser
except ImportError:
    import ConfigParser

_logger = logging.getLogger(__name__)

class Frame(models.Model):
    _name = 'favite_bif.frame'
    _inherit = ['favite_common.geometry']
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Name already exists !"),
    ]
    
    @api.model
    def _default_geo(self):
        gmd = self.env['favite_gmd.gmd'].browse(self._context['default_gmd_id'])
        geo = {
        "filter":{"objs":[]},
        "inspect":{"objs":[]},
        "glass":gmd.geo['glass']
        }
        return geo
    
    @api.one
    @api.depends('gmd_id','gmd_id.geo')
    def _compute_geo(self):
        self.geo['filter'] = self.geo['filter'] or {"objs":[]}
        self.geo['inspect'] = self.geo['inspect'] or {"objs":[]}
        self.geo['glass'] = self.gmd_id.geo['glass']
    
    geo = fields.Jsonb(string = "geometry value",default=_default_geo)
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade', require=True)
    
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    @api.multi
    def get_formview_id(self, access_uid=None):
        return self.env.ref('favite_bif.favite_bif_frame_map').id
    
    @api.one
    def export_file(self,directory_ids):

        strParameter = ''
        fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
        for name, field in self._fields.items():
            if not field.manual or not name.startswith('x_'):
                continue
            elif field.type == 'boolean' or field.type == 'selection':
                strParameter += '%s = %d\n' % (fields_data[name]['complete_name'],self[name])
            else:
                strParameter += '%s = %s\n' % (fields_data[name]['complete_name'],field.convert_to_export(self[name],self))
                
        for d in directory_ids:  
            dir = os.path.join(d.name ,'bif')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            dir = os.path.join(dir ,'frame')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            path = os.path.join(dir,self.name+'.frm')
            with open(path,'w') as f:
                f.write(strParameter)
        
        
    @api.model
    def import_file(self,file):
        written = True
        message = 'Success'

        obj = {'name':file.filename.split('.')[0]}
        
        try:
            parser = ConfigParser.RawConfigParser()
            parser.read_string("[DEFAULT]\r\n" + file.read().decode())
            par = parser._defaults

            fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
            for name, field in self._fields.items():
                if not field.manual or not name.startswith('x_'):
                    continue
                
                complete_name = fields_data[name]['complete_name']
                if complete_name.lower() in par:
                    value = par[complete_name.lower()]
                    obj[name] = field.convert_to_cache(value, self)   
                    if isinstance(obj[name], bool):
                        obj[name] = value == '1' 
             
            self.create(obj)   
                       
        except Exception as e:
            written = False
            message = str(e)
        return {'success': written,'message':message}
    
class Mark(models.Model):
    _name = 'favite_bif.mark'
    _inherit = ['favite_common.geometry']
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Name already exists !"),
    ]
    
    @api.model
    def _default_geo(self):
        gmd = self.env['favite_gmd.gmd'].browse(self._context['default_gmd_id'])
        geo = {
        "region":{"objs":[]},
        "glass":gmd.geo['glass']
        }
        return geo
    
    geo = fields.Jsonb(string = "geometry value",default=_default_geo)
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade', require=True)
    
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    @api.multi
    def get_formview_id(self, access_uid=None):
        return self.env.ref('favite_bif.favite_bif_mark_map').id
    
    @api.one
    def export_file(self,directory_ids):

        strParameter = ''
        fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
        for name, field in self._fields.items():
            if not field.manual or not name.startswith('x_'):
                continue
            elif field.type == 'boolean' or field.type == 'selection':
                strParameter += '%s = %d\n' % (fields_data[name]['complete_name'],self[name])
            else:
                strParameter += '%s = %s\n' % (fields_data[name]['complete_name'],field.convert_to_export(self[name],self))
                
        for d in directory_ids:  
            dir = os.path.join(d.name ,'bif')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            dir = os.path.join(dir ,'mark')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            path = os.path.join(dir,self.name+'.mrk')
            with open(path,'w') as f:
                f.write(strParameter)
        
        
    @api.model
    def import_file(self,file):
        written = True
        message = 'Success'

        obj = {'name':file.filename.split('.')[0]}
        
        try:
            parser = ConfigParser.RawConfigParser()
            parser.read_string("[DEFAULT]\r\n" + file.read().decode())
            par = parser._defaults

            fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
            for name, field in self._fields.items():
                if not field.manual or not name.startswith('x_'):
                    continue
                
                complete_name = fields_data[name]['complete_name']
                if complete_name.lower() in par:
                    value = par[complete_name.lower()]
                    obj[name] = field.convert_to_cache(value, self)   
                    if isinstance(obj[name], bool):
                        obj[name] = value == '1' 
             
            self.create(obj)   
                       
        except Exception as e:
            written = False
            message = str(e)
        return {'success': written,'message':message}
    
class Measure(models.Model):
    _name = 'favite_bif.measure'
    _inherit = ['favite_common.geometry']
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Name already exists !"),
    ]
    
    @api.model
    def _default_geo(self):
        gmd = self.env['favite_gmd.gmd'].browse(self._context['default_gmd_id'])
        geo = {
        "film_region":{"objs":[]},
        "mark_region":{"objs":[]},
        "glass":gmd.geo['glass']
        }
        return geo
    
    geo = fields.Jsonb(string = "geometry value",default=_default_geo)
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade', require=True)
    
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    @api.multi
    def get_formview_id(self, access_uid=None):
        return self.env.ref('favite_bif.favite_bif_measure_map').id
    
    @api.one
    def export_file(self,directory_ids):

        strParameter = ''
        fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
        for name, field in self._fields.items():
            if not field.manual or not name.startswith('x_'):
                continue
            elif field.type == 'boolean' or field.type == 'selection':
                strParameter += '%s = %d\n' % (fields_data[name]['complete_name'],self[name])
            else:
                strParameter += '%s = %s\n' % (fields_data[name]['complete_name'],field.convert_to_export(self[name],self))
                
        for d in directory_ids:  
            dir = os.path.join(d.name ,'bif')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            dir = os.path.join(dir ,'measure')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            path = os.path.join(dir,self.name+'.msr')
            with open(path,'w') as f:
                f.write(strParameter)
        
        
    @api.model
    def import_file(self,file):
        written = True
        message = 'Success'

        obj = {'name':file.filename.split('.')[0]}
        
        try:
            parser = ConfigParser.RawConfigParser()
            parser.read_string("[DEFAULT]\r\n" + file.read().decode())
            par = parser._defaults

            fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
            for name, field in self._fields.items():
                if not field.manual or not name.startswith('x_'):
                    continue
                
                complete_name = fields_data[name]['complete_name']
                if complete_name.lower() in par:
                    value = par[complete_name.lower()]
                    obj[name] = field.convert_to_cache(value, self)   
                    if isinstance(obj[name], bool):
                        obj[name] = value == '1' 
             
            self.create(obj)   
                       
        except Exception as e:
            written = False
            message = str(e)
        return {'success': written,'message':message}
    
class Fixpoint(models.Model):
    _name = 'favite_bif.fixpoint'
    _inherit = ['favite_common.geometry']
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Name already exists !"),
    ]
    
    @api.model
    def _default_geo(self):
        gmd = self.env['favite_gmd.gmd'].browse(self._context['default_gmd_id'])
        geo = {
        "region":{"objs":[]},
        "glass":gmd.geo['glass']
        }
        return geo
    
    geo = fields.Jsonb(string = "geometry value",default=_default_geo)
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade', require=True)
    
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    @api.multi
    def get_formview_id(self, access_uid=None):
        return self.env.ref('favite_bif.favite_bif_fixpoint_map').id
    
    @api.one
    def export_file(self,directory_ids):

        strParameter = ''
        fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
        for name, field in self._fields.items():
            if not field.manual or not name.startswith('x_'):
                continue
            elif field.type == 'boolean' or field.type == 'selection':
                strParameter += '%s = %d\n' % (fields_data[name]['complete_name'],self[name])
            else:
                strParameter += '%s = %s\n' % (fields_data[name]['complete_name'],field.convert_to_export(self[name],self))
                
        for d in directory_ids:  
            dir = os.path.join(d.name ,'bif')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            dir = os.path.join(dir ,'fixpoint')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            path = os.path.join(dir,self.name+'.fxp')
            with open(path,'w') as f:
                f.write(strParameter)
        
        
    @api.model
    def import_file(self,file):
        written = True
        message = 'Success'

        obj = {'name':file.filename.split('.')[0]}
        
        try:
            parser = ConfigParser.RawConfigParser()
            parser.read_string("[DEFAULT]\r\n" + file.read().decode())
            par = parser._defaults

            fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
            for name, field in self._fields.items():
                if not field.manual or not name.startswith('x_'):
                    continue
                
                complete_name = fields_data[name]['complete_name']
                if complete_name.lower() in par:
                    value = par[complete_name.lower()]
                    obj[name] = field.convert_to_cache(value, self)   
                    if isinstance(obj[name], bool):
                        obj[name] = value == '1' 
             
            self.create(obj)   
                       
        except Exception as e:
            written = False
            message = str(e)
        return {'success': written,'message':message}
    
class Lut(models.Model):
    _name = 'favite_bif.lut'   
    _inherit = ['favite_common.geometry']  
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Name already exists !"),
    ]
    
    @api.model
    def calc_lut(self,x1,y1):
        x=sympy.Symbol('x')
        y=sympy.Symbol('y')
        t=sympy.Symbol('t')
        
        fx = 2*x1*t*(1-t)+2048*(t**2) - x
        fy = 2*y1*t*(1-t)+2048*(t**2) - y
        
        lut = []
        t1 = 2048.0 / 256.0
        t2 = 256.0 / 2048.0
        for p in range(256):
            lut.append(p)
            f = x - p*t1
            res = sympy.solve([fx,fy,f],[x,y,t])
            for r in res:
                if r[2] >= 0 and r[2] <= 1:
                    lut[p] = r[1] * t2
                    break
                    

        return lut
    
    @api.model
    def _default_geo(self):
        gmd = self.env['favite_gmd.gmd'].browse(self._context['default_gmd_id'])
        geo = {
        "controlpoint":[{'x':1000,'y':1000}],
        "glass":gmd.geo['glass']
        }
        return geo
    
    geo = fields.Jsonb(string = "geometry value",default=_default_geo)   
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade', require=True)    
    
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    @api.multi
    def get_formview_id(self, access_uid=None):
        return self.env.ref('favite_bif.favite_bif_lut_map').id
    
    @api.one
    def export_file(self,directory_ids):

        strParameter = ''
        fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
        for name, field in self._fields.items():
            if not field.manual or not name.startswith('x_'):
                continue
            elif field.type == 'boolean' or field.type == 'selection':
                strParameter += '%s = %d\n' % (fields_data[name]['complete_name'],self[name])
            else:
                strParameter += '%s = %s\n' % (fields_data[name]['complete_name'],field.convert_to_export(self[name],self))
                
        for d in directory_ids:  
            dir = os.path.join(d.name ,'bif')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            dir = os.path.join(dir ,'lut')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            path = os.path.join(dir,self.name+'.lut')
            with open(path,'w') as f:
                f.write(strParameter)
        
        
    @api.model
    def import_file(self,file):
        written = True
        message = 'Success'

        obj = {'name':file.filename.split('.')[0]}
        
        try:
            parser = ConfigParser.RawConfigParser()
            parser.read_string("[DEFAULT]\r\n" + file.read().decode())
            par = parser._defaults

            fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
            for name, field in self._fields.items():
                if not field.manual or not name.startswith('x_'):
                    continue
                
                complete_name = fields_data[name]['complete_name']
                if complete_name.lower() in par:
                    value = par[complete_name.lower()]
                    obj[name] = field.convert_to_cache(value, self)   
                    if isinstance(obj[name], bool):
                        obj[name] = value == '1' 
             
            self.create(obj)   
                       
        except Exception as e:
            written = False
            message = str(e)
        return {'success': written,'message':message}