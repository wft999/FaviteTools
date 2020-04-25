# -*- coding: utf-8 -*-
import logging
import os       
try:
    import configparser as ConfigParser
except ImportError:
    import ConfigParser
    
from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools
import random

_logger = logging.getLogger(__name__)


class Recipe(models.Model):
    _name = 'favite_recipe.recipe'
    _inherit = ['favite_common.geometry']
    
    gmd_id = fields.Many2one('favite_gmd.gmd',default=lambda self: self.env.context.get('default_gmd_id'),ondelete='set null')
    judge_id = fields.Many2one('favite_recipe.judge',ondelete='set null')
    filter_id = fields.Many2one('favite_recipe.filter',ondelete='set null')
    mura_id = fields.Many2one('favite_recipe.mura',ondelete='set null')
    decode_id = fields.Many2one('favite_recipe.decode',ondelete='set null')

    color = fields.Integer('Color Index', default=0)    
    
    @api.one
    def export_file(self,directory_ids):
        strSubbif = ''
        if self.gmd_id:
            self.gmd_id.export_file(directory_ids)
            strSubbif += 'recipe.subrecipe.gmd = %s\n' % (self.gmd_id.name) 
            strSubbif += 'recipe.subreicpe.camrera = %s\n' % (self.gmd_id.camera_path)
            
        if self.judge_id:
            self.judge_id.export_file(directory_ids)
            strSubbif += 'recipe.subrecipe.judge = %s\n' % (self.judge_id.name) 
        if self.filter_id:
            self.filter_id.export_file(directory_ids)
            strSubbif += 'recipe.subrecipe.filter = %s\n' % (self.filter_id.name) 
        if self.mura_id:
            self.mura_id.export_file(directory_ids)
            strSubbif += 'recipe.subrecipe.mura = %s\n' % (self.mura_id.name) 
        if self.decode_id:
            self.decode_id.export_file(directory_ids)
            strSubbif += 'recipe.subrecipe.decode = %s\n' % (self.decode_id.name) 
        
        strParameter = ''
        fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
        for name, field in self._fields.items():
            if not field.manual or not name.startswith('x_'):
                continue
            elif field.type == 'boolean' or field.type == 'selection':
                strParameter += 'recipe.%s = %d\n' % (fields_data[name]['complete_name'],self[name])
            else:
                strParameter += 'recipe.%s = %s\n' % (fields_data[name]['complete_name'],field.convert_to_export(self[name],self))
                
        for dir in directory_ids:  
            path = os.path.join(dir.name ,self.name+'.rcp')
            with open(path, 'w') as f:
                f.write(strSubbif)
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
 
class JudgeDefect(models.Model):
    _name = 'favite_recipe.judge_defect'
    _inherit = ['favite_common.geometry']
    _order = 'id'
    _rec_name = 'id'
    
    name = fields.Char(compute=lambda self:'rtdc'+self.id)
    judge_id = fields.Many2one('favite_recipe.judge',ondelete='cascade')
    
    @api.one
    def export(self,prefix):
        str = ''
        str += '%s%s = %d\n' % (prefix,'id',self.id)
        fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
        for name, field in self._fields.items():
            if not field.manual or not name.startswith('x_'):
                continue
            elif field.type == 'boolean' or field.type == 'selection':
                str += '%s%s = %d\n' % (prefix,fields_data[name]['complete_name'],self[name])
            else:
                str += '%s%s = %s\n' % (prefix,fields_data[name]['complete_name'],field.convert_to_export(self[name],self))
        return str   
    
    @api.model
    def import2(self,jdg,prefix,par): 
        obj = {'judge_id':jdg.id}
        fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
        for name, field in self._fields.items():
            if not field.manual or not name.startswith('x_'):
                continue
                
            complete_name = prefix + fields_data[name]['complete_name']
            if complete_name.lower() in par:
                value = par[complete_name.lower()]
                obj[name] = field.convert_to_cache(value, self)   
                if isinstance(obj[name], bool):
                    obj[name] = value == '1'     
        
        d = self.create(obj)
        return d.id
    
class JudgeRtdc(models.Model):
    _name = 'favite_recipe.judge_rtdc'
    _inherit = ['favite_common.geometry']
    _order = 'id'
    _rec_name = 'id'
    
    name = fields.Char(compute=lambda self:'rtdc'+self.id)
    judge_id = fields.Many2one('favite_recipe.judge',ondelete='cascade')
    defect_id = fields.Many2one('favite_recipe.judge_defect',ondelete='set null',string='defect type')
    
    @api.one
    def export(self,prefix):
        str = ''
        str += '%s%s = %d\n' % (prefix,'defect.id',self.defect_id.id)
        fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
        for name, field in self._fields.items():
            if not field.manual or not name.startswith('x_'):
                continue
            elif field.type == 'boolean' or field.type == 'selection':
                str += '%s%s = %d\n' % (prefix,fields_data[name]['complete_name'],self[name])
            else:
                str += '%s%s = %s\n' % (prefix,fields_data[name]['complete_name'],field.convert_to_export(self[name],self))
        return str  
    
    @api.model
    def import2(self,jdg,defect,prefix,par): 
        obj = {'judge_id':jdg.id,'defect_id':defect}
        
        
        fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
        for name, field in self._fields.items():
            if not field.manual or not name.startswith('x_'):
                continue
                
            complete_name = prefix + fields_data[name]['complete_name']
            if complete_name.lower() in par:
                value = par[complete_name.lower()]
                obj[name] = field.convert_to_cache(value, self)   
                if isinstance(obj[name], bool):
                    obj[name] = value == '1'     
        
        d = self.create(obj)
        return d.id
        
