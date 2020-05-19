# -*- coding: utf-8 -*-
import logging
import os       
import json
from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools,_
from PIL import Image
from io import BytesIO
import base64
import numpy as np
import cv2
import math

_logger = logging.getLogger(__name__)
DOMAIN_WIDTH = 1024
DOMAIN_HEIGHT = 1024
# class Zone(models.Model):
#     _name = 'favite_bif.gsp_zone'   
#     
#     gsp_id = fields.Many2one('favite_bif.gsp',ondelete='cascade')
#     
#     darktol = fields.Integer(string='Dark Tol',default=15)
#     brighttol = fields.Integer(string='Bright Tol',default=15)
#     longedgeminsize = fields.Integer(string='Long edge min size',default=0)
#     longedgemaxsize = fields.Integer(string='Long edge max size',default=0)
#     shortedgeminsize = fields.Integer(string='Short edge min size',default=0)
#     shortedgemaxsize = fields.Integer(string='Short edge max size',default=0)
    
class Gsp(models.Model):
    _name = 'favite_bif.gsp'   
    _inherit = ['favite_common.geometry']
    
    _sql_constraints = [
        ('name_uniq', 'unique (name,bif_id)', "Name already exists !"),
    ]
    
#     zone_enabletbz =  fields.Boolean(string='Enable tbz')  
#     zone_ids = fields.One2many('favite_bif.gsp_zone', 'gsp_id', string='Zone')
    
    @api.model    
    def _default_geo(self):
        bif = self.env['favite_bif.bif'].browse(self._context['default_bif_id'])
        panel = self.env['favite_bif.panel'].browse(self._context['default_src_panel_id'])
        gmd = bif.gmd_id
        objs = bif.geo['panel']['objs']
        geo = {
        "domain":{"objs":[]},
        "bright":{"objs":[]},
        "dark":{"objs":[]},
        "zone":{"objs":[]},
        
        "polygon":{"objs":[]},
        "circle":{"objs":[]},
        "bow":{"objs":[]},
        
        "panel":{"readonly":True,'objs':[obj for obj in objs if obj['name'] == panel.name]}
        }
        return geo
    
    geo = fields.Jsonb(string = "geometry value",default=_default_geo)   
    glass = fields.Jsonb(related='gmd_id.glass', readonly=True)
    bif_id = fields.Many2one('favite_bif.bif',ondelete='cascade')  
    gmd_id = fields.Many2one('favite_gmd.gmd',related='bif_id.gmd_id')
    pad_id = fields.Many2one('favite_bif.pad',ondelete='set null',domain="[('gmd_id', '=', gmd_id),('src_panel_id', '=', src_panel_id)]")  
    src_panel_id = fields.Many2one('favite_bif.panel',ondelete='cascade', domain="[('gmd_id', '=', gmd_id)]")  

    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True) 
    
    @api.multi
    def edit_dialog(self):
        form_view = self.env.ref('favite_bif.favite_bif_gsp_map')
        return {
            'name': _('Gsp'),
            'res_model': self._name,
            'res_id': self.id,
            'views': [(form_view.id, 'form'),],
            'type': 'ir.actions.act_window',
            'target': 'new'
        }
            
    @api.multi  
    def open_map(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': self.name,
            'res_model': self._name,
            'res_id': self.id,
            'view_id': self.env.ref('favite_bif.gsp_form').id,
            'view_type': 'map',
            'view_mode': 'map',
            'target': 'current',
            'flags':{'hasSearchView':False}
            }
        
    @api.multi
    def open_pad_list(self):
        ctx = dict(
            default_gmd_id=self.gmd_id.id,
            default_src_panel_id=self.src_panel_id.id,
        )
        return {
            'type': 'ir.actions.act_window',
            'name':'Pad',
            'res_model': 'favite_bif.pad',
            'view_mode': 'kanban,form',
            'view_id': False,
            'target': 'current',
            'flags':{'import_enabled':False},
            'domain': [('src_panel_id', '=', self.src_panel_id.id),('gmd_id', '=', self.gmd_id.id)],
            'context': ctx,
            }
        
    def export_image(self,directory_ids):
        imgWidth = int(self.geo['domain']['objs'][0]['imgWidth'])
        imgHeight = int(self.geo['domain']['objs'][0]['imgHeight'])
        blocks = json.loads(self.geo['domain']['objs'][0]['strBlocks'])
         
        origin = Image.new('L', (imgWidth,imgHeight))   
        left = 0
        top = 0 
        for x in range(len(blocks)):
            for y in range(len(blocks[x])-1,-1,-1):
                b = blocks[x][y]    
                if b is None or b['bHasIntersection'] == False:
                    continue;
                
                try:
                    imgFile = '%s/Image/IP%d/jpegfile/AoiL_IP%d_scan%d_block%d.jpg' % (self.camera_path,b['iIPIndex']+1,b['iIPIndex'],b['iScanIndex'],b['iBlockIndex'])
                    with Image.open(imgFile) as im:
                        im = im.transpose(Image.FLIP_TOP_BOTTOM)
                        region = im.crop((b['iInterSectionStartX'] ,im.height-(b['iInterSectionStartY']+b['iInterSectionHeight']),b['iInterSectionStartX']+ b['iInterSectionWidth'], im.height-b['iInterSectionStartY']))
                        origin.paste(region, (left,top))
                        if y == 0:
                            left += region.width
                            top = 0
                        else:
                            top += region.height
                except:
                    raise UserError("No such file:%s"% (imgFile))
        origin = origin.transpose(Image.FLIP_TOP_BOTTOM)
        for d in directory_ids:  
            dir = os.path.join(d.name ,'bif')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            path = os.path.join(dir,self.bif_id.name+'_'+self.name+'_org.bmp')
            with open(path, 'wb') as f:
                origin.save(f, format="BMP")
        
        zone = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
        for o in self.geo['zone']['objs']:
            p2 = []
            for p in o['points']:
                p2.append([int(p['offsetX']),int(p['offsetY'])])
            b = np.array([p2], dtype = np.int32)
            cv2.fillPoly(zone, b, int(o['level'] if 'level' in o else '15'))
  
        for d in directory_ids:  
            dir = os.path.join(d.name ,'bif')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            path = os.path.join(dir,self.bif_id.name+'_'+self.name+'_zone.bmp')
            cv2.imwrite(path, zone)
        
        obj = self.geo['panel']['objs'][0]
        p1 = obj['points'][0]
        p2 = obj['points'][1]
        left = min(p1['x'],p2['x'])
        right = max(p1['x'],p2['x'])
        bottom = min(p1['y'],p2['y'])
        top = max(p1['y'],p2['y'])
        
        imgWidth = self.bif_id.x_global_polygon_width
        rate = imgWidth / (right - left)
        imgHeight = int(rate * (top - bottom))    
        polygon = np.zeros([imgHeight,imgWidth], dtype = np.uint8)
        for o in self.geo['polygon']['objs']:
            p2 = []
            for p in o['points']:
                p2.append([(p['x']-left)*rate,(top-p['y'])*rate])
            b = np.array([p2], dtype = np.int32)
            cv2.fillPoly(polygon, b, 255)
            
        for o in self.geo['bow']['objs']:
            p = o['points']
            x = int((p[0]['x']-left)*rate)
            y = int((top-p[0]['y'])*rate)
            x1 = int((p[1]['x']-left)*rate)
            y1 = int((top-p[1]['y'])*rate)
            x2 = int((p[2]['x']-left)*rate)
            y2 = int((top-p[2]['y'])*rate)
            r = math.sqrt((x1-x)**2 + (y1-y)**2)
            startAngle = math.degrees(math.atan2(y1 - y, x1 - x))
            endAngle = math.degrees(math.atan2(y2 - y, x2 - x))
            
            p2 = [[x,y],[x1,y1],[x2,y2]]
            b = np.array([p2], dtype = np.int32)
            
            if endAngle < startAngle:
                cv2.ellipse(polygon, (x,y), (int(r),int(r)),0,startAngle,360,255,cv2.FILLED)
                cv2.ellipse(polygon, (x,y), (int(r),int(r)),0,0,endAngle,255,cv2.FILLED)
                cv2.fillPoly(polygon, b, 255)
            else:
                cv2.ellipse(polygon, (x,y), (int(r),int(r)),0,startAngle,endAngle,255,cv2.FILLED)
                cv2.fillPoly(polygon, b, 0)
            
            
            
        for o in self.geo['circle']['objs']:
            p = o['points']
            x = int((p[0]['x']-left)*rate)
            y = int((top-p[0]['y'])*rate)
            x1 = int((p[1]['x']-left)*rate)
            y1 = int((top-p[1]['y'])*rate)
            r = math.sqrt((x1-x)**2 + (y1-y)**2)
            cv2.circle(polygon, (x,y), int(r),255,cv2.FILLED)
            
        for d in directory_ids:  
            dir = os.path.join(d.name ,'bif')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            path = os.path.join(dir,self.bif_id.name+'_'+self.name+'_polygon.bmp')
            cv2.imwrite(path, polygon)
        
    def export_string(self,index):
        geo = self._export_geo()
        
        strPolygon = 'gsp.%d.polygon = %s\n' % (index,json.dumps(geo['polygon']))
        strPolygon += 'gsp.%d.circle = %s\n' % (index,json.dumps(geo['circle']))
        strPolygon += 'gsp.%d.bow = %s\n' % (index,json.dumps(geo['bow']))
        
        num = len(geo['zone']['objs'])
        strZone = 'gsp.%d.zone.number = %d\n' % (index,num)
        for i in range(0,num):
            strZone += 'gsp.%d.zone.%d.obj = %s\n'%(index,i,json.dumps(geo['zone']['objs'][i]))
            strZone += 'gsp.%d.zone.%d.level = %s\n'%(index,i,geo['zone']['objs'][i]['level'] if 'level' in geo['zone']['objs'][i] else '15')
            strZone += 'gsp.%d.zone.%d.darktol = %s\n'%(index,i,geo['zone']['objs'][i]['darktol'] if 'darktol' in geo['zone']['objs'][i] else '15')
            strZone += 'gsp.%d.zone.%d.brighttol = %s\n'%(index,i,geo['zone']['objs'][i]['brighttol'] if 'brighttol' in geo['zone']['objs'][i] else '15')
            strZone += 'gsp.%d.zone.%d.longedgeminsize = %s\n'%(index,i,geo['zone']['objs'][i]['longedgeminsize'] if 'longedgeminsize' in geo['zone']['objs'][i] else '0')
            strZone += 'gsp.%d.zone.%d.longedgemaxsize = %s\n'%(index,i,geo['zone']['objs'][i]['longedgemaxsize'] if 'longedgemaxsize' in geo['zone']['objs'][i] else '0')
            strZone += 'gsp.%d.zone.%d.shortedgeminsize = %s\n'%(index,i,geo['zone']['objs'][i]['shortedgeminsize'] if 'shortedgeminsize' in geo['zone']['objs'][i] else '0')
            strZone += 'gsp.%d.zone.%d.shortedgemaxsize = %s\n'%(index,i,geo['zone']['objs'][i]['shortedgemaxsize'] if 'shortedgemaxsize' in geo['zone']['objs'][i] else '0')
        
        strDomain = 'gsp.%d.domain = %s\n' % (index,json.dumps(geo['domain']))
        
        num = len(geo['dark']['objs'])
        strDark = 'gsp.%d.domain.dark.number = %d\n' % (index,num)
        for i in range(0,num):
            obj = geo['dark']['objs'][i]
            p1 = obj['points'][0]
            p2 = obj['points'][1]
            left = min(p1['offsetX'],p2['offsetX'])
            right = max(p1['offsetX'],p2['offsetX'])
            bottom = min(p1['offsetY'],p2['offsetY'])
            top = max(p1['offsetY'],p2['offsetY'])
            strDark += 'gsp.%d.domain.dark.%d.obj = %s\n' % (index,i,json.dumps(obj))
            strDark += 'gsp.%d.domain.dark.%d.position = %d,%d,%d,%d\n' % (index,i,int(left),int(top),int(right),int(bottom))
            
        num = len(geo['bright']['objs'])
        strBright = 'gsp.%d.domain.bright.number = %d\n' % (index,num)
        for i in range(0,num):
            obj = geo['bright']['objs'][i]
            p1 = obj['points'][0]
            p2 = obj['points'][1]
            left = min(p1['offsetX'],p2['offsetX'])
            right = max(p1['offsetX'],p2['offsetX'])
            bottom = min(p1['offsetY'],p2['offsetY'])
            top = max(p1['offsetY'],p2['offsetY'])
            strBright += 'gsp.%d.domain.bright.%d.obj = %s\n' % (index,i,json.dumps(obj))
            strBright += 'gsp.%d.domain.bright.%d.position = %d,%d,%d,%d\n' % (index,i,int(left),int(top),int(right),int(bottom))
            
        strParameter = 'gsp.%d.name = %s\n' %(index,self.name)
        fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
        for name, field in self._fields.items():
            if not field.manual or not name.startswith('x_'):
                continue
            elif field.type == 'boolean' or field.type == 'selection':
                strParameter += 'gsp.%d.%s = %d\n' % (index,fields_data[name]['complete_name'],self[name])
            else:
                strParameter += 'gsp.%d.%s = %s\n' % (index,fields_data[name]['complete_name'],field.convert_to_export(self[name],self))
        return strParameter + strPolygon + strDomain + strZone + strDark + strBright;
    
    @api.model
    def import_string(self,par,gspname,gspindex,bif,panel):
        self = self.with_context(default_bif_id=bif.id,default_src_panel_id=panel.id)
        
        prefix = 'gsp.%s.' % gspindex
        obj = {'name':gspname}
        geo = {
        "domain":{"objs":[]},
        "bright":{"objs":[]},
        "dark":{"objs":[]},
        "zone":{"objs":[]},
        
        "polygon":{"objs":[]},
        "circle":{"objs":[]},
        "bow":{"objs":[]},
        
        "panel":{"readonly":True,'objs':[obj for obj in bif.geo['panel']['objs'] if obj['name'] == panel.name]}
        }
        
