# -*- coding: utf-8 -*-
import logging
import os       

from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools


_logger = logging.getLogger(__name__)


class Recipe(models.Model):
    _name = 'favite_recipe.recipe'
    _inherit = ['favite_common.geometry']
    
    gmd_id = fields.Many2one('favite_gmd.gmd',default=lambda self: self.env.context.get('default_gmd_id'),ondelete='set null')
    judge_id = fields.Many2one('favite_recipe.judge',ondelete='set null')
    filter_id = fields.Many2one('favite_recipe.filter',ondelete='set null')
    mura_id = fields.Many2one('favite_recipe.mura',ondelete='set null')
    decode_id = fields.Many2one('favite_recipe.decode',ondelete='set null')

    color = fields.Integer('Color Index', default=0)    
    
    def import_file(self,file):
        written = True
        message = 'Exception'

        content = {'objs':[]}
        pad = {'name':file.filename.split('.')[0]}
        
        try:
            pass
        except Exception as e:
            written = False
            message = str(e)
        return {'success': False,'message':message} 
 
class JudgeDefect(models.Model):
    _name = 'favite_recipe.judge_defect'
    _inherit = ['favite_common.geometry']
    
    name = fields.Char(default='name')
    
    index = fields.Integer(default=1,string='id')
    defectcode = fields.Integer(default=1)
    judge_id = fields.Many2one('favite_recipe.judge',ondelete='cascade')
    
    _sql_constraints = [
    ]
        
class Judge(models.Model):
    _name = 'favite_recipe.judge'
    _inherit = ['favite_common.geometry']
    
    defect_ids = fields.One2many('favite_recipe.judge_defect', 'judge_id', string='defect')
    
class FilterRange(models.Model):
    _name = 'favite_recipe.filter_range'

    sequence = fields.Integer(default=0)
    center_x = fields.Integer(string='center x')
    center_y = fields.Integer(string='center y')
    width = fields.Integer()
    height = fields.Integer()
    filter_id = fields.Many2one('favite_recipe.filter',ondelete='cascade')
    
class Filter(models.Model):
    _name = 'favite_recipe.filter'
    _inherit = ['favite_common.geometry'] 
    
    range_ids = fields.One2many('favite_recipe.filter_range', 'filter_id', string='Range')
    
class Mura(models.Model):
    _name = 'favite_recipe.mura'
    _inherit = ['favite_common.geometry']
    
    
class Decode(models.Model):
    _name = 'favite_recipe.decode'
    _inherit = ['favite_common.geometry']    
    
    
