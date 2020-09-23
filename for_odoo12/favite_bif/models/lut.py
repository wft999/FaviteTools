# -*- coding: utf-8 -*-
import logging
import os       
import json
import numpy as np
try:
    import configparser as ConfigParser
except ImportError:
    import ConfigParser
    
from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools,_


_logger = logging.getLogger(__name__)

def one_bezier_curve(a, b, t):
    return (1 - t) * a + t * b
def n_bezier_curve(xs, n, k, t):
    if n == 1:
        return one_bezier_curve(xs[k], xs[k + 1], t)
    else:
        return (1 - t) * n_bezier_curve(xs, n - 1, k, t) + t * n_bezier_curve(xs, n - 1, k + 1, t)
def bezier_curve(xs, ys, num, b_xs, b_ys):
    n = 2  # 采用5次bezier曲线拟合
    t_step = 1.0 / (num - 1)
    t = np.arange(0.0, 1 + t_step, t_step)
    for each in t:
        b_xs.append(n_bezier_curve(xs, n, 0, each))
        b_ys.append(n_bezier_curve(ys, n, 0, each))
    
class Lut(models.Model):
    _name = 'favite_bif.lut'   
    _inherit = ['favite_common.geometry']  
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Name already exists !"),
    ]
    
    @api.model
    def calc_lut(self,x1,y1):
        b_xs = []
        b_ys = []
        num=2048
        xs = [0,x1*256.0/num, 255.0]
        ys = [0,y1*256.0/num, 255.0]
        
        bezier_curve(xs, ys, num, b_xs, b_ys)
        
        lut = []
        first = 0
        for i in range(0,256):
            for j in range(first,num):
                if b_xs[j] == i:
                    first = j
                    lut.append(int(b_ys[j]))
                    break
                elif b_xs[j] > i:
                    first = j
                    lut.append(int((b_ys[j]+b_ys[j-1])/2))
                    break
        return lut
    
    @api.model
    def _default_geo(self):
        geo = {
        "controlpoint":[{'x':1000,'y':1000}],
        }
        return geo
    
    geo = fields.Jsonb(string = "geometry value",default=_default_geo)   
    glass = fields.Jsonb(related='gmd_id.glass', readonly=True)
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade', require=True)    
    
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    @api.multi
    def get_formview_id(self, access_uid=None):
        return self.env.ref('favite_bif.favite_bif_lut_map').id
    
    @api.one
    def export_file(self,directory_ids):
        b_xs = []
        b_ys = []
        num = 4096
        x1  = self.geo['controlpoint'][0]['x']
        y1  = self.geo['controlpoint'][0]['y']
        xs = [0,x1*256.0/2048, 255.0]
        ys = [0,y1*256.0/2048, 255.0]
        
        bezier_curve(xs, ys, num, b_xs, b_ys)
        
        strLut = ''
        first = 0
        n = 0
        for i in range(0,4096):
            for j in range(first,num):
                tmp = b_xs[j]*4096.0/256.0
                if tmp == i:
                    first = j
                    strLut += 'grey.%d.output = %d\n'%(i,int(b_ys[j]))
                    n += 1
                    break
                elif tmp > i:
                    first = j
                    strLut += 'grey.%d.output = %d\n'%(i,int((b_ys[j]+b_ys[j-1])/2))
                    n += 1
                    break
        strLut += 'grey.number = %d\n' % n

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
            dir = os.path.join(dir ,'lut')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            path = os.path.join(dir,self.name+'.lut')
            with open(path,'w') as f:
                f.write(strLut)
                f.write(strParameter)
                f.write('\n#######Do not edit this field; automatically generated by export.##############\n')
                f.write('gmd=%s\n'%self.gmd_id.name)
                f.write('controlpoint=%s\n'%json.dumps(self.geo['controlpoint']))
        
    @api.model
    def import_file(self,file):
        written = True
        message = 'Success'

        obj = {'name':file.filename.split('.')[0]}
        geo = {
        "controlpoint":[{'x':1000,'y':1000}],
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
            
            if 'controlpoint' in par:
                geo['controlpoint'] = json.loads(par['controlpoint'])

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
            obj['gmd_id'] = gmd.id
            obj.geo = geo 
            self.create(obj)._import_geo()      
                       
        except Exception as e:
            written = False
            message = str(e)
        return {'success': written,'message':message}