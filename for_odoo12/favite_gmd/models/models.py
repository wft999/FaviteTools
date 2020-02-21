# -*- coding: utf-8 -*-
import logging
import os        
import io
import json
import math
from PIL import Image
try:
    import configparser as ConfigParser
except ImportError:
    import ConfigParser
 
from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools

PANEL_MAP_RATE = 1/10
_logger = logging.getLogger(__name__)

    
class Gmd(models.Model):
    _name = 'favite_gmd.gmd'
    _inherit = ['favite_common.geometry']
    
    @api.model
    def _default_geo(self):
        geo = {
        "glass":{"corner":1,"size":[0,0],"coord":0},
        "lightRegion":{"objs":[]},
        "markoffset":{"objs":[]},
        "mark":{"objs":[]},
        "mask":{"objs":[]},
        "block":{"objs":[]},
        }
        return geo
    
    camera_path = fields.Selection(selection='_list_all_camers', string='Camera data path', required=True)
    camera_ini = fields.Text(compute='_compute_ini')
    geo = fields.Jsonb(required=True,string = "geometry value",default=_default_geo)
    color = fields.Integer('Color Index', default=0)
 
    _sql_constraints = [
        
    ]    
    
    @api.model
    def create(self, vals):
        #self._create_block(vals)   
        return super(Gmd, self).create(vals)   
    
    @api.multi
    def write(self, vals):
        #self._create_block(vals)    
        return super(Gmd, self).write(vals)
        
    def _create_block(self,vals):
        if 'geo' not in vals:
            return 
        if 'block' not in vals['geo']:
            return 
        
        total = self.env['favite_gmd.block'].sudo().search([])
        names = [b['name'] for b in vals['geo']['block']['objs'] ]
        cur = self.env['favite_gmd.block'].sudo().search([('name','in',names)])
        (total - cur).unlink()
        
        for b in vals['geo']['block']['objs']:
            block = self.env['favite_gmd.block'].sudo().search([('name','=',b['name'])]);
            if not block:
                self.env['favite_gmd.block'].sudo().create({'gmd_id': self.id, 'name':b['name']})
    
    def check_data_path(self,root):
        if not os.path.exists(root):
            raise ValidationError(_('Invalid data directory.'))
        
        cameraFile = root + '/camera.ini'
        if not os.path.isfile(cameraFile):
            raise UserError("File(%s) doesn't exist" % 'camera.ini')
    
    @api.depends('camera_path')
    def _compute_ini(self):
        iniFile = self.camera_path + '\camera.ini'
        iniConf = ConfigParser.RawConfigParser()
        with open(iniFile, 'r') as f:
            iniConf.read_string("[DEFAULT]\r\n" + f.read())
            self.camera_ini =  json.dumps(iniConf._defaults,indent=5)
    
    def _get_top_left(self,conf,ip,scan,dLeft):
        iCameraNoPerRow = 2
        dOffset = [int(s) for s in conf['ip.%d.scan.%d.offset'%(ip,scan)].split(',')]
        iTotalScan = int(conf['ip.scan.number'])
        if (ip % iCameraNoPerRow) == 0  and scan == 0:
            dOffset0 = [int(s) for s in conf['ip.%d.scan.%d.offset'%(0,0)].split(',')]
            
            dResolution = [float(s) for s in conf['ip.%d.scan.%d.res'%(ip,scan)].split(',')]
            dLeft = (dOffset[0] - dOffset0[0]) / dResolution[0]
        elif scan == 0:
            dOffset0 = [int(s) for s in conf['ip.%d.scan.%d.offset'%(ip - 1,iTotalScan - 1)].split(',')]
            dResolution = [float(s) for s in conf['ip.%d.scan.%d.res'%(ip,iTotalScan - 1)].split(',')]
            dLeft += (dOffset[0] - dOffset0[0]) / dResolution[0]
        else:
            dOffset0 = [int(s) for s in conf['ip.%d.scan.%d.offset'%(ip,scan-1)].split(',')]
            dResolution = [float(s) for s in conf['ip.%d.scan.%d.res'%(ip,iTotalScan - 1)].split(',')]
            dLeft += (dOffset[0] - dOffset0[0]) / dResolution[0]
            
        dOffset00 = [int(s) for s in conf['ip.%d.scan.%d.offset'%(0,0)].split(',')]
        if ip >= iCameraNoPerRow:
            dOffset0 = [int(s) for s in conf['ip.%d.scan.%d.offset'%(ip- iCameraNoPerRow,scan)].split(',')]
            dResolution = [float(s) for s in conf['ip.%d.scan.%d.res'%(ip- iCameraNoPerRow,scan)].split(',')]
            dBottom = (dOffset[1] - dOffset0[1]) / dResolution[1] + (dOffset0[1] - dOffset00[1]) / dResolution[1]
        else:
            dResolution = [float(s) for s in conf['ip.%d.scan.%d.res'%(ip,scan)].split(',')]
            dBottom = (dOffset[1] - dOffset00[1]) / dResolution[1];
            
        iRange_Left = math.ceil(dLeft);
        iRange_Bottom = math.ceil(dBottom)
            
        return dLeft,iRange_Left,iRange_Bottom
    
    def _generate_glass_map(self,root):
        conf = ConfigParser.RawConfigParser()
        with open(root + '\camera.ini', 'r') as f:
            conf.read_string("[DEFAULT]\r\n" + f.read())
            
        ip_num = int(conf._defaults['ip.number'])
        scan_num = int(conf._defaults['ip.scan.number'])
        dLeft = 0
        
        scanrect = [int(s) for s in conf._defaults['image.scanrect'].split(',')]
        resizerate = [float(s) for s in conf._defaults['image.dm.resizerate'].split(',')]
        
        dms = []
        width = 0
        height = 0
        for ip in range(ip_num):
            for scan in range(scan_num):
                dLeft,iRange_Left,iRange_Bottom = self._get_top_left(conf._defaults,ip,scan,dLeft)
                imgFile = root + '\\Image\\IP%d\\bmp\\AoiL_IP%d_small%d.bmp'%(ip+1,ip,scan)
                dms.append({'imgFile':imgFile,'iRange_Left':iRange_Left,'iRange_Bottom':iRange_Bottom})
                if iRange_Left > width:
                    width = iRange_Left
                if iRange_Bottom > height:
                    height = iRange_Bottom

        width = math.floor((width+scanrect[2])/resizerate[0])
        height = math.floor((height+scanrect[3])/resizerate[1])
        dest = Image.new('L', (width,height))        
        for dm in dms:
            im = Image.open(dm['imgFile'])
            left = math.ceil(dm['iRange_Left'] / resizerate[0])
            top = height - math.ceil((dm['iRange_Bottom'] + scanrect[3] -1) / resizerate[1])
            dest.paste(im, (left,top))
            im.close()
                
        dest.save(root + '\glass.bmp', format="bmp")    
    
    def _generate_glass_map2(self,root):
        conf = ConfigParser.RawConfigParser()
        with open(root + '\camera.ini', 'r') as f:
            conf.read_string("[DEFAULT]\r\n" + f.read())
            
        ip_num = int(conf._defaults['ip.number'])
        scan_num = int(conf._defaults['ip.scan.number'])
        dLeft = 0
        
        scanrect = [int(s) for s in conf._defaults['image.scanrect'].split(',')]
        resizerate = [float(s) for s in conf._defaults['image.dm.resizerate'].split(',')]
        
        dms = []
        width = 0
        height = 0
        for ip in range(ip_num):
            for scan in range(scan_num):
                dLeft,iRange_Left,iRange_Bottom = self._get_top_left(conf._defaults,ip,scan,dLeft)
                imgFile = root + '\\Image\\IP%d\\bmp\\AoiL_IP%d_small%d.bmp'%(ip+1,ip,scan)
                dms.append({'imgFile':imgFile,'iRange_Left':iRange_Left,'iRange_Bottom':iRange_Bottom})
                if iRange_Left > width:
                    width = iRange_Left
                if iRange_Bottom > height:
                    height = iRange_Bottom

        width = math.floor((width+scanrect[2])/resizerate[0])
        height = math.floor((height+scanrect[3])/resizerate[1])
        dest = Image.new('L', (width,height))        
        for dm in dms:
            im = Image.open(dm['imgFile'])
            left = math.ceil(dm['iRange_Left'] / resizerate[0])
            top = height - math.ceil((dm['iRange_Bottom'] + scanrect[3] -1) / resizerate[1])
            dest.paste(im, (left,top))
            im.close()
                
        dest.save(root + '\glass.bmp', format="bmp")
        
    def generate_panel_map(self,panelName,width,height,strBlocks):
        root = self.camera_path  
        blocks = json.loads(strBlocks)
        dest = Image.new('L', (int(width*PANEL_MAP_RATE),int(height*PANEL_MAP_RATE)))
        left = 0
        top = 0
        for x in range(len(blocks)):
            for y in range(len(blocks[x])-1,-1,-1):
                b = blocks[x][y]    
                if b is None or b['bHasIntersection'] == False:
                    continue;
                
                imgFile = '%s/Image/IP%d/jpegfile/AoiL_IP%d_scan%d_block%d.jpg' % (root,b['iIPIndex']+1,b['iIPIndex'],b['iScanIndex'],b['iBlockIndex'])
                
                rw = int(b['iInterSectionWidth']*PANEL_MAP_RATE)
                rh = int(b['iInterSectionHeight']*PANEL_MAP_RATE)
                try:
                    im = Image.open(imgFile)
                    im = im.transpose(Image.FLIP_TOP_BOTTOM)
                    region = im.crop((b['iInterSectionStartX'] ,im.height-(b['iInterSectionStartY']+b['iInterSectionHeight']),b['iInterSectionStartX']+ b['iInterSectionWidth'], im.height-b['iInterSectionStartY']))
                    
                    region = region.resize((rw,rh))
                    dest.paste(region, (left,top))
                    im.close()
                except Exception as e:
                    pass
                
                if y == 0:
                    left += rw
                    top = 0
                else:
                    top += rh
        dest.save(root +'/'+ panelName +'.jpg', format="jpeg")

    def _list_all_camers(self):
        cameras = []
        root = tools.config['camera_data_path']  
        for dir in os.listdir(root):   
            subdir = os.path.normpath(root + '/' + dir)
            if not os.path.isdir(subdir):
                continue
            
            iniFilePath = subdir + "/camera.ini"
            if not os.path.isfile(iniFilePath):
                continue
            
            jpgFilePath = subdir + "/Image"
            if not os.path.isdir(jpgFilePath):
                continue
            
            cameras.append((subdir,subdir))
                
            glass_map = subdir + "/glass.bmp"
            if not os.path.isfile(glass_map):
                self._generate_glass_map(subdir)
                
        return cameras

