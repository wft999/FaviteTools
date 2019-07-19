# -*- coding: utf-8 -*-
import logging
import os       
 
# m4a_path = "D:/test/QTDownloadRadio/"
# m4a_file = os.listdir(m4a_path)
# for i, m4a in enumerate(m4a_file):
#     os.system("D:/test/ffmpeg -i "+ m4a_path + m4a 
#     + " " + m4a_path + str(i) + ".mp3" )




from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools


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
    
    geo = fields.Jsonb(required=True,string = "geometry value",default=_default_geo)
    color = fields.Integer('Color Index', default=0)
 
    _sql_constraints = [
        
    ]    
    

