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
    
class Fixpoint(models.Model):
    _name = 'favite_bif.fixpoint'
    _inherit = ['favite_common.geometry']
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Name already exists !"),
    ]
    
    @api.model
    def _default_geo(self):
        geo = {
        "region":{"objs":[]},
        }
        return geo
    
    geo = fields.Jsonb(string = "geometry value",default=_default_geo)
    glass = fields.Jsonb(related='gmd_id.glass', readonly=True)
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade', require=True)
    
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    @api.multi
    def get_formview_id(self, access_uid=None):
        return self.env.ref('favite_bif.favite_bif_fixpoint_map').id
    
    @api.one
    def export_file(self,directory_ids):
        geo = self._export_geo()
        
        num = 0
        strRegion = ''
        for f in geo['region']['objs']:
            p1 = f['points'][0]
            p2 = f['points'][1]
            left = min(p1['x'],p2['x'])
            right = max(p1['x'],p2['x'])
            bottom = min(p1['y'],p2['y'])
            top = max(p1['y'],p2['y'])
            strRegion += 'region.%d.position = %f,%f,%f,%f\n' % (num,left,top,right,bottom)
            num = num + 1
        strRegion += 'region.number = %d\n' % (num,)

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
                f.write(strRegion)
                f.write('gmd=%s\n'%self.gmd_id.name)
        
        
    @api.model
    def import_file(self,file):
        written = True
        message = 'Success'

        obj = {'name':file.filename.split('.')[0]}
        geo = {
        "region":{"objs":[]},
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
            
            m = int(par.get('region.number',0))
            for j in range(0, m):
                left,top,right,bottom = (float(s) for s in par['region.%d.position'%j].split(','))
                o = {'points':[]}
                o['points'].append({'x':left,'y':top})
                o['points'].append({'x':right,'y':bottom})
                geo['region']['objs'].append(o)
                
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
    