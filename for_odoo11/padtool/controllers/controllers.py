# -*- coding: utf-8 -*-
import atexit
import collections
import json
import io
import random
import imghdr
from PIL import Image
import odoo
from odoo import http
from odoo.http import request
from odoo.tools import misc
from odoo.tools.profiler import profile

imgs = collections.OrderedDict()

class Padtool(http.Controller):
    @http.route('/padtool/restimagecahe', type='json', auth='user')
    def rest_image_cahe(self):
        imgs.clear()
        return "ok"
        
    @http.route('/padtool/<string:glass_name>/curlimage<int:width>X<int:height>', type='http', auth='user')
    #@profile
    def get_curl_image(self,glass_name,width,height,strBlocks, **k):
        global imgs
        root = odoo.tools.config['glass_root_path']
        blocks = json.loads(strBlocks)
         
        dest = Image.new('L', (width,height))
        left = 0
        top = 0
        for x in range(len(blocks)):
            for y in range(len(blocks[x])-1,-1,-1):
                b = blocks[x][y]    
                if b is None or b['bHasIntersection'] == False:
                    continue;
                
                imgFile = '%s/%s/ResizeScanJpegFile/IP%d/AoiL_IP%d_resize_small%d.jpeg' % (root,glass_name,b['iIPIndex']+1,b['iIPIndex'],b['iScanIndex'])
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
        return response    
    
    @http.route('/padtool/<string:glass_name>/image<int:width>X<int:height>', type='http', auth='user')
    #@profile
    def get_image(self,glass_name,width,height,strBlocks, **k):
        global imgs
        root = odoo.tools.config['glass_root_path']
        blocks = json.loads(strBlocks)
         
        dest = Image.new('L', (width,height))
        left = 0
        top = 0
        for x in range(len(blocks)):
            for y in range(len(blocks[x])-1,-1,-1):
                b = blocks[x][y]    
                if b is None or b['bHasIntersection'] == False:
                    continue;
                
                imgFile = '%s/%s/JpegFile/IP%d/AoiL_IP%d_scan%d_block%d.jpg' % (root,glass_name,b['iIPIndex']+1,b['iIPIndex'],b['iScanIndex'],b['iBlockIndex'])
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
        return response
    
    @http.route('/padtool/pad/save', type='json', auth="user")
    def save_pad(self, path, arch):
        """
        Edit a custom view

        :param int custom_id: the id of the edited custom view
        :param str arch: the edited arch of the custom view
        :returns: dict with acknowledged operation (result set to True)
        """
        #custom_view = request.env['ir.ui.view.custom'].browse(custom_id)
        #custom_view.write({ 'arch': arch })
        return {'result': True}
    
    @http.route('/padtool/import_pad', methods=['POST'])
    def import_pad(self, file, menu_id, jsonp='callback'):
        result =  request.env['padtool.pad'].import_pad(file,menu_id)
        return 'window.top.%s(%s)' % (misc.html_escape(jsonp), json.dumps(result))
