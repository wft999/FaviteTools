# -*- coding: utf-8 -*-
import atexit
import collections
import json
import io
import os   
import time
import random
import imghdr
from PIL import Image
import odoo
from odoo import http
from odoo.http import request
from odoo.tools import misc
from odoo.tools.profiler import profile

imgs = collections.OrderedDict()

class Gmd(http.Controller):
    @http.route('/gmd/restimagecahe', type='json', auth='user')
    def rest_image_cahe(self):
        imgs.clear()
        return "ok"

    @http.route('/gmd/<string:gmd_id>/curlimage<int:width>X<int:height>', type='http', auth='user')
    #@profile
    def get_curl_image(self,gmd_id,width,height,strBlocks, **k):
        global imgs
        root = request.env['favite_gmd.gmd'].browse(gmd_id).camera_path
        blocks = json.loads(strBlocks)
         
        dest = Image.new('L', (width,height))
        left = 0
        top = 0
        for x in range(len(blocks)):
            for y in range(len(blocks[x])-1,-1,-1):
                b = blocks[x][y]    
                if b is None or b['bHasIntersection'] == False:
                    continue;
                
                #imgFile = '%s/Image/IP%d/jpegfile/AoiL_IP%d_resize_small%d.jpeg' % (root,glass_name,b['iIPIndex']+1,b['iIPIndex'],b['iScanIndex'])
                #imgFile = self.compute_jpeg_path(b['iIPIndex'],b['iScanIndex'],b['iBlockIndex'])
                if imgFile in imgs:
                    im = imgs[imgFile] #Image.frombytes('L', (imgs[imgFile]['width'],imgs[imgFile]['height']), imgs[imgFile]['img'])
                    region = im.crop((b['iInterSectionStartX'] ,im.height-(b['iInterSectionStartY']+b['iInterSectionHeight']),b['iInterSectionStartX']+ b['iInterSectionWidth'], im.height-b['iInterSectionStartY']))
                    dest.paste(region, (left,top))
                    if y == 0:
                        left += region.width
                        top = 0
                    else:
                        top += region.height
                    imgs.move_to_end(imgFile)
                else:        
                    im = Image.open(imgFile)
                    im = im.transpose(Image.FLIP_TOP_BOTTOM)
                    region = im.crop((b['iInterSectionStartX'] ,im.height-(b['iInterSectionStartY']+b['iInterSectionHeight']),b['iInterSectionStartX']+ b['iInterSectionWidth'], im.height-b['iInterSectionStartY']))
                    dest.paste(region, (left,top))
                    if y == 0:
                        left += region.width
                        top = 0
                    else:
                        top += region.height
                            
                    imgs[imgFile] = im #{'img':im.tobytes(),'width':im.width,'height':im.height}
                    if(len(imgs) > 20):
                        im = imgs.popitem(last=False)[1]
                        im.close()
                        
                    

        output = io.BytesIO()
        dest.save(output, format="JPEG")
        response = http.send_file(output,filename="imgname.jpg")  
        response.headers['Cache-Control'] = 'no-cache'
        return response    
    
    @http.route('/gmd/<string:gmd_id>/image<int:width>X<int:height>', type='http', auth='user')
    #@profile
    def get_raw_image(self,gmd_id,width,height,strBlocks, **k):
        global imgs
        gmd = request.env['favite_gmd.gmd'].browse(int(gmd_id))
        blocks = json.loads(strBlocks)
         
        dest = Image.new('L', (width,height))
        left = 0
        top = 0
        for x in range(len(blocks)):
            for y in range(len(blocks[x])-1,-1,-1):
                b = blocks[x][y]    
                if b is None or b['bHasIntersection'] == False:
                    continue;
                
                #imgFile = '%s/Image/IP%d/jpegfile/AoiL_IP%d_scan%d_block%d.jpg' % (root,b['iIPIndex']+1,b['iIPIndex'],b['iScanIndex'],b['iBlockIndex'])
                imgFile = gmd.compute_jpeg_path(b['iIPIndex'],b['iScanIndex'],b['iBlockIndex'])
                if imgFile in imgs:
                    im = imgs[imgFile] #Image.frombytes('L', (imgs[imgFile]['width'],imgs[imgFile]['height']), imgs[imgFile]['img'])
                    region = im.crop((b['iInterSectionStartX'] ,im.height-(b['iInterSectionStartY']+b['iInterSectionHeight']),b['iInterSectionStartX']+ b['iInterSectionWidth'], im.height-b['iInterSectionStartY']))
                    dest.paste(region, (left,top))
                    if y == 0:
                        left += region.width
                        top = 0
                    else:
                        top += region.height
                    imgs.move_to_end(imgFile)
                else: 
                    try:       
                        im = Image.open(imgFile)
                    except Exception as e:
                        im = Image.new('L',(b['iInterSectionWidth'],b['iInterSectionHeight']))
                        
                    im = im.transpose(Image.FLIP_TOP_BOTTOM)
                    region = im.crop((b['iInterSectionStartX'] ,im.height-(b['iInterSectionStartY']+b['iInterSectionHeight']),b['iInterSectionStartX']+ b['iInterSectionWidth'], im.height-b['iInterSectionStartY']))
                    dest.paste(region, (left,top))
                    if y == 0:
                        left += region.width
                        top = 0
                    else:
                        top += region.height
                            
                    imgs[imgFile] = im #{'img':im.tobytes(),'width':im.width,'height':im.height}
                    if(len(imgs) > 20):
                        im = imgs.popitem(last=False)[1]
                        im.close()
                        
                    

        output = io.BytesIO()
        dest.save(output, format="JPEG")
        response = http.send_file(output,filename="imgname.jpg")  
        response.headers['Cache-Control'] = 'no-cache'
        return response
    
    @http.route('/gmd/<string:gmd_id>/image<int:width>X<int:height>/p<int:x1>X<int:y1>', type='http', auth='user')
    #@profile
    def get_raw_image_lut(self,gmd_id,width,height,x1,y1,strBlocks, **k):
        global imgs
        gmd = request.env['favite_gmd.gmd'].browse(int(gmd_id))
        blocks = json.loads(strBlocks)
        
         
        dest = Image.new('L', (width,height))
        left = 0
        top = 0
        for x in range(len(blocks)):
            for y in range(len(blocks[x])-1,-1,-1):
                b = blocks[x][y]    
                if b is None or b['bHasIntersection'] == False:
                    continue;
                
                #imgFile = '%s/Image/IP%d/jpegfile/AoiL_IP%d_scan%d_block%d.jpg' % (root,b['iIPIndex']+1,b['iIPIndex'],b['iScanIndex'],b['iBlockIndex'])
                imgFile = gmd.compute_jpeg_path(b['iIPIndex'],b['iScanIndex'],b['iBlockIndex'])
                if imgFile in imgs:
                    im = imgs[imgFile] #Image.frombytes('L', (imgs[imgFile]['width'],imgs[imgFile]['height']), imgs[imgFile]['img'])
                    region = im.crop((b['iInterSectionStartX'] ,im.height-(b['iInterSectionStartY']+b['iInterSectionHeight']),b['iInterSectionStartX']+ b['iInterSectionWidth'], im.height-b['iInterSectionStartY']))
                    dest.paste(region, (left,top))
                    if y == 0:
                        left += region.width
                        top = 0
                    else:
                        top += region.height
                    imgs.move_to_end(imgFile)
                else:        
                    try:       
                        im = Image.open(imgFile)
                    except Exception as e:
                        im = Image.new('L',(b['iInterSectionWidth'],b['iInterSectionHeight']))
                    im = im.transpose(Image.FLIP_TOP_BOTTOM)
                    region = im.crop((b['iInterSectionStartX'] ,im.height-(b['iInterSectionStartY']+b['iInterSectionHeight']),b['iInterSectionStartX']+ b['iInterSectionWidth'], im.height-b['iInterSectionStartY']))
                    dest.paste(region, (left,top))
                    if y == 0:
                        left += region.width
                        top = 0
                    else:
                        top += region.height
                            
                    imgs[imgFile] = im #{'img':im.tobytes(),'width':im.width,'height':im.height}
                    if(len(imgs) > 20):
                        im = imgs.popitem(last=False)[1]
                        im.close()
                        
        lut = request.env['favite_bif.lut'].calc_lut(x1,y1)            
        dest = dest.point(lambda p : lut[p])
        output = io.BytesIO()
        dest.save(output, format="JPEG")
        response = http.send_file(output,filename="imgname.jpg")  
        response.headers['Cache-Control'] = 'no-cache'
        return response    
    
    @http.route('/gmd/<string:gmd_id>/glass/image', type='http', auth='user')
    #@profile
    def get_glass_image(self,gmd_id, **k):
        global imgs
        gmd = request.env['favite_gmd.gmd'].browse(int(gmd_id))
        if not os.path.isfile(os.path.join(gmd.camera_path , 'glass.bmp')):
            gmd._generate_glass_map()
        response = http.send_file(os.path.join(gmd.camera_path , 'glass.bmp'))  
        response.headers['Cache-Control'] = 'no-cache'
        return response
    
    @http.route('/gmd/<string:gmd_id>/panel/<string:panel_id>/image', type='http', auth='user')
    #@profile
    def get_panel_image(self,gmd_id,panel_id, **k):
        global imgs
        root = request.env['favite_gmd.gmd'].browse(int(gmd_id)).camera_path
        response = http.send_file(root+'/'+panel_id+".jpg")  
        response.headers['Cache-Control'] = 'no-cache'
        return response