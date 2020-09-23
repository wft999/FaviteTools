# -*- coding: utf-8 -*-
import logging
import os        
import io
import json
import math
import copy   
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
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Name already exists !"),
    ]
    
    @api.model
    def _default_geo(self):
        geo = {
        "lightregion":{"objs":[]},
        "markoffset":{"objs":[]},
        "mark":{"objs":[]},
        "block":{"objs":[],"mask":[]},
        }
        return geo
    
    @api.model
    def _default_glass(self):
        glass = {"corner":1,"size":[2200,2500],"coord":0,"iCenterMode":-1,"iLongEdge":-1,"iStartQuandrant":-1}
        return glass
    
    @api.depends('camera_path')
    def _compute_name(self):
        iniFile = os.path.join(self.camera_path, 'FISTConfig.ini')
        iniConf = ConfigParser.RawConfigParser()
        with open(iniFile, 'r') as f:
            iniConf.read_string("[DEFAULT]\r\n" + f.read())
            self.camera_name =  iniConf._defaults['CAMERA_FILE'.lower()]
    
    @api.depends('camera_path')
    def _compute_ini(self):
        iniFile = os.path.join(self.camera_path , self.camera_name)
        iniConf = ConfigParser.RawConfigParser()
        with open(iniFile, 'r') as f:
            iniConf.read_string("[DEFAULT]\r\n" + f.read())
            self.camera_ini =  json.dumps(iniConf._defaults,indent=5)
    
    
    def _list_all_camers(self):
        cameras = []
        root = tools.config['camera_data_path']  
        for dir in os.listdir(root):   
            subdir = os.path.join(root , dir)
            if not os.path.isdir(subdir):
                continue
            
            iniFilePath = os.path.join(subdir, "FISTConfig.ini")
            if not os.path.isfile(iniFilePath):
                continue
            
            jpgFilePath = os.path.join(subdir , "Image")
            if not os.path.isdir(jpgFilePath):
                continue
            
            cameras.append((subdir,subdir))
                
            glass_map = os.path.join(subdir , "glass.bmp")
            if not os.path.isfile(glass_map):
                iniFile = os.path.join(subdir, 'FISTConfig.ini')
                iniConf = ConfigParser.RawConfigParser()
                with open(iniFile, 'r') as f:
                    iniConf.read_string("[DEFAULT]\r\n" + f.read())
                    camera_name =  iniConf._defaults['CAMERA_FILE'.lower()]
            
                    self._generate_glass_map(subdir,camera_name)
                
        return cameras
    
    @api.model
    def _default_camera(self):
        camera = ''
        root = tools.config['camera_data_path']  
        for dir in os.listdir(root):   
            subdir = os.path.join(root , dir)
            if not os.path.isdir(subdir):
                continue
            
            iniFilePath = os.path.join(subdir, "FISTConfig.ini")
            if not os.path.isfile(iniFilePath):
                continue
            
            jpgFilePath = os.path.join(subdir , "Image")
            if not os.path.isdir(jpgFilePath):
                continue
            
            if dir == 'default':
                camera = subdir
                break
                
        return camera
    
    camera_path = fields.Selection(selection='_list_all_camers',default=_default_camera,string='Camera data path', required=True)
    camera_name = fields.Text(compute='_compute_name')
    camera_ini = fields.Text(compute='_compute_ini')
    geo = fields.Jsonb(required=True,string = "geometry value",default=_default_geo)
    glass = fields.Jsonb(required=True,string = "glass value",default=_default_glass)
    color = fields.Integer('Color Index', default=0)
 
    _sql_constraints = [
        
    ]    
    
    @api.model
    def create(self, vals):   
        root = tools.config['camera_data_path']     
        if vals['camera_path'].endswith('default'):
            newPath = os.path.join(root , vals['name'])
            os.rename(vals['camera_path'],newPath)
            vals['camera_path'] = newPath
        
        return super(Gmd, self).create(vals)

        
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
    
    def _generate_glass_map(self,root,camera_name):
        conf = ConfigParser.RawConfigParser()
        with open(os.path.join(root, camera_name), 'r') as f:
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
    
    def _generate_glass_map2(self,root,camera_name):
        conf = ConfigParser.RawConfigParser()
        with open(os.path.join(root , camera_name), 'r') as f:
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



    def export_coord(self):
        iCenterMode = 1
        iLongEdge = 1
        iStartQuandrant = 1
        if self.glass['coord'] == 0:
            iCenterMode = 1
            iLongEdge = 1
            iStartQuandrant = 1
        elif self.glass['coord'] == 1:
            iCenterMode = 1
            iLongEdge = 1
            iStartQuandrant = 2
        elif self.glass['coord'] == 2:
            iCenterMode = 1
            iLongEdge = 1
            iStartQuandrant = 3
        elif self.glass['coord'] == 3:
            iCenterMode = 1
            iLongEdge = 1
            iStartQuandrant = 4
        elif self.glass['coord'] == 4:
            iCenterMode = 1
            iLongEdge = 0
            iStartQuandrant = 1
        elif self.glass['coord'] == 5:
            iCenterMode = 1
            iLongEdge = 0
            iStartQuandrant = 2
        elif self.glass['coord'] == 6:
            iCenterMode = 1
            iLongEdge = 0
            iStartQuandrant = 3
        elif self.glass['coord'] == 1:
            iCenterMode = 1
            iLongEdge = 0
            iStartQuandrant = 4
        elif self.glass['coord'] == 1:
            iCenterMode = 0
            iLongEdge = 1
            iStartQuandrant = 1
        elif self.glass['coord'] == 1:
            iCenterMode = 0
            iLongEdge = 1
            iStartQuandrant = 2
        elif self.glass['coord'] == 1:
            iCenterMode = 0
            iLongEdge = 1
            iStartQuandrant = 3
        elif self.glass['coord'] == 1:
            iCenterMode = 0
            iLongEdge = 1;
            iStartQuandrant = 4
        elif self.glass['coord'] == 1:
            iCenterMode = 0
            iLongEdge = 0
            iStartQuandrant = 1
        elif self.glass['coord'] == 1:
            iCenterMode = 0
            iLongEdge = 0
            iStartQuandrant = 2
        elif self.glass['coord'] == 1:
            iCenterMode = 0
            iLongEdge = 0
            iStartQuandrant = 3
        elif self.glass['coord'] == 1:
            iCenterMode = 0
            iLongEdge = 0
            iStartQuandrant = 4

        return iCenterMode,iLongEdge,iStartQuandrant
    
    @api.model
    def import_coord(self, par):
        ret = 1
        centermode = 1
        longedge = 1
        iStartQuadrant = 1
        if 'coordtransform.centermode' in par:
            centermode = int(par['coordtransform.centermode'])
        if 'coordtransform.dm.longedge' in par:
            longedge = int(par['coordtransform.dm.longedge'])
        if 'coordtransform.dm.minquadrant' in par:
            iStartQuadrant = int(par['coordtransform.dm.minquadrant'])
            
        if centermode == 0:
            if iStartQuadrant == 1:
                ret = 8 if longedge else 12
            elif iStartQuadrant == 2:
                ret = 9 if longedge else 13
            elif iStartQuadrant == 3:
                ret = 10 if longedge else 14
            elif iStartQuadrant == 4:
                ret = 11 if longedge else 15
        elif centermode == 1:
            if iStartQuadrant == 1:
                ret = 0 if longedge else 4
            elif iStartQuadrant == 2:
                ret = 1 if longedge else 5
            elif iStartQuadrant == 3:
                ret = 2 if longedge else 6
            elif iStartQuadrant == 4:
                ret = 3 if longedge else 7
                
        return ret
 
    def _get_panels(self,p1,p2,blocks):
        res = []
        left = min(p1['x'],p2['x'])
        right = max(p1['x'],p2['x'])
        top = max(p1['y'],p2['y'])
        bottom = min(p1['y'],p2['y'])
            
        def _check_panel(points):
            return points[0]['x'] >= left and points[0]['x'] <= right and points[1]['x'] >= left and points[1]['x'] <= right and points[0]['y'] >= bottom and points[0]['y'] <= top and points[1]['y'] >= bottom and points[1]['y'] <= top

        for b in blocks:
            for p in b['panels']:
                if _check_panel(p['points']):
                    res.append(p['name'])
        return ','.join(res)
    
    def _um2customer(self,dCustomerPointX,dCustomerPointY,dGlassCenterX,dGlassCenterY,dAngle):
        iCenterMode,iLongEdge,iStartQuadrant = self.export_coord()
        
        dInputX = dCustomerPointX
        dInputY = dCustomerPointY
        dCustomerPointX = (dInputX -dGlassCenterX) * math.cos(dAngle) + (dInputY - dGlassCenterY) * math.sin(dAngle)
        dCustomerPointY = -(dInputX - dGlassCenterX) * math.sin(dAngle) + (dInputY - dGlassCenterY) * math.cos(dAngle)

        if iStartQuadrant == 1 or iStartQuadrant == 2:
            dCustomerPointY *= -1

        if iStartQuadrant == 1 or iStartQuadrant == 4:
            dCustomerPointX *= -1

        if iCenterMode == 0:
            dCustomerPointX += m_dGlassSizeX / 2
            dCustomerPointY += m_dGlassSizeY / 2
        elif iCenterMode == 2:
            if self.glass['size'][0] < self.glass['size'][1]:
                dCustomerPointX += self.glass['size'][0] / 2
            else:
                dCustomerPointY += self.glass['size'][1] / 2
        elif iCenterMode == 3:
            if self.glass['size'][0] > self.glass['size'][1]:
                dCustomerPointX += self.glass['size'][0] / 2
            else:
                dCustomerPointY += self.glass['size'][1] / 2


