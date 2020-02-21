# -*- coding: utf-8 -*-
import logging
import os       

from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools,_


_logger = logging.getLogger(__name__)
class Pad(models.Model):
    _name = 'favite_bif.pad'   
    _inherit = ['favite_common.geometry']
    
    @api.one
    @api.depends('gmd_id','gmd_id.geo','src_panel_id')
    def _compute_geo(self):
        self.geo['mark'] = {"objs":[]}
        self.geo['submark'] = {"objs":[]}
        self.geo['regular'] = {"objs":[]}
        self.geo['unregular'] = {"objs":[]}
        self.geo['frame'] = {"objs":[]}
        self.geo['region'] = {"objs":[]}
        self.geo['filterregion'] = {"objs":[]}
        
        self.geo['glass'] = self.gmd_id.geo['glass']
        bobjs = self.gmd_id.geo['block']['objs']
        self.geo['panel'] = {"readonly":True,'objs':[obj for bobj in bobjs for obj in bobj['panels'] if obj['name'] == self.src_panel_id.name]}
    
    geo = fields.Jsonb(string = "geometry value",compute='_compute_geo',store=True)   
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade')
    src_panel_id = fields.Many2one('favite_bif.panel',ondelete='cascade',domain="[('gmd_id', '=', gmd_id)]") 
    
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    @api.model
    def _fields_view_get(self, view_id=None, view_type='form', toolbar=False, submenu=False):
        if view_type == 'map' and not view_id:
            view_id = self.env.ref('favite_bif.favite_bif_pad_map').id
            
        res = super(Pad, self)._fields_view_get(view_id=view_id, view_type=view_type, toolbar=toolbar, submenu=submenu)
        return res
    
    @api.multi
    def edit_dialog(self):
        form_view = self.env.ref('favite_bif.favite_bif_pad_map')
        return {
            'name': _('Pad'),
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
            'view_id': self.env.ref('favite_bif.favite_bif_pad_map').id,
            'view_type': 'map',
            'view_mode': 'map',
            'target': 'current',
            'flags':{'hasSearchView':False}
            }
        
    