class Judge(models.Model):
    _name = 'favite_recipe.judge'
    _inherit = ['favite_common.geometry']
    
    defect_ids = fields.One2many('favite_recipe.judge_defect', 'judge_id', string='defect')
    rtdc_ids = fields.One2many('favite_recipe.judge_rtdc', 'judge_id', string='rtdc')
    
    @api.one
    def export_file(self,directory_ids):
        strDefect_ids = 'rtdc.defecttype.number = %d\n' % len(self.defect_ids)
        for i in range(len(self.defect_ids)):
            strDefect_ids += ''.join(self.defect_ids[i].export('rtdc.defecttype.%d.'%i))
        
        strRtdc_ids = 'judge.ng.rtdc.number = %d\n' % len(self.rtdc_ids)  
        for i in range(len(self.rtdc_ids)):
            strRtdc_ids += ''.join(self.rtdc_ids[i].export('judge.ng.rtdc.%d.'%i))

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
            dir = os.path.join(d.name,'judge')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            path = os.path.join(dir,self.name+'.jdg')
            with open(path,'w') as f:
                f.write(strRtdc_ids)
                f.write(strDefect_ids)
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
             
            jdg = self.create(obj)   
            
            id_map = {}
            n = int(par.get('rtdc.defecttype.number',0))
            for i in range(0, n):
                defect = self.env['favite_recipe.judge_defect'].import2(jdg,'rtdc.defecttype.%d.'%i,par)
                id_map[par.get('rtdc.defecttype.%d.id'%i,0)] = defect
                
            n = int(par.get('judge.ng.rtdc.number',0))
            for i in range(0, n):
                defect_id = par.get('judge.ng.rtdc.%d.defect.id'%i,0)
                self.env['favite_recipe.judge_rtdc'].import2(jdg,id_map.get(defect_id,False),'judge.ng.rtdc.%d.'%i,par) 
                       
        except Exception as e:
            written = False
            message = str(e)
        return {'success': written,'message':message} 
    
class FilterRange(models.Model):
    _name = 'favite_recipe.filter_range'

    sequence = fields.Integer(default=0)
    center_x = fields.Integer(string='center x')
    center_y = fields.Integer(string='center y')
    width = fields.Integer()
    height = fields.Integer()
    filter_id = fields.Many2one('favite_recipe.filter',ondelete='cascade')
    
    @api.one
    def export(self,prefix):
        str = ''
        str += '%s%s = %d,%d\n' % (prefix,'range.center',self.center_x,self.center_y)
        str += '%s%s = %d,%d\n' % (prefix,'range.size',self.width,self.height)
        
        fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
        for name, field in self._fields.items():
            if not field.manual or not name.startswith('x_'):
                continue
            elif field.type == 'boolean' or field.type == 'selection':
                str += '%s%s = %d\n' % (prefix,fields_data[name]['complete_name'],self[name])
            else:
                str += '%s%s = %s\n' % (prefix,fields_data[name]['complete_name'],field.convert_to_export(self[name],self))
        return str  
    
    @api.model
    def import2(self,flt,prefix,par): 
        obj = {'filter_id':flt.id}
        
        complete_name = prefix + "range.center"
        if complete_name.lower() in par:
            value = par[complete_name.lower()]
            obj['center_x'],obj['center_y'] = (int(s) for s in value.split(','))
            
        complete_name = prefix + "range.size"
        if complete_name.lower() in par:
            value = par[complete_name.lower()]
            obj['width'],obj['height'] = (int(s) for s in value.split(','))
        
        fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
        for name, field in self._fields.items():
            if not field.manual or not name.startswith('x_'):
                continue
                
            complete_name = prefix + fields_data[name]['complete_name']
            if complete_name.lower() in par:
                value = par[complete_name.lower()]
                obj[name] = field.convert_to_cache(value, self)   
                if isinstance(obj[name], bool):
                    obj[name] = value == '1'     
        
        d = self.create(obj)
        return d.id
    
class Filter(models.Model):
    _name = 'favite_recipe.filter'
    _inherit = ['favite_common.geometry'] 
    
    range_ids = fields.One2many('favite_recipe.filter_range', 'filter_id', string='Range')
    
    @api.one
    def export_file(self,directory_ids):
        range_ids = 'filter.number = %d\n' % len(self.range_ids)
        for i in range(len(self.range_ids)):
            range_ids += ''.join(self.range_ids[i].export('filter.%d.'%i))

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
            dir = os.path.join(d.name,'filter')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            path = os.path.join(dir,self.name+'.flt')
            with open(path,'w') as f:
                f.write(range_ids)
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
             
            flt = self.create(obj)   

            n = int(par.get('filter.number',0))
            for i in range(0, n):
                self.env['favite_recipe.filter_range'].import2(flt,'filter.%d.'%i,par)
                       
        except Exception as e:
            written = False
            message = str(e)
        return {'success': written,'message':message} 
    
class Mura(models.Model):
    _name = 'favite_recipe.mura'
    _inherit = ['favite_common.geometry']
    
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
            dir = os.path.join(d.name ,'mura')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            path = os.path.join(dir,self.name+'.mra')
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
    
class Decode(models.Model):
    _name = 'favite_recipe.decode'
    _inherit = ['favite_common.geometry']    
    
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
            dir = os.path.join(d.name ,'decode')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            path = os.path.join(dir,self.name+'.dco')
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
    
