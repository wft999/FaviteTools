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

from setuptools.dist import sequence

_logger = logging.getLogger(__name__)
ZONE_FRAME_WIDTH = 1024
ZONE_FRAME_HEIGHT = 1024
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
    _order = 'id'
    
#     _sql_constraints = [
#         ('name_uniq', 'unique (name,bif_id)', "Name already exists !"),
#     ]
    
#     zone_enabletbz =  fields.Boolean(string='Enable tbz')  
#     zone_ids = fields.One2many('favite_bif.gsp_zone', 'gsp_id', string='Zone')
       
    def _default_geo(self,bif_id,src_panel_id):
        bif = self.env['favite_bif.bif'].browse(bif_id)
        panel = self.env['favite_bif.panel'].browse(src_panel_id)
        objs = bif.geo['panel']['objs']
        geo = {
        "zoneFrame":{"objs":[]},
        "brightDomain":{"objs":[]},
        "darkDomain":{"objs":[]},
        "zone":{"objs":[]},
        
        "polygon":{"objs":[]},
        "circle":{"objs":[]},
        "bow":{"objs":[]},
        
         "panel":{"noselect":True,"readonly":True,'objs':[obj for obj in objs if obj['name'] == panel.name]}
        }
        return geo
    
    @api.one
    def _compute_name(self):
        self.name = 'gsp%d' % self.id
        
    @api.one
    def _compute_seq(self):
        gsp = self.env['favite_bif.gsp'].sudo().search([('id','<',self.id),('bif_id','=',self.bif_id.id)])
        self.sequence = len(gsp)
        
    @api.one
