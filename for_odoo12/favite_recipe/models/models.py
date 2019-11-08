# -*- coding: utf-8 -*-
import logging
import os       

from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools


_logger = logging.getLogger(__name__)


class Recipe(models.Model):
    _name = 'favite_recipe.recipe'
    _inherit = ['favite_common.geometry']
    
    gmd = fields.Many2one('favite_gmd.gmd',default=lambda self: self.env.context.get('default_gmd_id'),ondelete='cascade')

    color = fields.Integer('Color Index', default=0)
 
    _sql_constraints = [
        
    ]    
    