#         pad_item = 'gsp.%s.padfile'% gspindex
#         if pad_item in par:
#             name,_ = par[pad_item].split('.')
#             pad = self.env['favite_bif.pad'].sudo().search([('name','=',name),('src_panel_id','=',panel.id)])
#             if pad:
#                 obj['pad_id'] = pad.id
#             else:
#                 raise UserError("File(%s) must first be imported!" % par[pad_item])
         
        geo['polygon'] = json.loads(par['gsp.%s.polygon'%gspindex])
        geo['circle'] = json.loads(par['gsp.%s.circle'%gspindex])
        geo['bow'] = json.loads(par['gsp.%s.bow'%gspindex])
        geo['domain'] = json.loads(par['gsp.%s.domain'%gspindex])
         
        num = int(par.get('gsp.%s.domain.dark.number'%gspindex,0))
        for i in range(0, num):
            o = json.loads(par['gsp.%s.domain.dark.%d.obj'%(gspindex,i)])
            geo['dark']['objs'].append(o)
              
        num = int(par.get('gsp.%s.domain.bright.number'%gspindex,0))
        for i in range(0, num):
            o = json.loads(par['gsp.%s.domain.bright.%d.obj'%(gspindex,i)])
            geo['bright']['objs'].append(o)
              
        num = int(par.get('gsp.%s.zone.number'%gspindex,0))
        for i in range(0, num):
            o = json.loads(par['gsp.%s.zone.%d.obj'%(gspindex,i)])
            geo['zone']['objs'].append(o)
        
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
                    
        obj['geo'] = geo                
        return self.create(obj)._import_geo()   