#    @api.depends('x_inspect_mode','x_miniledcompare_period','x_todcompare_period','x_multiperiodcompare_period','x_ps_basicperiod','x_neighorcompare_shortperiod_period')
    def _compute_period(self):
        if self.x_inspect_mode == 2:
            self.period = self.x_neighorcompare_shortperiod_period
        elif self.x_inspect_mode == 3:
            self.period = self.x_ps_basicperiod
        elif self.x_inspect_mode == 4:
            self.period = self.x_multiperiodcompare_period
        elif self.x_inspect_mode == 5:
            self.period = self.x_todcompare_period
        elif self.x_inspect_mode == 6:
            self.period = self.x_neighorcompare_shortperiod_period
        elif self.x_inspect_mode == 7:
            self.period = self.x_miniledcompare_period
        else:
            self.period = self.x_neighorcompare_shortperiod_period
        
    @api.multi    
    def refresh(self):
        for g in self:
            objs = g.bif_id.geo['panel']['objs']
        
            geo = g.geo
            geo['panel'] = {"noselect":True,"readonly":True,'objs':[obj for obj in objs if obj['name'] == g.src_panel_id.name]}
            g.write({'geo':geo})
    
    name = fields.Char(compute='_compute_name')
    sequence = fields.Integer(compute='_compute_seq')
    period = fields.NumericArray(compute='_compute_period')
    geo = fields.Jsonb(string = "geometry value")   
    glass = fields.Jsonb(related='gmd_id.glass', readonly=True)
    bif_id = fields.Many2one('favite_bif.bif',ondelete='cascade')  
    gmd_id = fields.Many2one('favite_gmd.gmd',related='bif_id.gmd_id')
    pad_id = fields.Many2one('favite_bif.pad',ondelete='set null',domain="[('gmd_id', '=', gmd_id),('src_panel_id', '=', src_panel_id)]")  
    src_panel_id = fields.Many2one('favite_bif.panel',ondelete='cascade', domain="[('bif_id', '=', bif_id)]")  

    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True) 
    
    
    @api.model
    def newFromPanel(self,bif_id,src_panel_name):
        panel = self.env['favite_bif.panel'].sudo().search([('name','=',src_panel_name),('bif_id','=',bif_id)])
        gsp = self.create({'bif_id':bif_id,'src_panel_id':panel.id})
        return gsp.id
    
    @api.model
    def create(self, vals):
        vals['geo'] = self._default_geo(vals['bif_id'], vals['src_panel_id'])
        return super(Gsp, self).create(vals)
    
    @api.one
    def write(self, vals):
        for g in self:
            
            inspect_mode = vals['x_inspect_mode'] if 'x_inspect_mode' in vals else g.x_inspect_mode
                
            if inspect_mode == 2:
                period = vals['x_neighorcompare_shortperiod_period'] if 'x_neighorcompare_shortperiod_period' in vals else g.x_neighorcompare_shortperiod_period
            elif inspect_mode == 3:
                period = vals['x_ps_basicperiod'] if 'x_ps_basicperiod' in vals else g.x_ps_basicperiod
            elif inspect_mode == 4:
                period = vals['x_multiperiodcompare_period'] if 'x_multiperiodcompare_period' in vals else g.x_multiperiodcompare_period
            elif inspect_mode == 5:
                period = vals['x_todcompare_period'] if 'x_todcompare_period' in vals else g.x_todcompare_period
            elif inspect_mode == 6:
                period = vals['x_neighorcompare_shortperiod_period'] if 'x_neighorcompare_shortperiod_period' in vals else g.x_neighorcompare_shortperiod_period
            elif inspect_mode == 7:
                period = vals['x_miniledcompare_period'] if 'x_miniledcompare_period' in vals else g.x_miniledcompare_period


            if period:
                if not 'geo' in vals:
                    vals['geo'] = g.geo
                    
                for o in vals['geo']['zone']['objs']:
                    x = (o['points'][0]['x'] + o['points'][1]['x'] )/2
                    y = (o['points'][0]['y'] + o['points'][1]['y'] )/2
                    o['points'][0]['x'] = x - float(period[0]/2)
                    o['points'][0]['y'] = y - float(period[1]/2)
                    o['points'][1]['x'] = x + float(period[0]/2)
                    o['points'][1]['y'] = y + float(period[1]/2)
            

        return super(Gsp, self).write(vals)
    
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
            'flags':{'hasSearchView':False},
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
        if len(self.geo['zoneFrame']['objs']) == 0:
            return 
        imgWidth = int(self.geo['zoneFrame']['objs'][0]['imgWidth3'])
        imgHeight = int(self.geo['zoneFrame']['objs'][0]['imgHeight3'])
        blocks = json.loads(self.geo['zoneFrame']['objs'][0]['strBlocks3'])
         
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
                        
        
        imgWidth = int(self.geo['zoneFrame']['objs'][0]['imgWidth'])
        imgHeight = int(self.geo['zoneFrame']['objs'][0]['imgHeight'])
        blocks = json.loads(self.geo['zoneFrame']['objs'][0]['strBlocks'])
         
        zone_origin = Image.new('L', (imgWidth,imgHeight))   
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
                        zone_origin.paste(region, (left,top))
                        if y == 0:
                            left += region.width
                            top = 0
                        else:
                            top += region.height
                except:
                    raise UserError("No such file:%s"% (imgFile))
        zone_origin = zone_origin.transpose(Image.FLIP_TOP_BOTTOM)
        for d in directory_ids:  
            dir = os.path.join(d.name ,'bif')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            path = os.path.join(dir,self.bif_id.name+'_'+self.name+'_zone_org.bmp')
            with open(path, 'wb') as f:
                zone_origin.save(f, format="BMP")
        
        zone = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
        b = np.array([[[0,0],[0,imgHeight],[imgWidth,imgHeight],[imgWidth,0]]], dtype = np.int32)
        cv2.fillPoly(zone, b, int(self.geo['zone']['background'] if 'background' in self.geo['zone'] else '0'))
        for o in self.geo['zone']['objs']:
            if len(o['points']) < 2:
                continue
            
            p2 = [[int(p['offsetX']),int(p['offsetY'])] for p in o['points']]
            
            b = np.array([p2], dtype = np.int32)
            cv2.fillPoly(zone, b, int(o['level'] if 'level' in o else '15'))
  
        for d in directory_ids:  
            dir = os.path.join(d.name ,'bif')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            path = os.path.join(dir,self.bif_id.name+'_'+self.name+'_zone.bmp')
            cv2.imwrite(path, zone)
        
        obj = self.geo['panel']['objs'][0]
        p0 = obj['points'][0]
        p1 = obj['points'][1]
        p2 = obj['points'][2]
        p3 = obj['points'][3]
        left = min(p0['x'],p1['x'],p2['x'],p3['x'])
        right = max(p0['x'],p1['x'],p2['x'],p3['x'])
        bottom = min(p1['y'],p2['y'],p0['y'],p3['y'])
        top = max(p1['y'],p2['y'],p0['y'],p3['y'])
        
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
            
        def _calculate_cicular(x1,y1,x2,y2,x3,y3):   
            e = 2 * (x2 - x1)
            f = 2 * (y2 - y1)
            g = x2*x2 - x1*x1 + y2*y2 - y1*y1
            a = 2 * (x3 - x2)
            b = 2 * (y3 - y2)
            c = x3*x3 - x2*x2 + y3*y3 - y2*y2
            
            x = (g*b - c*f) / (e*b - a*f)
            y = (a*g - c*e) / (a*f - b*e)
            r = math.sqrt((x-x1)*(x-x1)+(y-y1)*(y-y1))
            return {'x':x,'y':y,'r':r}; 
            
        for o in self.geo['bow']['objs']:            
            p = o['points']
            x1 = (p[0]['x']-left)*rate
            y1 = (top-p[0]['y'])*rate
            x2 = (p[1]['x']-left)*rate
            y2 = (top-p[1]['y'])*rate
            x3 = (p[2]['x']-left)*rate
            y3 = (top-p[2]['y'])*rate
            res = _calculate_cicular(x1,y1,x2,y2,x3,y3)
            x = int(res['x'])
            y = int(res['y'])
            r = int(res['r'])

            p2 = [[x,y],[int(x1),int(y1)],[int(x3),int(y3)]]
            b = np.array([p2], dtype = np.int32)
            startAngle = math.degrees(math.atan2(y1 - y, x1 - x))
            endAngle = math.degrees(math.atan2(y3 - y, x3 - x))
            dir = (x2 - x1) * (y3 - y2) - (y2 - y1) * (x3 - x2);
            if dir > 0:
                startAngle = math.degrees(math.atan2(y1 - y, x1 - x))
                endAngle = math.degrees(math.atan2(y3 - y, x3 - x))
            else:
                endAngle = math.degrees(math.atan2(y1 - y, x1 - x))
                startAngle = math.degrees(math.atan2(y3 - y, x3 - x))
                
            cv2.ellipse(polygon, (x,y), (r,r),0,startAngle,endAngle,255,cv2.FILLED)
            
            if abs(startAngle - endAngle) > 180:
                cv2.fillPoly(polygon, b, 255)
            else:   
                cv2.fillPoly(polygon, b, 0)
            
            
            
        for o in self.geo['circle']['objs']:
            p = o['points']
            x1 = (p[0]['x']-left)*rate
            y1 = (top-p[0]['y'])*rate
            x2 = (p[1]['x']-left)*rate
            y2 = (top-p[1]['y'])*rate
            x3 = (p[2]['x']-left)*rate
            y3 = (top-p[2]['y'])*rate
            res = _calculate_cicular(x1,y1,x2,y2,x3,y3)
            x = int(res['x'])
            y = int(res['y'])
            r = int(res['r'])
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
        
        strDomain = 'gsp.%d.zoneFrame = %s\n' % (index,json.dumps(geo['zoneFrame']))
        
        num = len(geo['darkDomain']['objs'])
        strDark = 'gsp.%d.domain.dark.number = %d\n' % (index,num)
        for i in range(0,num):
            obj = geo['darkDomain']['objs'][i]
            p1 = obj['points'][0]
            p2 = obj['points'][1]
            left = min(p1['offsetX'],p2['offsetX'])
            right = max(p1['offsetX'],p2['offsetX'])
            bottom = min(p1['offsetY'],p2['offsetY'])
            top = max(p1['offsetY'],p2['offsetY'])
            strDark += 'gsp.%d.domain.dark.%d.obj = %s\n' % (index,i,json.dumps(obj))
            strDark += 'gsp.%d.domain.dark.%d.position = %d,%d,%d,%d\n' % (index,i,int(left),int(top),int(right),int(bottom))
            
        num = len(geo['brightDomain']['objs'])
        strBright = 'gsp.%d.domain.bright.number = %d\n' % (index,num)
        for i in range(0,num):
            obj = geo['brightDomain']['objs'][i]
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
        for name, field in sorted(self._fields.items(), key=lambda f: f[0]):
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
        "zoneFrame":{"objs":[]},
        "brightDomain":{"objs":[]},
        "darkDomain":{"objs":[]},
        "zone":{"objs":[]},
        
        "polygon":{"objs":[]},
        "circle":{"objs":[]},
        "bow":{"objs":[]},
        
        "panel":{"noselect":True,"readonly":True,'objs':[obj for obj in bif.geo['panel']['objs'] if obj['name'] == panel.name]}
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
        geo['zoneFrame'] = json.loads(par['gsp.%s.zoneFrame'%gspindex])
         
        num = int(par.get('gsp.%s.domain.dark.number'%gspindex,0))
        for i in range(0, num):
            o = json.loads(par['gsp.%s.domain.dark.%d.obj'%(gspindex,i)])
            geo['darkDomain']['objs'].append(o)
              
        num = int(par.get('gsp.%s.domain.bright.number'%gspindex,0))
        for i in range(0, num):
            o = json.loads(par['gsp.%s.domain.bright.%d.obj'%(gspindex,i)])
            geo['brightDomain']['objs'].append(o)
              
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
