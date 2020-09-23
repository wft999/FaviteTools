# -*- coding: utf-8 -*-
import logging
import os       
import json
from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools,_
from PIL import Image
from io import BytesIO
import base64
from ctypes import *

_logger = logging.getLogger(__name__)
class Pad(models.Model):
    _name = 'favite_bif.pad'   
    _inherit = ['favite_common.geometry']
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Name already exists !"),
    ]
    
    @api.model  
    def _default_geo(self):
        gmd = self.env['favite_gmd.gmd'].browse(self._context['default_gmd_id'])
        panel = self.env['favite_bif.panel'].browse(self._context['default_src_panel_id'])
        
        geo = {
        "mark":{"objs":[]},
        "submark":{"objs":[],"no_add":True},
        
        "regular":{"objs":[]},
        "filterregion":{"objs":[]},
        
        "frame":{"objs":[],"no_add":True},
        "region":{"objs":[],"no_add":True,"readonly":True},
        
        "panel":{"noselect":True,"readonly":True,'objs':[]}
        }
        
        for b in gmd.geo['block']['objs']:
            if 'panels' in b:
                for p in b['panels']:
                    if p['name'] == panel.name:
                        geo['panel']['objs'].append(p)
        
        return geo
        

    geo = fields.Jsonb(string = "geometry value",default=_default_geo)   
    glass = fields.Jsonb(related='gmd_id.glass', readonly=True)
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade')
    src_panel_id = fields.Many2one('favite_bif.panel',ondelete='cascade',domain="[('gmd_id', '=', gmd_id)]") 
    
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    mainMark = fields.Binary(attachment=True)
    subMark = fields.Binary(attachment=True)
    
    @api.one
    @api.depends('geo')
    def _compute_attachment(self):
        self.mainMark_attachment_id = self.env['ir.attachment'].search([('res_field', '=', 'mainMark'),('res_id', '=', self.id), ('res_model', '=', 'favite_bif.pad')], limit=1)
        self.subMark_attachment_id = self.env['ir.attachment'].search([('res_field', '=', 'subMark'),('res_id', '=', self.id), ('res_model', '=', 'favite_bif.pad')], limit=1)
        
    mainMark_attachment_id = fields.Many2one('ir.attachment', compute='_compute_attachment', ondelete='restrict', readonly=True)
    subMark_attachment_id = fields.Many2one('ir.attachment', compute='_compute_attachment', ondelete='restrict', readonly=True)
    
    @api.model
    def _fields_view_get(self, view_id=None, view_type='form', toolbar=False, submenu=False):
        if view_type == 'map' and not view_id:
            view_id = self.env.ref('favite_bif.favite_bif_pad_map').id
            
        res = super(Pad, self)._fields_view_get(view_id=view_id, view_type=view_type, toolbar=toolbar, submenu=submenu)
        return res
    
    @api.multi
    def edit_dialog(self):
        form_view = self.env.ref('favite_bif.favite_bif_pad_map')
        return {
            'name': _('Pad'),
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
            'view_id': self.env.ref('favite_bif.favite_bif_pad_map').id,
            'view_type': 'map',
            'view_mode': 'map',
            'target': 'current',
            'flags':{'hasSearchView':False}
            }
        
    @api.multi
    def save_mark(self,pad):

        mark = None
        markWidth = 0
        markHeight = 0
        markStartx = 0
        markList = []

        for obj in pad['objs']:
            height = 0     
            block_list = []
            iInterSectionWidth = 0
            
            if 'blocks' not in obj:
                continue
                
            for b in obj['blocks']:
                if (not 'iInterSectionHeight' in b):
                    continue;
                if iInterSectionWidth == 0:
                    iInterSectionWidth = b['iInterSectionWidth']
                    
                height += b['iInterSectionHeight']
                imgFile = '%s/Image/IP%d/jpegfile/AoiL_IP%d_scan%d_block%d.jpg' % (self.camera_path,b['iIPIndex']+1,b['iIPIndex'],b['iScanIndex'],b['iBlockIndex'])
                try:       
                    im = Image.open(imgFile)
                except Exception as e:
                    im = Image.new('L',(b['iInterSectionWidth'],b['iInterSectionHeight']))
                
                left = b['iInterSectionStartX']
                right = b['iInterSectionStartX'] + b['iInterSectionWidth']
                upper = im.height - (b['iInterSectionStartY'] + b['iInterSectionHeight'])
                lower = im.height - b['iInterSectionStartY']
                im = im.transpose(Image.FLIP_TOP_BOTTOM)
                region = im.crop((left ,upper, right, lower))
                block_list.append(region)
                im.close()
                
            markWidth += iInterSectionWidth       
            markStartx += iInterSectionWidth
            markHeight = height if height > markHeight else markHeight   
            if len(block_list):
                markList.append(block_list)

        if len(markList):
            mark = Image.new('L', (markWidth,markHeight))
            left = 0
            for blocks in markList:
                lower = markHeight
                for region in blocks:
                    upper = lower - region.size[1]
                    right = left+region.size[0]
                    mark.paste(region, (left ,upper, right, lower))
                    
                    lower = markHeight - region.size[1]
                left += blocks[0].size[0]
            
            b = BytesIO()
            mark.save(b, 'BMP')
            mainMark = base64.b64encode(b.getvalue())

            return mainMark
            
    @api.multi
    def write(self, values):
        if 'geo' in values:
            geo = values['geo']
            if geo['mark'].get('modified',False):
                del geo['mark']['modified']
                mark = self.save_mark(geo['mark'])
                if mark is not None:
                    values['mainMark'] = mark
                    
            if geo['submark'].get('modified',False):
                del geo['submark']['modified']
                mark = self.save_mark(geo['submark'])
                if mark is not None:
                    values['subMark'] = mark
            
        return super(Pad, self).write(values)
    
    @api.multi
    def search_goa(self,vals):
        self.ensure_one()
        try:
            getattr(windll,"AutoPeriod")
        except:
            raise UserError("'auto search' not supported on goa")
        
        width = vals['width']
        height = vals['height']
        strBlocks = vals['strBlocks']
        strPoints = vals['strPoints']
        type = vals['type']
        
        blocks = json.loads(strBlocks)
        points = json.loads(strPoints)
         
        dest = Image.new('L', (width,height))   
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
                        dest.paste(region, (left,top))
                        if y == 0:
                            left += region.width
                            top = 0
                        else:
                            top += region.height
                except:
                    raise UserError("No such file:%s"% (imgFile))
        
        dest = dest.transpose(Image.FLIP_TOP_BOTTOM)
        pSrcStart = dest.tobytes()
        step = width
        nVertices = len(points['x'])
        aVerticesX = (c_int * nVertices)(*points['x'])
        aVerticesY = (c_int * nVertices)(*points['y'])
        periodX = c_int()
        periodY = c_int()
        periodType = c_int(type)
        pMapStart = create_string_buffer(width*height*3)
        nMapStep = 3*width
        
        with open('d:/src.bmp', 'wb') as f:
            dest.save(f, format="BMP")
            
        with open('d:/src.txt', 'wt') as f:
            f.write("width:%d\n"%width)
            f.write("height:%d\n"%height)
            f.write("step:%d\n"%step)
            f.write("nVertices:%d\n"%nVertices)
            f.write("aVerticesX:%s\n"%strPoints)
        
        
        res = windll.AutoPeriod.GetPeriod(pSrcStart,width,height,step,nVertices,aVerticesX,aVerticesY,byref(periodX),byref(periodY),periodType,pMapStart,nMapStep)
        if res == 1:
            out = Image.frombytes('RGB', (width,height), pMapStart)
            b = BytesIO()
            out.save(b, 'JPEG')
        
            return {
                'result': True,
                "periodX":periodX.value,
                "periodY":periodY.value,
                'map':base64.b64encode(b.getvalue())
            }
        else:
            return {
                'result': False
            }
   
    def export_mark(self,objs,name,cx,cy):
        markWidth = 0
        markStartx = 0
        markNumber = 0
        
        strMark  = 'regular.%s.number = %d\n'% (name, len(objs))
        strMark  += 'regular.%s.imagename = %s_mainmark.bmp\n' % (name,self.name)
        for obj in objs:
            if not 'blocks' in obj:
                raise UserError("Please perform the save operation first!")
                
            height = 0     
            iInterSectionWidth = 0
                
            for block in obj['blocks']:
                if (not 'iInterSectionHeight' in block):
                    continue;
                if iInterSectionWidth == 0:
                    iInterSectionWidth = block['iInterSectionWidth']
                    
                height += block['iInterSectionHeight']
                        
            markWidth += iInterSectionWidth
            strMark += 'regular.%s.%d.image.size = %d,%d\n' % (name,markNumber,iInterSectionWidth,height)
            strMark += 'regular.%s.%d.image.position = %d,%d\n' % (name,markNumber,markStartx,0)
            
            x = (obj['points'][0]['x'] + obj['points'][1]['x'])/2 - cx
            y = (obj['points'][0]['y'] + obj['points'][1]['y'])/2 - cy
            strMark += 'regular.%s.%d.panelcenter.position = %f,%f\n' % (name,markNumber,x,y)
            strMark += 'regular.%s.%d.ipindex = %d\n' % (name,markNumber,block['iIPIndex'])
            strMark += 'regular.%s.%d.scanindex = %d\n' % (name,markNumber,block['iScanIndex'])

            markStartx += iInterSectionWidth
            markNumber += 1
            
        return strMark
             
    @api.one
    def export_file(self,directory_ids):
        geo = self._export_geo()
        
        p1 = geo['panel']['objs'][0]['points'][0]
        p2 = geo['panel']['objs'][0]['points'][1]
        panel_x = (p1['x'] + p2['x'])/2.0
        panel_y = (p1['y'] + p2['y'])/2.0
        strMainMark = self.export_mark(geo['mark']['objs'], 'mainmark',panel_x,panel_y)
        strSubMark = self.export_mark(geo['submark']['objs'], 'submark',panel_x,panel_y)
        
        strParameter = 'panelcenter.position = %f,%f' % (panel_x, panel_y)
        fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
        for name, field in sorted(self._fields.items(), key=lambda f: f[0]):
            if not field.manual or not name.startswith('x_'):
                continue
            elif field.type == 'boolean' or field.type == 'selection':
                strParameter += '%s = %d\n' % (fields_data[name]['complete_name'],self[name])
            else:
                strParameter += '%s = %s\n' % (fields_data[name]['complete_name'],field.convert_to_export(self[name],self))
                
        num = len(geo['regular']['objs'])
        strRegular = 'regular.number = %d\n' % num
        for i in range(0,num):
            obj = geo['regular']['objs'][i]
            p1 = obj['points'][0]
            p2 = obj['points'][1]
            left = min(p1['x'],p2['x']) - panel_x
            right = max(p1['x'],p2['x']) - panel_x
            bottom = min(p1['y'],p2['y']) - panel_Y
            top = max(p1['y'],p2['y']) - panel_y
            strRegular += 'regular.%d.position = %f,%f,%f,%f\n' % (i,left,top,right,bottom)
            strRegular += 'regular.%d.period = %f,%f\n' % (i,obj['periodX'],obj['periodY'])
            strRegular += 'regular.%d.enabled1g1 = %d\n' % (i,obj['enable_d1g1'])
        
        strFrame = ''
        frameNum = 0    
        for p in self.geo['frame']['objs']:
            p1 = p['points'][0]
            p2 = p['points'][1]
            left = min(p1['x'],p2['x']) - panel_x
            right = max(p1['x'],p2['x']) - panel_x
            bottom = min(p1['y'],p2['y']) - panel_Y
            top = max(p1['y'],p2['y']) - panel_Y
            strFrame += 'frame.%d.position.topleft = %f,%f\n' % (frameNum,left,top)
            strFrame += 'frame.%d.position.topright = %f,%f\n' % (frameNum,right,top)
            strFrame += 'frame.%d.position.bottomleft = %f,%f\n' % (frameNum,left,bottom)
            strFrame += 'frame.%d.position.bottomright = %f,%f\n' % (frameNum,right,bottom)
            frameNum = frameNum + 1
        strFrame += 'frame.number = %d\n' % frameNum
        
        num = len(geo['region']['objs'])
        strRegion = 'region.number = %d\n' % num
        for i in range(0,num):
            obj = geo['region']['objs'][i]
            p1 = obj['points'][0]
            p2 = obj['points'][1]
            left = min(p1['x'],p2['x']) - panel_x
            right = max(p1['x'],p2['x']) - panel_x
            bottom = min(p1['y'],p2['y']) - panel_Y
            top = max(p1['y'],p2['y']) - panel_y
            strRegion += 'region.%d.position = %f,%f,%f,%f\n' % (i,left,top,right,bottom)
            strRegion += 'region.%d.frameindex = %d' % (i,obj['iFrameNo'])
            
        num = len(geo['filterregion']['objs'])
        strFilterregion = 'filterregion.number = %d\n' % num
        for i in range(0,num):
            obj = geo['filterregion']['objs'][i]
            p1 = obj['points'][0]
            p2 = obj['points'][1]
            left = min(p1['x'],p2['x']) - panel_x
            right = max(p1['x'],p2['x']) - panel_x
            bottom = min(p1['y'],p2['y']) - panel_Y
            top = max(p1['y'],p2['y']) - panel_y
            strFilterregion += 'filterregion.%d.position = %f,%f,%f,%f\n' % (i,left,top,right,bottom)
                
        for d in directory_ids:  
            dir = os.path.join(d.name ,'bif')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            dir = os.path.join(dir ,'pad')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            path = os.path.join(dir,self.name+'.pad')
            with open(path,'w') as f:
                f.write(strParameter)
                f.write(strMainMark)
                f.write(strSubMark)
                f.write(strRegular)
                f.write(strFrame)
                f.write(strRegion)
                f.write(strFilterregion)
                f.write('\n#######Do not edit this field; automatically generated by export.##############\n')
                f.write('gmd=%s\n'%self.gmd_id.name)
                f.write('mark=%s\n'%json.dumps(geo['mark']))
                f.write('submark=%s\n'%json.dumps(geo['submark']))
                f.write('src_panel=%s\n'%self.src_panel_id.name)
            
            if self.mainMark:
                path = os.path.join(dir,self.name+'_mainmark.bmp')    
                with open(path, 'wb') as f:
                    f.write(base64.b64decode(self.mainMark))  
                    
            if self.subMark:
                path = os.path.join(dir,self.name+'_submark.bmp')    
                with open(path, 'wb') as f:
                    f.write(base64.b64decode(self.subMark))  
                
        
    @api.model
    def import_file(self,file):
        written = True
        message = 'Success'

        obj = {'name':file.filename.split('.')[0]}
        geo = {
        "mark":{"objs":[]},
        "regular":{"objs":[]},
        "filterregion":{"objs":[]},
        "frame":{"objs":[],"no_add":True},
        "region":{"objs":[],"no_add":True,"readonly":True},
        }
        
        try:
            parser = ConfigParser.RawConfigParser()
            parser.read_string("[DEFAULT]\r\n" + file.read().decode())
            par = parser._defaults
            
            geo['mark'] = json.loads(par['mark'])
            geo['submark'] = json.loads(par['submark'])
            
            panelcenter_x,panelcenter_y = (float(s) for s in par['panelcenter.position'].split(','))
            
            if 'gmd' in par:
                name = par['gmd']
                gmd = self.env['favite_gmd.gmd'].sudo().search([('name','=',name)])
                if not gmd:
                    raise UserError("File(%s) must first be imported!" % par['gmd'])
            else:
                raise UserError("File(%s) must contain gmd!" % file.filename)
            
            if 'src_panel' in par:
                name = par['src_panel']
                panel = self.env['favite_bif.panel'].sudo().search([('name','=',name),('gmd_id','=',gmd.id)])
                if not panel:
                    raise UserError("File(%s) must first be imported!" % par['src_panel'])
            else:
                raise UserError("File(%s) must contain src_panel!" % file.filename)
            
            for b in gmd.geo['block']['objs']:
                for p in b['panels']:
                    if p['name'] == panel.name:
                        geo['panel']['objs'].append(p)
            
            m = int(par.get('regular.number',0))
            for j in range(0, m):
                left,top,right,bottom = (float(s) for s in par['regular.%d.position'%j].split(','))
                left += panelcenter_x
                right += panelcenter_x
                top += panelcenter_y
                bottom += panelcenter_y
                o = {'points':[]}
                o['points'].append({'x':left,'y':top})
                o['points'].append({'x':right,'y':bottom})
                
                o['periodX'],o['periodY'] = (float(s) for s in par['regular.%d.period'%j].split(','))
                o['enable_d1g1'] = int(par['regular.%d.enabled1g1' % j])
                geo['regular']['objs'].append(o)
                
            m = int(par.get('frame.number',0))
            for j in range(0, m):
                left,top = (float(s) for s in par['frame.%d.position.topleft'%j].split(','))
                right,bottom = (float(s) for s in par['frame.%d.position.bottomright'%j].split(','))
                left += panelcenter_x
                right += panelcenter_x
                top += panelcenter_y
                bottom += panelcenter_y
                o = {'points':[]}
                o['points'].append({'x':left,'y':top})
                o['points'].append({'x':right,'y':bottom})
                geo['frame']['objs'].append(o)
                
            m = int(par.get('region.number',0))
            for j in range(0, m):
                left,top,right,bottom = (float(s) for s in par['region.%d.position'%j].split(','))
                left += panelcenter_x
                right += panelcenter_x
                top += panelcenter_y
                bottom += panelcenter_y
                o = {'points':[]}
                o['points'].append({'x':left,'y':top})
                o['points'].append({'x':right,'y':bottom})
                o['iFrameNo'] = int(par['region.%d.frameindex'%j])
                
                geo['region']['objs'].append(o)
                
            m = int(par.get('filterregion.number',0))
            for j in range(0, m):
                left,top,right,bottom = (float(s) for s in par['filterregion.%d.position'%j].split(','))
                left += panelcenter_x
                right += panelcenter_x
                top += panelcenter_y
                bottom += panelcenter_y
                o = {'points':[]}
                o['points'].append({'x':left,'y':top})
                o['points'].append({'x':right,'y':bottom})
                geo['filterregion']['objs'].append(o)

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
            obj['src_panel_id'] = panel.id
            obj.geo = geo 
            self.create(obj)._import_geo()      
                       
        except Exception as e:
            written = False
            message = str(e)
        return {'success': written,'message':message}