# -*- coding: utf-8 -*-
import logging
import os       
import copy   
import math 
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
        geo = {
        "filter":{"objs":[]},
        "inspect":{"objs":[]},
        }
            
        return geo
    
    geo = fields.Jsonb(string = "geometry value",default=_default_geo)
    
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade', require=True)
    glass = fields.Jsonb(related='gmd_id.glass', readonly=True)
    
    camera_path = fields.Char(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    @api.multi
    def get_formview_id(self, access_uid=None):
        return self.env.ref('favite_bif.favite_bif_frame_map').id
    
    def _export_geo(self):
        iniFile = os.path.join(self.camera_path , self.gmd_id.camera_name)
        iniConf = ConfigParser.RawConfigParser()
        with open(iniFile, 'r') as f:
            iniConf.read_string("[DEFAULT]\r\n" + f.read())
            dGlassCenterX,dGlassCenterY = (float(s) for s in iniConf._defaults['glass.center.position.0'].split(','))
            dAngle = float(iniConf._defaults['glass.angle.0'])
            
            geo = copy.deepcopy(self.geo)     
            for o in geo['filter']['objs']:
                for p in o['points']:
                    dInputX = p['x']
                    dInputY = p['y']
                    p['x'] = (dInputX -dGlassCenterX) * math.cos(dAngle) + (dInputY - dGlassCenterY) * math.sin(dAngle);
                    p['y'] = -(dInputX - dGlassCenterX) * math.sin(dAngle) + (dInputY - dGlassCenterY) * math.cos(dAngle);
                    
            for o in geo['inspect']['objs']:
                for p in o['points']:
                    dInputX = p['x']
                    dInputY = p['y']
                    p['x'] = (dInputX -dGlassCenterX) * math.cos(dAngle) + (dInputY - dGlassCenterY) * math.sin(dAngle);
                    p['y'] = -(dInputX - dGlassCenterX) * math.sin(dAngle) + (dInputY - dGlassCenterY) * math.cos(dAngle);
                    

        return geo
    
    def _import_geo(self):
        iniFile = os.path.join(self.camera_path , self.gmd_id.camera_name)
        iniConf = ConfigParser.RawConfigParser()
        with open(iniFile, 'r') as f:
            iniConf.read_string("[DEFAULT]\r\n" + f.read())
            dGlassCenterX,dGlassCenterY = (float(s) for s in iniConf._defaults['glass.center.position.0'].split(','))
            dAngle = float(iniConf._defaults['glass.angle.0'])
            
            geo = self.geo    
            for o in geo['filter']['objs']:
                for p in o['points']:
                    dInputX = p['x']
                    dInputY = p['y']
                    p['x'] = dInputX * math.cos(-dAngle) + dInputY * math.sin(-dAngle) + dGlassCenterX;
                    p['y'] = -dInputX * math.sin(-dAngle) + dInputY * math.cos(-dAngle) + dGlassCenterY;
                    
            for o in geo['inspect']['objs']:
                for p in o['points']:
                    dInputX = p['x']
                    dInputY = p['y']
                    p['x'] = dInputX * math.cos(-dAngle) + dInputY * math.sin(-dAngle) + dGlassCenterX;
                    p['y'] = -dInputX * math.sin(-dAngle) + dInputY * math.cos(-dAngle) + dGlassCenterY;

        
            self.write({'geo': geo})
    
    @api.one
    def export_file(self,directory_ids):
        geo = self._export_geo()
        
        num = 0
        strFilter = ''
        for f in geo['filter']['objs']:
            p1 = f['points'][0]
            p2 = f['points'][1]
            left = min(p1['x'],p2['x'])
            right = max(p1['x'],p2['x'])
            bottom = min(p1['y'],p2['y'])
            top = max(p1['y'],p2['y'])
            strFilter += 'filter.%d.position.topleft = %f,%f\n' % (num,left,bottom)
            strFilter += 'filter.%d.position.topright = %f,%f\n' % (num,right,bottom)
            strFilter += 'filter.%d.position.bottomleft = %f,%f\n' % (num,left,top)
            strFilter += 'filter.%d.position.bottomright = %f,%f\n' % (num,right,top)
            num = num + 1
        strFilter += 'filter.number = %d\n' % (num,)
        
        num = 0
        strInspect = ''
        for f in geo['inspect']['objs']:
            p1 = f['points'][0]
            p2 = f['points'][1]
            left = min(p1['x'],p2['x'])
            right = max(p1['x'],p2['x'])
            bottom = min(p1['y'],p2['y'])
            top = max(p1['y'],p2['y'])
            strInspect += 'inspect.%d.position.topleft = %f,%f\n' % (num,left,bottom)
            strInspect += 'inspect.%d.position.topright = %f,%f\n' % (num,right,bottom)
            strInspect += 'inspect.%d.position.bottomleft = %f,%f\n' % (num,left,top)
            strInspect += 'inspect.%d.position.bottomright = %f,%f\n' % (num,right,top)
            num = num + 1
        strInspect += 'inspect.number = %d\n' % (num,)

        strParameter = ''
        fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
        for name, field in sorted(self._fields.items(), key=lambda f: f[0]):
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
                f.write(strFilter)
                f.write(strInspect)
                f.write('gmd=%s\n'%self.gmd_id.name)
        
        
    @api.model
    def import_file(self,file):
        written = True
        message = 'Success'
        
        obj = {'name':file.filename.split('.')[0]}
        geo = {
        "filter":{"objs":[]},
        "inspect":{"objs":[]},
        }
        
        try:
            parser = ConfigParser.RawConfigParser()
            parser.read_string("[DEFAULT]\r\n" + file.read().decode())
            par = parser._defaults
            
            if 'gmd' in par:
                name = par['gmd']
                gmd = self.env['favite_gmd.gmd'].sudo().search([('name','=',name)])
                if not gmd:
                    raise UserError("File(%s) must first be imported!" % par['gmd'])
            else:
                raise UserError("File(%s) must contain gmd!" % file.filename)
            
            m = int(par.get('filter.number',0))
            for j in range(0, m):
                left,top = (float(s) for s in par['filter.%d.position.topleft'%j].split(','))
                right,bottom = (float(s) for s in par['filter.%d.position.bottomright'%j].split(','))
                o = {'points':[]}
                o['points'].append({'x':left,'y':top})
                o['points'].append({'x':right,'y':bottom})
                geo['filter']['objs'].append(o)
                
            m = int(par.get('inspect.number',0))
            for j in range(0, m):
                left,top = (float(s) for s in par['inspect.%d.position.topleft'%j].split(','))
                right,bottom = (float(s) for s in par['inspect.%d.position.bottomright'%j].split(','))
                o = {'points':[]}
                o['points'].append({'x':left,'y':top})
                o['points'].append({'x':right,'y':bottom})
                geo['inspect']['objs'].append(o)
                
            obj['geo'] = geo
            obj['gmd_id'] = gmd.id

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
             
            self.create(obj)._import_geo()   
                       
        except Exception as e:
            written = False
            message = str(e)
        return {'success': written,'message':message}
    
