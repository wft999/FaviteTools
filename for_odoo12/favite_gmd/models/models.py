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
import watchdog
from watchdog.observers import Observer
from watchdog.events import FileCreatedEvent, FileModifiedEvent, FileMovedEvent

from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools


_logger = logging.getLogger(__name__)


class Gmd(models.Model):
    _name = 'favite_gmd.gmd'
    _inherit = ['favite_common.geometry']
    
    @api.model
    def _default_geo(self):
        geo = {
        "mark":{
            "objs":[
                {"points":[{"x":100,"y":100},{"x":500,"y":500},{"x":500,"y":100}]},
                {"points":[{"x":600,"y":600},{"x":700,"y":700},{"x":700,"y":600}]},
                ]
            },
        "submark":{
            "objs":[
                {"points":[{"x":400,"y":700},{"x":500,"y":800}]},
                {"points":[{"x":600,"y":900},{"x":800,"y":1000}]},
                ]
            },
        }
        return geo
    
    geo = fields.Jsonb(required=True,string = "geometry value",default=_default_geo)
 
    _sql_constraints = [
        
    ]    
        

        
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
