# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'
    
    panel_map_margin = fields.Integer( string="Panel map margin",default=10000,help="")
    panel_map_size = fields.Integer( string="Panel map size",default=25000000,help="")
    
    _sql_constraints = [

    ]     


    @api.model
    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        res.update(
            panel_map_margin=int(self.env['ir.config_parameter'].sudo().get_param('favite_common.panel_map_margin',10000)),
            panel_map_size=int(self.env['ir.config_parameter'].sudo().get_param('favite_common.panel_map_size',25000000)),
            
        )
        return res

    @api.multi
    def set_values(self):
        super(ResConfigSettings, self).set_values()
#         if not self.user_has_groups('padtool.group_pad_manager'):
#             return
        
        self.env['ir.config_parameter'].sudo().set_param('favite_common.panel_map_margin', self.panel_map_margin)
        self.env['ir.config_parameter'].sudo().set_param('favite_common.panel_map_size', self.panel_map_size)


        
