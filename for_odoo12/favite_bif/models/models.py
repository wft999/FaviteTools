# -*- coding: utf-8 -*-
import logging
import os       

from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools


_logger = logging.getLogger(__name__)
class Panel(models.Model):
    _name = 'favite_bif.panel'   
    _inherit = ['favite_common.geometry']
    
    geo = fields.Jsonb(string = "geometry value")   
    block_id = fields.Many2one('favite_gmd.block',ondelete='cascade')   
    bif_id = fields.Many2one('favite_bif.bif',ondelete='cascade')  
    
    pad_id = fields.Many2one('favite_gmd.pad',ondelete='set null')
    gsp_id = fields.Many2one('favite_gmd.gsp',ondelete='set null')

class Bif(models.Model):
    _name = 'favite_bif.bif'
    _inherit = ['favite_common.geometry']
    
    @api.one
    @api.depends('gmd_id','gmd_id.geo')
    def _get_geo(self):
        self.camera_path = self.gmd_id.camera_path
        self.camera_ini = self.gmd_id.camera_ini
        
        self.geo['glass'] = self.gmd_id.geo['glass']
        self.geo['mark'] = self.gmd_id.geo['mark']
        self.geo['block'] = self.gmd_id.geo['block']
        
        total = self.env['favite_bif.panel'].sudo().search([('bif_id','=',self.id)])
        names = [p['name'] for b in self.geo['block']['objs'] for p in b['panels'] ]
        cur = self.env['favite_bif.panel'].sudo().search([('name','in',names)])
        (total - cur).unlink()
        
        for b in self.geo['block']['objs']:
            block = self.env['favite_gmd.block'].sudo().search([('name','=',b['name'])]);
            for p in b['panels']:
                panel = self.env['favite_bif.panel'].sudo().search([('name','=',p['name'])]);
                if not panel:
                    self.env['favite_bif.panel'].sudo().create({'bif_id': self.id,'block_id': block.id,'name':p['name']})
#         
#         self.geo['frame'] = {"objs":[]}
#         self.geo['mark'] = {"objs":[]}
#         self.geo['measure'] = {"objs":[]}
#         self.geo['fixpoint'] = {"objs":[]}
#         self.geo['lut'] = {"objs":[]}
        
    geo = fields.Jsonb(string = "geometry value",compute=_get_geo)
    
    camera_path = fields.Char(compute=_get_geo, string='Camera data path')
    camera_ini = fields.Text(compute=_get_geo)
    
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade')
    
    frame_id = fields.Many2one('favite_gmd.frame',ondelete='set null')
    mark_id = fields.Many2one('favite_gmd.mark',ondelete='set null')
    measure_id = fields.Many2one('favite_gmd.measure',ondelete='set null')
    fixpoint_id = fields.Many2one('favite_gmd.fixpoint',ondelete='set null')
    lut_id = fields.Many2one('favite_gmd.lut',ondelete='set null')
    
    panel_ids = fields.One2many('favite_bif.panel', 'bif_id', string='Panel lines')
    
    color = fields.Integer('Color Index', default=0)
 
    _sql_constraints = [
        
    ]    
    

