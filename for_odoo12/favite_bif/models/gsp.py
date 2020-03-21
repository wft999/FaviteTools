# -*- coding: utf-8 -*-
import logging
import os       

from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools,_


_logger = logging.getLogger(__name__)

# class Zone(models.Model):
#     _name = 'favite_bif.gsp_zone'   
#     
#     gsp_id = fields.Many2one('favite_bif.gsp',ondelete='cascade')
#     
#     darktol = fields.Integer(string='Dark Tol',default=15)
#     brighttol = fields.Integer(string='Bright Tol',default=15)
#     longedgeminsize = fields.Integer(string='Long edge min size',default=0)
#     longedgemaxsize = fields.Integer(string='Long edge max size',default=0)
#     shortedgeminsize = fields.Integer(string='Short edge min size',default=0)
#     shortedgemaxsize = fields.Integer(string='Short edge max size',default=0)
    
class Gsp(models.Model):
    _name = 'favite_bif.gsp'   
    _inherit = ['favite_common.geometry']
    
#     zone_enabletbz =  fields.Boolean(string='Enable tbz')  
#     zone_ids = fields.One2many('favite_bif.gsp_zone', 'gsp_id', string='Zone')
    
    @api.model    
    def _default_geo(self):
        bif = self.env['favite_bif.bif'].browse(self._context['default_bif_id'])
        panel = self.env['favite_bif.panel'].browse(self._context['default_src_panel_id'])
        gmd = bif.gmd_id
        objs = bif.geo['panel']['objs']
        geo = {
        "domain":{"objs":[]},
        "domain_bright":{"objs":[]},
        "domain_dark":{"objs":[]},
        "zone":{"objs":[]},
        
        "polygon":{"objs":[]},
        "circle":{"objs":[]},
        "bow":{"objs":[]},
        
        "glass":gmd.geo['glass'],
        "panel":{"readonly":True,'objs':[obj for obj in objs if obj['name'] == panel.name]}
        }
        return geo
    
    
    
    geo = fields.Jsonb(string = "geometry value",default=_default_geo)   
    bif_id = fields.Many2one('favite_bif.bif',ondelete='cascade')  
    gmd_id = fields.Many2one('favite_gmd.gmd',related='bif_id.gmd_id')
    pad_id = fields.Many2one('favite_bif.pad',ondelete='set null',domain="[('gmd_id', '=', gmd_id),('src_panel_id', '=', src_panel_id)]")  
    src_panel_id = fields.Many2one('favite_bif.panel',ondelete='cascade', domain="[('gmd_id', '=', gmd_id)]")  

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
        
