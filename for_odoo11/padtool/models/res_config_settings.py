# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'
    
    hawk_width = fields.Integer( string="Hwakeye window width",default=5000,help="")
    hawk_height = fields.Integer( string="Hwakeye window height",default=5000,help="")
    
    submark_offsetX = fields.Integer( string="polygon submark offsetX ",default=2000,help="")
    submark_offsetY = fields.Integer( string="polygon submark offsetY ",default=2000,help="")
    
    region_width = fields.Integer( string="Region width",default=50000,help="")
    region_height = fields.Integer( string="Region height",default=50000,help="")
    region_overlap = fields.Integer( string="Region overlap",default=5000,help="")
    
    _sql_constraints = [
        ('region_height_overlap', 'CHECK(region_height > region_overlap)', "region_height must be greater than  region_overlap!"),
    ]     


    @api.model
    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        res.update(
            
            hawk_width=int(self.env['ir.config_parameter'].sudo().get_param('padtool.hawk_width',5000)),
            hawk_height=int(self.env['ir.config_parameter'].sudo().get_param('padtool.hawk_height',5000)),
            region_width=int(self.env['ir.config_parameter'].sudo().get_param('padtool.region_width',50000)),
            region_height=int(self.env['ir.config_parameter'].sudo().get_param('padtool.region_height',50000)),
            region_overlap=int(self.env['ir.config_parameter'].sudo().get_param('padtool.region_overlap',5000)),
            
            submark_offsetX=int(self.env['ir.config_parameter'].sudo().get_param('padtool.submark_offsetX',2000)),
            submark_offsetY=int(self.env['ir.config_parameter'].sudo().get_param('padtool.submark_offsetY',2000)),
            
        )
        return res

    @api.multi
    def set_values(self):
        super(ResConfigSettings, self).set_values()
        if not self.user_has_groups('padtool.group_pad_manager'):
            return
        
        self.env['ir.config_parameter'].sudo().set_param('padtool.hawk_width', self.hawk_width)
        self.env['ir.config_parameter'].sudo().set_param('padtool.hawk_height', self.hawk_height)
        self.env['ir.config_parameter'].sudo().set_param('padtool.region_width', self.region_width)
        self.env['ir.config_parameter'].sudo().set_param('padtool.region_height', self.region_height)
        self.env['ir.config_parameter'].sudo().set_param('padtool.region_overlap', self.region_overlap)
        self.env['ir.config_parameter'].sudo().set_param('padtool.submark_offsetX', self.submark_offsetX)
        self.env['ir.config_parameter'].sudo().set_param('padtool.submark_offsetY', self.submark_offsetY)

        
