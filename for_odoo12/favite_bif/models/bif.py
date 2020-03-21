# -*- coding: utf-8 -*-
import logging
import os       

from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools,_


_logger = logging.getLogger(__name__)

class Panel(models.Model):
    _name = 'favite_bif.panel'   
    _inherit = ['favite_common.geometry']
    
    active = fields.Boolean(default=True)
    
    @api.model
    def _default_geo(self):
        geo = {
        "filter":{"objs":[]},
        }
        return geo
        
    @api.one
    @api.onchange('gmd_id','gmd_id.geo')
    def _compute_geo(self):
        self.geo['glass'] = self.gmd_id.geo['glass']
    
    geo = fields.Jsonb(string = "geometry value",default=_default_geo)   
       
    bif_id = fields.Many2one('favite_bif.bif',ondelete='cascade')  
    gsp_id = fields.Many2one('favite_bif.gsp',ondelete='set null',domain="[('bif_id', '=', bif_id)]")
    
    gmd_id = fields.Many2one('favite_gmd.gmd',related='bif_id.gmd_id')
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    @api.multi
    def get_formview_id(self, access_uid=None):
        return self.env.ref('favite_bif.favite_bif_panel_map').id

class Bif(models.Model):
    _name = 'favite_bif.bif'
    _inherit = ['favite_common.geometry']
    
    @api.one
    def _inverse_geo(self):
        if self.frame_id:
            if 'frame_filter' in self.geo:
                self.frame_id.geo['filter'] = self.geo['frame_filter']
            if 'frame_inspect' in self.geo:
                self.frame_id.geo['inspect'] = self.geo['frame_inspect']
            self.frame_id.write({'geo':self.frame_id.geo})
    
    @api.one
    @api.depends('gmd_id','gmd_id.geo','frame_id','frame_id.geo')
    def _compute_geo(self):
        self.geo['glass'] = self.gmd_id.geo['glass']
        self.geo['mark'] = self.gmd_id.geo['mark']
        self.geo['mark']['readonly'] = True
        self.geo['panel'] = {"objs":[],"readonly":True}
        
        total = self.env['favite_bif.panel'].sudo().search([('bif_id','=',self.id)])
        names = [p['name'] for b in self.gmd_id.geo['block']['objs'] for p in b['panels'] ]
        cur = self.env['favite_bif.panel'].sudo().search([('name','in',names)])
        (total - cur).unlink()
        
        for b in self.gmd_id.geo['block']['objs']:
            for p in b['panels']:
                self.geo['panel']['objs'].append(p)
                panel = self.env['favite_bif.panel'].sudo().search([('name','=',p['name'])]);
                if not panel:
                    self.env['favite_bif.panel'].sudo().create({'bif_id': self.id,'name':p['name']})
         
        self.geo['frame_filter'] = self.frame_id.geo['filter'] if self.frame_id else  {"objs":[]}
        self.geo['frame_inspect'] = self.frame_id.geo['inspect'] if self.frame_id else  {"objs":[]}
        
        self.geo['panel_filter'] = {"objs":[]}
        for panel in self.panel_ids:
            for obj in panel.geo['filter']['objs']:
                filter = obj
                filter['name'] = panel['name']
                self.geo['panel_filter']['objs'].append(filter)
        
    geo = fields.Jsonb(string = "geometry value",compute='_compute_geo',inverse='_inverse_geo')
    
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade', requery=True)
    
    frame_id = fields.Many2one('favite_bif.frame',ondelete='set null')
    mark_id = fields.Many2one('favite_bif.mark',ondelete='set null')
    measure_id = fields.Many2one('favite_bif.measure',ondelete='set null')
    fixpoint_id = fields.Many2one('favite_bif.fixpoint',ondelete='set null')
    lut_id = fields.Many2one('favite_bif.lut',ondelete='set null')
    
    panel_ids = fields.One2many('favite_bif.panel', 'bif_id', string='Panel')
    gsp_ids = fields.One2many('favite_bif.gsp', 'bif_id', string='Gsp')
    
    color = fields.Integer('Color Index', default=0)
 
    _sql_constraints = [
        
    ]    
    
    @api.multi  
    def open_map(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': self.name,
            'res_model': self._name,
            'res_id': self.id,
            'view_id': self.env.ref('favite_bif.favite_bif_bif_map').id,
            'view_type': 'map',
            'view_mode': 'map',
            'target': 'current',
            'flags':{'hasSearchView':False}
            }
    
    @api.multi
    def open_gsp_list(self):
        ctx = dict(
            default_bif_id=self.id,
        )
        return {
            'type': 'ir.actions.act_window',
            'name':'Gsp',
            'res_model': 'favite_bif.gsp',
            'view_mode': 'kanban,form',
            'view_id': False,
            'target': 'current',
            'flags':{'import_enabled':False},
            'domain': [('bif_id', '=', self.id)],
            'context': ctx,
            }
