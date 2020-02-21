# -*- coding: utf-8 -*-
import logging
import os       

from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools,_


_logger = logging.getLogger(__name__)
    
class Gsp(models.Model):
    _name = 'favite_bif.gsp'   
    _inherit = ['favite_common.geometry']
    
    @api.one
    @api.depends('gmd_id','gmd_id.geo','bif_id','src_panel_id')
    def _compute_geo(self):
        self.geo['glass'] = self.gmd_id.geo['glass']
        objs = self.bif_id.geo['panel']['objs']
        self.geo['panel'] = {"readonly":True,'objs':[obj for obj in objs if obj['name'] == self.src_panel_id.name]}
    
    geo = fields.Jsonb(string = "geometry value",compute='_compute_geo',store=True)   
    bif_id = fields.Many2one('favite_bif.bif',ondelete='cascade')  
    gmd_id = fields.Many2one('favite_gmd.gmd',related='bif_id.gmd_id')
    pad_id = fields.Many2one('favite_bif.pad',ondelete='set null',domain="[('gmd_id', '=', gmd_id),('src_panel_id', '=', src_panel_id)]")  
    src_panel_id = fields.Many2one('favite_bif.panel',ondelete='cascade', domain="[('gmd_id', '=', gmd_id)]")  
    panel_polygon_file = fields.Char()

    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True) 
    
    @api.multi
    def edit_dialog(self):
        form_view = self.env.ref('favite_bif.favite_bif_gsp_map')
        return {
            'name': _('Gsp'),
            'res_model': self._name,
            'res_id': self.id,
            'views': [(form_view.id, 'form'),],
            'type': 'ir.actions.act_window',
            'target': 'new'
        }
            
    @api.multi  
    def open_map(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': self.name,
            'res_model': self._name,
            'res_id': self.id,
            'view_id': self.env.ref('favite_bif.gsp_form').id,
            'view_type': 'map',
            'view_mode': 'map',
            'target': 'current',
            'flags':{'hasSearchView':False}
            }
        
    @api.multi
    def open_pad_list(self):
        ctx = dict(
            default_gmd_id=self.gmd_id.id,
            default_src_panel_id=self.src_panel_id.id,
        )
        return {
            'type': 'ir.actions.act_window',
            'name':'Pad',
            'res_model': 'favite_bif.pad',
            'view_mode': 'kanban,form',
            'view_id': False,
            'target': 'current',
            'flags':{'import_enabled':False},
            'domain': [('src_panel_id', '=', self.src_panel_id.id),('gmd_id', '=', self.gmd_id.id)],
            'context': ctx,
            }
        
