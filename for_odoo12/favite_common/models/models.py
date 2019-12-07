# -*- coding: utf-8 -*-
from lxml import etree
from lxml.etree import LxmlError
from lxml.builder import E

import re
from PIL import Image
import math

import logging
import atexit
import os   
import io
import json

import threading
import watchdog
from watchdog.observers import Observer
from watchdog.events import FileCreatedEvent, FileModifiedEvent, FileMovedEvent

try:
    import configparser as ConfigParser
except ImportError:
    import ConfigParser

from odoo import models, fields, api, _, tools
from odoo.exceptions import UserError, ValidationError
from suds import null
from numpy.f2py.auxfuncs import isinteger

PADNAME_PATTERN = '^[a-zA-Z0-9][a-zA-Z0-9_-]+$'

class View(models.Model):
    _inherit = 'ir.ui.view'

    type = fields.Selection(selection_add=[('map', "Map")])
    
class ActWindowView(models.Model):
    _inherit = 'ir.actions.act_window.view'

    view_mode = fields.Selection(selection_add=[('map', "Map")])
    

class GeometryModel(models.Model):
    _name = 'favite_common.geometry'
    
    name = fields.Char(required=True,)
    description = fields.Text()
    
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Name already exists !"),
    ]
    
    @api.one
    @api.constrains('name')
    def _check_name(self):
        if not re.match(PADNAME_PATTERN, self.name):
            raise ValidationError(_('Invalid name. Only alphanumerical characters, underscore, hyphen are allowed.'))
    
    @api.multi
    def close_dialog(self):
        return {'type': 'ir.actions.act_window_close'}
    
    @api.multi
    def get_formview_action(self, access_uid=None):
        """ Return an action to open the document ``self``. This method is meant
            to be overridden in addons that want to give specific view ids for
            example.

        An optional access_uid holds the user that will access the document
        that could be different from the current user. """
        view_id = self.sudo().get_formview_id(access_uid=access_uid)
        return {
            'type': 'ir.actions.act_window',
            'res_model': self._name,
            'view_type': 'map',
            'view_mode': 'map',
            'views': [(view_id, 'map')],
            'target': 'current',
            'res_id': self.id,
            'context': dict(self._context),
            'flags':{'hasSearchView':False}
        }
    
    @api.multi  
    def open_map(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': self.name,
            'res_model': self._name,
            'res_id': self.id,
            'view_id': False,
            'view_type': 'map',
            'view_mode': 'map',
            'target': 'current',
            'flags':{'hasSearchView':False}
            }
        
    @api.model
    def open_kanban(self):
        return {
            'type': 'ir.actions.act_window',
            'name': self._name.split('.')[-1],
            'res_model': self._name,
            'view_mode': 'kanban,form',
            'view_id': False,
            'target': 'current',
            'flags':{'import_enabled':False}
            }
    
    @api.model
    def load_views(self, views, options=None):
        result = super(GeometryModel, self).load_views(views, options)

        if 'map' in result['fields_views'] or 'form' in result['fields_views']:
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

            if 'map' in result['fields_views']:
                src = etree.fromstring(result['fields_views']['map']['arch'])
            elif 'form' in result['fields_views']:
                src = etree.fromstring(result['fields_views']['form']['arch'])
            View = self.env['ir.ui.view']
            node = View.locate_node(src,notebook)
            if node  is not None:
                dest = View.apply_inheritance_specs(src,notebook,0)
            
                if 'map' in result['fields_views']:
                    result['fields_views']['map']['arch'] = etree.tostring(dest, encoding='unicode')
                elif 'form' in result['fields_views']:
                   result['fields_views']['form']['arch'] = etree.tostring(dest, encoding='unicode')
                
        return result   
    

class Camera(models.Model):
    _name = 'favite_common.camera'

    name = fields.Char(required=True,)
 
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Name already exists !"),
    ]    
        

    @api.model
    def _generate_glass_map(self,root):
        pass
        
    @classmethod
    def _process_watchdog_event(cls, job_cr, event):
        
        if isinstance(event, (FileCreatedEvent, FileModifiedEvent, FileMovedEvent)):
            if not event.is_directory:
                path = getattr(event, 'dest_path', event.src_path)

        try:
            with api.Environment.manage():
                camera = api.Environment(job_cr, SUPERUSER_ID, {})[cls._name]
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
                    
                    if not camera.search([('name','=',dir)], limit=1):
                        camera.create({'name':dir})
                        
                    glass_map = root + '/' + dir + "/glass.bmp"
                    if not os.path.isfile(glass_map):
                        camera._generate_glass_map(root + '/' + dir)

        finally:
            job_cr.commit()
        


class FSWatchdog(object):
    def __init__(self):
        self.observer = Observer()
        root = tools.config['camera_data_path']    
#       path = 'D:\BaiduNetdiskDownload'
        _logger.info('Watching addons folder %s', path)
        self.observer.schedule(self, root, recursive=True)

    def dispatch(self, event):
        _logger.info('event is %s',event)
        db_name = threading.current_thread().dbname
        db = sql_db.db_connect(db_name)
        
        job_cr = db.cursor()
        try:
            reg = registry(db_name)
            reg['favite_common.data_path']._process_watchdog_event(job_cr,event)
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
