# -*- coding: utf-8 -*-
import logging
import os       

from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools,_


_logger = logging.getLogger(__name__)

class Frame(models.Model):
    _name = 'favite_bif.frame'
    _inherit = ['favite_common.geometry']
    
    
    @api.model
    def _default_geo(self):
        gmd = self.env['favite_gmd.gmd'].browse(self._context['default_gmd_id'])
        geo = {
        "filter":{"objs":[]},
        "inspect":{"objs":[]},
        "glass":gmd.geo['glass']
        }
        return geo
    
    @api.one
    @api.depends('gmd_id','gmd_id.geo')
    def _compute_geo(self):
        self.geo['filter'] = self.geo['filter'] or {"objs":[]}
        self.geo['inspect'] = self.geo['inspect'] or {"objs":[]}
        self.geo['glass'] = self.gmd_id.geo['glass']
    
    geo = fields.Jsonb(string = "geometry value",default=_default_geo)
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade', require=True)
    
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    @api.multi
    def get_formview_id(self, access_uid=None):
        return self.env.ref('favite_bif.favite_bif_frame_map').id
    
class Mark(models.Model):
    _name = 'favite_bif.mark'
    _inherit = ['favite_common.geometry']
    
    @api.model
    def _default_geo(self):
        gmd = self.env['favite_gmd.gmd'].browse(self._context['default_gmd_id'])
        geo = {
        "region":{"objs":[]},
        "glass":gmd.geo['glass']
        }
        return geo
    
    geo = fields.Jsonb(string = "geometry value",default=_default_geo)
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade', require=True)
    
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    @api.multi
    def get_formview_id(self, access_uid=None):
        return self.env.ref('favite_bif.favite_bif_mark_map').id
    
class Measure(models.Model):
    _name = 'favite_bif.measure'
    _inherit = ['favite_common.geometry']
    
    @api.model
    def _default_geo(self):
        gmd = self.env['favite_gmd.gmd'].browse(self._context['default_gmd_id'])
        geo = {
        "region":{"objs":[]},
        "glass":gmd.geo['glass']
        }
        return geo
    
    geo = fields.Jsonb(string = "geometry value",default=_default_geo)
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade', require=True)
    
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    @api.multi
    def get_formview_id(self, access_uid=None):
        return self.env.ref('favite_bif.favite_bif_measure_map').id
    
class Fixpoint(models.Model):
    _name = 'favite_bif.fixpoint'
    _inherit = ['favite_common.geometry']
    
    @api.model
    def _default_geo(self):
        gmd = self.env['favite_gmd.gmd'].browse(self._context['default_gmd_id'])
        geo = {
        "region":{"objs":[]},
        "glass":gmd.geo['glass']
        }
        return geo
    
    geo = fields.Jsonb(string = "geometry value",default=_default_geo)
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade', require=True)
    
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    @api.multi
    def get_formview_id(self, access_uid=None):
        return self.env.ref('favite_bif.favite_bif_fixpoint_map').id
    
class Lut(models.Model):
    _name = 'favite_bif.lut'   
    _inherit = ['favite_common.geometry']  
    
    @api.model
    def _default_geo(self):
        gmd = self.env['favite_gmd.gmd'].browse(self._context['default_gmd_id'])
        geo = {
        "controlpoint":{"objs":[]},
        "glass":gmd.geo['glass']
        }
        return geo
    
    geo = fields.Jsonb(string = "geometry value",default=_default_geo)   
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade', require=True)    
    
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    @api.multi
    def get_formview_id(self, access_uid=None):
        return self.env.ref('favite_bif.favite_bif_lut_map').id