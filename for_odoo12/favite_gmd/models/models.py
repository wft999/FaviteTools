# -*- coding: utf-8 -*-
import logging
import atexit
import os       
 
# m4a_path = "D:/test/QTDownloadRadio/"
# m4a_file = os.listdir(m4a_path)
# for i, m4a in enumerate(m4a_file):
#     os.system("D:/test/ffmpeg -i "+ m4a_path + m4a 
#     + " " + m4a_path + str(i) + ".mp3" )


import threading

from lxml import etree
from lxml.etree import LxmlError
from lxml.builder import E

import watchdog
from watchdog.observers import Observer
from watchdog.events import FileCreatedEvent, FileModifiedEvent, FileMovedEvent

from odoo import fields, api, SUPERUSER_ID, sql_db, registry, tools
from odoo.addons.favite_common.models.models import CommonModel 

_logger = logging.getLogger(__name__)

class Gmd(CommonModel):
    _name = 'favite_gmd.gmd.obj'
    _inherit = []
 
    type = fields.Selection(required=True,string = "Object type",selection=[('UP', 'UP'), ('DOWN', 'DOWN'), ('HALF-UP', 'HALF-UP')],
        default='HALF-UP')
    value = fields.Jsonb(required=True,string = "Object value",default="{}")
    gmd_id = fields.Many2one('favite_gmd.gmd',string='Gmd',default=lambda self: self.env.context.get('default_gmd_id'),index=True)

class Gmd(CommonModel):
    _name = 'favite_gmd.gmd'
    _inherit = []
 
    camera_data_path = fields.Char(required=True,string = "camera data directory")
    name = fields.Char(compute="_get_name", store=True)
    description = fields.Text()
    
    objs = fields.One2many('favite_gmd.gmd.obj', 'gmd_id', string="Objs")
     
    _sql_constraints = [
        ('camera_data_uniq', 'unique (camera_data_path)', "Directory already exists !"),
    ]    
 
    @api.depends('camera_data_path')
    def _get_name(self):
        self.name = os.path.basename(self.camera_data_path)
        
    
    @api.model
    def load_views(self, views, options=None):
        result = super(Gmd, self).load_views(views, options)

        if 'form' in result['fields_views'] and result['fields_views']['form']['name'] == 'favite_gmd.gmd.form':
            notebook = E.xpath(expr="//notebook", position="inside")

            pages = {}
            g1 = {}
            g2 = {}
            
            fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
            for fname, field in sorted(fields_data.items(), key=lambda f: f[1]['sequence']):
                if field['state'] != 'manual':
                    continue
                if not fname.startswith('x_'):
                    continue
                
                if 'locate' not in field or field['locate'] is None:
                    names = ['Common','Unnamed','Others']
                else:
                    names = field['locate'].split('.')
                    if len(names) == 1:
                        names = ['Common','Unnamed']+ names
                    elif len(names) == 2:
                        names = ['Common']+names
                        
                key1 = names[0]
                if key1 not in pages:
                    p = E.page(string=names[0])
                    pages[key1] = p
                    notebook.append(p)
                    
                key2 = names[0] + '.' + names[1]
                if key2 not in g1:
                    g = E.group(string=names[1])
                    g1[key2] = g
                    pages[key1].append(g)
                    
                key3 = names[0] + '.' + names[1]  + '.' + names[2]
                if key3 not in g2:
                    g = E.group(string=names[2])
                    g2[key3] = g
                    g1[key2].append(g)
                    
                g2[key3].append(E.field(name=fname))

            src = etree.fromstring(result['fields_views']['form']['arch'])
            View = self.env['ir.ui.view']
            dest = View.apply_inheritance_specs(src,notebook,0)
            result['fields_views']['form']['arch'] = etree.tostring(dest, encoding='unicode')
        
        return result    
        
        
    def update_module(self):
        self.env['ir.module.module'].search([('name','=',self._module)]).button_immediate_upgrade()
        
    @api.multi  
    def open_details(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': "Details",
            'res_model': "favite_gmd.gmd",
            'res_id': self.id,
            'view_id': False,
            'view_type': 'form',
            'view_mode': 'form',
            'target': 'current',
            }
        
    @api.model
    def open_kanban(self):
        self._process_camera_data()
        return {
            'type': 'ir.actions.act_window',
            'name': "Gmd",
            'res_model': "favite_gmd.gmd",
            'view_mode': 'kanban,form',
            'view_id': False,
            'view_type': 'form',
            'target': 'current',
            'flags':{'import_enabled':False}
            }
        
    @api.model
    def _process_camera_data(self):
        
        root = tools.config['camera_data_path']         
        for dir in os.listdir(root):   
            path = root + os.path.sep + dir
            if not os.path.isdir(path):
                continue
            
            iniFilePath = path + os.path.sep + "camera.ini"
            if not os.path.isfile(iniFilePath):
                continue
            
            jpgFilePath = path + os.path.sep + "JpegFile"
            if not os.path.isdir(jpgFilePath):
                continue
            
            
            if not self.search([('camera_data_path', '=', path)], limit=1):
                self.create({'camera_data_path':path})
        
    @classmethod
    def _process_watchdog_event(cls, job_cr, event):
        
        if isinstance(event, (FileCreatedEvent, FileModifiedEvent, FileMovedEvent)):
            if not event.is_directory:
                path = getattr(event, 'dest_path', event.src_path)

        try:
            with api.Environment.manage():
                gmd = api.Environment(job_cr, SUPERUSER_ID, {})[cls._name]
                root = odoo.tools.config['camera_data_path']   
                
                for dir in os.listdir(root):   
                    if not os.path.isdir(dir):
                        continue
                    
                    iniFilePath = root + '/' + dir + "/camera.ini"
                    if not os.path.isfile(iniFilePath):
                        continue
                    
                    jpgFilePath = root + '/' + dir + "/JpegFile"
                    if not os.path.isdir(jpgFilePath):
                        continue
                    
                    if not gmd.search([('camera_data_path','=',dir)]):
                        gmd.create({'camera_data_path':dir})

                
        finally:
            job_cr.commit()
        
class FSWatchdog(object):
    def __init__(self):
        self.observer = Observer()
        path = 'D:\BaiduNetdiskDownload'
        _logger.info('Watching addons folder %s', path)
        self.observer.schedule(self, path, recursive=True)

    def dispatch(self, event):
        _logger.info('event is %s',event)
        db_name = threading.current_thread().dbname
        db = sql_db.db_connect(db_name)
        
        job_cr = db.cursor()
        try:
            reg = registry(db_name)
#             reg['favite_gmd.gmd']._process_watchdog_event(job_cr,event)
        except Exception as e:
            _logger.exception('Unexpected exception while processing cron job %r', e)
        finally:
            job_cr.close()


    def start(self):
        atexit.register(self.stop)
        self.observer.start()
        _logger.info('AutoReload watcher running with watchdog')
                

    def stop(self):
        _logger.info('watcher exit')
        self.observer.stop()
        self.observer.join()