#         if iLongEdge != this.m_iGlassLongEdge:
#             dTemp = dCustomerPointX;
#             dCustomerPointX = dCustomerPointY;
#             dCustomerPointY = dTemp;

        return (dCustomerPointX, dCustomerPointY);
    
    def _export_geo(self):
        
        iniFile = os.path.join(self.camera_path , self.camera_name)
        iniConf = ConfigParser.RawConfigParser()
        with open(iniFile, 'r') as f:
            iniConf.read_string("[DEFAULT]\r\n" + f.read())
            dGlassCenterX,dGlassCenterY = (float(s) for s in iniConf._defaults['glass.center.position.0'].split(','))
            dAngle = float(iniConf._defaults['glass.angle.0'])
            
            geo = copy.deepcopy(self.geo)      
            for o in geo['lightregion']['objs']:
                for p in o['points']:
                    dCustomerPointX, dCustomerPointY = self._um2customer(p['x'],p['y'],dGlassCenterX,dGlassCenterY,dAngle)
                    p['x'] = dCustomerPointX
                    p['y'] = dCustomerPointY
                    
            for o in geo['markoffset']['objs']:
                for p in o['points']:
                    dCustomerPointX, dCustomerPointY = self._um2customer(p['x'],p['y'],dGlassCenterX,dGlassCenterY,dAngle)
                    p['x'] = dCustomerPointX
                    p['y'] = dCustomerPointY
                    
            for o in geo['mark']['objs']:
                for p in o['points']:
                    dCustomerPointX, dCustomerPointY = self._um2customer(p['x'],p['y'],dGlassCenterX,dGlassCenterY,dAngle)
                    p['x'] = dCustomerPointX
                    p['y'] = dCustomerPointY
                    
                    
            for b in geo['block']['objs']:
                if 'pad' not in b:
                    continue
                if 'panels' not in b:
                    continue
                
                for p in b['pad']['points']:
                    dCustomerPointX, dCustomerPointY = self._um2customer(p['x'],p['y'],dGlassCenterX,dGlassCenterY,dAngle)
                    p['x'] = dCustomerPointX
                    p['y'] = dCustomerPointY

                for panel in b['panels']:
                    for p in panel['points']:
                        dCustomerPointX, dCustomerPointY = self._um2customer(p['x'],p['y'],dGlassCenterX,dGlassCenterY,dAngle)
                        p['x'] = dCustomerPointX
                        p['y'] = dCustomerPointY

            return geo
    
    def _customer2um(self,dCustomerPointX,dCustomerPointY,dGlassCenterX,dGlassCenterY,dAngle):
        iCenterMode,iLongEdge,iStartQuadrant = self.export_coord()
        
        dFavitePointX = dCustomerPointX
        dFavitePointY = dCustomerPointY
#         if iImageLongEdge != this.m_iGlassLongEdge:
#             dTemp = dFavitePointX;
#             dFavitePointX = dFavitePointY;
#             dFavitePointY = dTemp;

        if iCenterMode == 0:
            dFavitePointX -= dGlassCenterX / 2
            dFavitePointY -= dGlassCenterY / 2
        elif iCenterMode == 2:
            if dGlassCenterX < dGlassCenterY:
                dFavitePointX -= dGlassCenterX / 2
            else:
                dFavitePointY -= dGlassCenterY / 2
        elif iCenterMode == 3:
            if dGlassCenterX > dGlassCenterY:
                dFavitePointX -= dGlassCenterX / 2
            else:
                dFavitePointY -= dGlassCenterY / 2

        if iStartQuadrant == 1 or this.m_iStartQuadrant == 2:
            dFavitePointY *= -1

        if iStartQuadrant == 1 or this.m_iStartQuadrant == 4:
            dFavitePointX *= -1
        
        dInputX = dFavitePointX
        dInputY = dFavitePointY
        dFavitePointX = dInputX * math.cos(-dAngle) + dInputY * math.sin(-dAngle) + dGlassCenterX;
        dFavitePointY = -dInputX * math.sin(-dAngle) + dInputY * math.cos(-dAngle) + dGlassCenterY;
        
        return (dFavitePointX,dFavitePointY)

    
    def _import_geo(self):
        iniFile = os.path.join(self.camera_path , self.camera_name)
        iniConf = ConfigParser.RawConfigParser()
        with open(iniFile, 'r') as f:
            iniConf.read_string("[DEFAULT]\r\n" + f.read())
            dGlassCenterX,dGlassCenterY = (float(s) for s in iniConf._defaults['glass.center.position.0'].split(','))
            dAngle = float(iniConf._defaults['glass.angle.0'])
            
            geo = self.geo    
            for o in geo['lightregion']['objs']:
                for p in o['points']:
                    dCustomerPointX, dCustomerPointY = self._customer2um(p['x'],p['y'],dGlassCenterX,dGlassCenterY,dAngle)
                    p['x'] = dCustomerPointX
                    p['y'] = dCustomerPointY
                    
            for o in geo['markoffset']['objs']:
                for p in o['points']:
                    dCustomerPointX, dCustomerPointY = self._customer2um(p['x'],p['y'],dGlassCenterX,dGlassCenterY,dAngle)
                    p['x'] = dCustomerPointX
                    p['y'] = dCustomerPointY
                    
            for o in geo['mark']['objs']:
                for p in o['points']:
                    dCustomerPointX, dCustomerPointY = self._customer2um(p['x'],p['y'],dGlassCenterX,dGlassCenterY,dAngle)
                    p['x'] = dCustomerPointX
                    p['y'] = dCustomerPointY
                    
                    
            for b in geo['block']['objs']:
                for p in b['pad']['points']:
                    dCustomerPointX, dCustomerPointY = self._customer2um(p['x'],p['y'],dGlassCenterX,dGlassCenterY,dAngle)
                    p['x'] = dCustomerPointX
                    p['y'] = dCustomerPointY

                for panel in b['panels']:
                    for p in panel['points']:
                        dCustomerPointX, dCustomerPointY = self._customer2um(p['x'],p['y'],dGlassCenterX,dGlassCenterY,dAngle)
                        p['x'] = dCustomerPointX
                        p['y'] = dCustomerPointY

        
            self.write({'geo': geo})
            
                   
    @api.one
    def export_file(self,directory_ids):
        strCoordtransform = 'coordtransform.customer.glasssize = %d,%d\n' % tuple(self.glass['size'])
        strCoordtransform += 'coordtransform.dm.cutcorner = %d\n' % self.glass['corner']
        
        iCenterMode,iLongEdge,iStartQuandrant = self.export_coord()
        strCoordtransform += 'coordtransform.centermode =  %d\n' % iCenterMode
        strCoordtransform += 'coordtransform.dm.longedge = %d\n' % iLongEdge
        strCoordtransform += 'coordtransform.dm.minquadrant = %d\n' % iStartQuandrant
        
        geo = self._export_geo()
        strMark = ''
        if len(geo['markoffset']['objs']) and len(geo['markoffset']['objs'][0]['points']) > 1:
            p1 = geo['markoffset']['objs'][0]['points'][0]
            p2 = geo['markoffset']['objs'][0]['points'][1]
            w = abs(p1['x'] - p2['x'])
            h = abs(p1['y'] - p2['y'])
            strMark += 'mark.offset = %f,%f\n' % (w,h)
            strMark += 'mark.offset.p1 = %f,%f\n' % (p1['x'],p1['y'])
            strMark += 'mark.offset.p2 = %f,%f\n' % (p2['x'],p2['y'])
            
        markNum = len(geo['mark']['objs'])
        strMark += 'mark.number = %d\n' % markNum
        for i in range(0,markNum):
            p1 = geo['mark']['objs'][i]['points'][0]
            p2 = geo['mark']['objs'][i]['points'][1]
            x = (p1['x'] + p2['x'])/2
            y = (p1['y'] + p2['y'])/2
            strMark += 'mark.%d.position = %f,%f\n' % (i,x,y)
            w = abs(p1['x'] - p2['x'])
            h = abs(p1['y'] - p2['y'])
            strMark += 'mark.%d.size = %f,%f\n' % (i,w,h)
            
        lightregionNum = len(geo['lightregion']['objs'])
        strlightregion = 'lightregion.number = %d\n' % lightregionNum
        for i in range(0,lightregionNum):
            p1 = geo['lightregion']['objs'][i]['points'][0]
            p2 = geo['lightregion']['objs'][i]['points'][1]
            left = min(p1['x'],p2['x'])
            right = max(p1['x'],p2['x'])
            bottom = min(p1['y'],p2['y'])
            top = max(p1['y'],p2['y'])
            strlightregion += 'lightregion.%d.position = %f,%f,%f,%f\n' % (i,left,bottom,right,top)
            
        maskNum = len(geo['block']['mask'])
        strMask = 'mask.group.number = %d\n' % maskNum
        for i in range(0,maskNum):
            strMask += 'mask.group.%d.threshold = %s\n' % (i,geo['block']['mask'][i]['threshold'])
            strMask += 'mask.group.%d.panellist = %s\n' % (i,geo['block']['mask'][i]['panels'])
            
        panelNum = 0
        strPanel = 'panel.idmode = 0\n'
        for b in geo['block']['objs']:
            if 'pad' not in b:
                continue
            if 'panels' not in b:
                continue
                
            padx = b['points'][0]['x'] - b['pad']['points'][0]['x']
            pady = b['points'][0]['y'] - b['pad']['points'][0]['y']
            for p in b['panels']:
                strPanel += 'panel.%d.pixelsize = %s\n' % (panelNum,p['pixelsize'])
                strPanel += 'panel.%d.d1g1 = %s\n' % (panelNum,p['d1g1'])
                strPanel += 'panel.%d.id = %s\n' % (panelNum,p['panel_index'])
                
                x1 = p['points'][0]['x']
                x2 = p['points'][2]['x']
                x3 = p['points'][1]['x']
                x4 = p['points'][3]['x']
                y1 = p['points'][0]['y']
                y2 = p['points'][2]['y']
                y3 = p['points'][1]['y']
                y4 = p['points'][3]['y']

                x = ((x1 - x2) * (x3 * y4 - x4 * y3) - (x3 - x4) * (x1 * y2 - x2 * y1))  / ((x3 - x4) * (y1 - y2) - (x1 - x2) * (y3 - y4))
                y = ((y1 - y2) * (x3 * y4 - x4 * y3) - (x1 * y2 - x2 * y1) * (y3 - y4))  / ((y1 - y2) * (x3 - x4) - (x1 - x2) * (y3 - y4))
                strPanel += 'panel.%d.position = %f,%f\n' % (panelNum,x,y)
                strPanel += 'panel.%d.size = %f,%f\n' % (panelNum,b['panel_width'],b['panel_height'])
                
                strPanel += 'panel.%d.padrange.left = %f\n' % (panelNum,min(x1,x2,x3,x4) - padx)
                strPanel += 'panel.%d.padrange.top = %f\n' % (panelNum,max(y1,y2,y3,y4) + pady)
                strPanel += 'panel.%d.padrange.right = %f\n' % (panelNum,max(x1,x2,x3,x4) + padx)
                strPanel += 'panel.%d.padrange.bottom = %f\n' % (panelNum,min(y1,y2,y3,y4) - pady)

                panelNum = panelNum + 1
        
        strPanel += 'panel.number = %d\n' % panelNum

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
            dir = os.path.join(d.name ,'recipe')
            if not os.path.isdir(dir):
                os.makedirs(dir) 
            dir = os.path.join(d.name ,'recipe','gmd')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            path = os.path.join(dir,self.name+'.gmd')
            with open(path, 'w') as f:
                f.write(strParameter)
                f.write(strCoordtransform)
                f.write(strMark)
                f.write(strMask)
                f.write(strlightregion)
                f.write(strPanel)
                f.write('\n#######Do not edit this field; automatically generated by export.##############\n')
                f.write('camera_path = %s\n'%self.camera_path)
                f.write('block = %s\n'%json.dumps(geo['block']))

    @api.model
    def import_file(self,file):
        written = True
        message = 'Success'

        geo = {
        "lightregion":{"objs":[]},
        "markoffset":{"objs":[]},
        "mark":{"objs":[]},
        "block":{"objs":[],"mask":[]},
        }
        glass = {"corner":1,"size":[0,0],"coord":0}
        obj = {'name':file.filename.split('.')[0]}
        
        try:
            parser = ConfigParser.RawConfigParser()
            parser.read_string("[DEFAULT]\r\n" + file.read().decode())
            par = parser._defaults
            
            obj['camera_path'] = par['camera_path']
            if 'block' in par:
                geo['block'] = json.loads(par['block'])  
            
            if 'coordtransform.customer.glasssize' in par:
                glass['size'] = [int(s) for s in par['coordtransform.customer.glasssize'].split(',')]
            if 'coordtransform.dm.cutcorner' in par:
                glass['corner'] = int(par['coordtransform.dm.cutcorner'])
            glass['coord'] = self.import_coord(par)   
            
            p = {'points':[]}
            x,y = (float(s) for s in par['mark.offset.p1'].split(','))
            p['points'].append({'x':x,'y':y})
            x,y = (float(s) for s in par['mark.offset.p2'].split(','))
            p['points'].append({'x':x,'y':y})
            geo['markoffset']['objs'].append(p)
            
            n = int(par.get('mark.number'.lower(),0))
            for i in range(0, n):
                x,y = (float(s) for s in par['mark.%d.position'%i].split(','))
                w,h = (float(s) for s in par['mark.%d.size'%i].split(','))
                p = {'points':[]}
                p['points'].append({'x':x-w/2,'y':y-h/2})
                p['points'].append({'x':x+w/2,'y':y+h/2})
                geo['mark']['objs'].append(p)
                
            n = int(par.get('lightregion.number'.lower(),0))
            for i in range(0, n):
                x1,y1,x2,y2 = (float(s) for s in par['lightregion.%d.position'%i].split(','))
                p = {'points':[]}
                p['points'].append({'x':x1,'y':y1})
                p['points'].append({'x':x2,'y':y2})
                geo['lightregion']['objs'].append(p)    
                
            n = int(par.get('mask.group.number'.lower(),0))
            for i in range(0, n):
                g = {
                    'panels':par['mask.group.%d.panellist'%i],
                    'threshold':int(par.get('mask.group.%d.threshold'%i,0))
                    }
                geo['block']['mask'].append(g)  
                
                
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
                        
            obj['geo'] = geo 
            obj['glass'] = glass 
            self.create(obj)._import_geo()         
        except Exception as e:
            written = False
            message = str(e)
        return {'success': written,'message':message} 
