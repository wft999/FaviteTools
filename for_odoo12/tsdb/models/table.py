# -*- coding: utf-8 -*-
import logging
import os       
import re
import urllib3
import base64
import json

from odoo import models, fields, api
from odoo.exceptions import UserError


_logger = logging.getLogger(__name__)

class Table(models.Model):
    _name = 'tsdb.table'
    _inherit = ['tsdb.common']

    
    type = type = fields.Selection(selection=[
        ('normal','Normal table'),
        ('super','Super table'),
        ('sub','Sub table')],default='normal')
    
    server_id = fields.Many2one('tsdb.server',related='database_id.server_id')
    database_id = fields.Many2one('tsdb.database',ondelete='cascade', required=True)
    super_id = fields.Many2one('tsdb.table',domain=[('type', '=', 'super')],ondelete='cascade')
    
    col_ids = fields.One2many('tsdb.field', 'table_id', string='Col lines',domain=[('note', '=', False)])
    tag_ids = fields.One2many('tsdb.field', 'table_id', string='Tag lines',domain=[('note', '=', 'tag')])
    
    def sync_col(self):
        all = self.env['tsdb.field'].search([('table_id', '=', self.id)])
        
        info = self.server_id.exec_sql('DESCRIBE %s.%s' %(database_id.name, self.name))
        name_pos = info['head'].index('Field')
        type_pos = info['head'].index('Type')
        length_pos = info['head'].index('Length')
        note_pos = info['head'].index('Note')
        for i in range(info['rows']):
            name = info['data'][i][name_pos]
            type = info['data'][i][type_pos]
            length = info['data'][i][length_pos]
            note = info['data'][i][note_pos]
            
            field = self.env['tsdb.field'].search([('name', '=', field), ('table_id', '=', self.id)])
            if field:
                all -= field
            else:
                field = self.env['tsdb.field'].create({'name':name,'table_id':self.id})  
            
        all.unlink() 
        
    @api.multi
    def unlink(self):
        for t in self:
            t.server_id.exec_sql('DROP TABLE IF EXISTS %s' % t.name)  
            
        res = super(Table, self).unlink()
            
        return res 
    
    @api.model
    def create(self, vals):
        res = super(Table, self).create(vals)
        
        return res   
    
    @api.multi
    def write(self, vals):
        res = super(Table, self).write(vals)
        return res     
            
#     @api.one
#     @api.constrains('type','super_id','col_ids','tag_ids','tag_value_ids')
#     def _check_database_super(self):
#         if self.type == 'normal' and not self.col_ids:
#             raise ValidationError(_('Invalid name. Only alphanumerical characters, underscore, hyphen are allowed.'))
#         if self.type == 'super' and not self.col_ids and not self.tag_ids:
#             raise ValidationError(_('Invalid name. Only alphanumerical characters, underscore, hyphen are allowed.'))
#         if self.type == 'sub' and not self.tag_value_ids:
#             raise ValidationError(_('Invalid name. Only alphanumerical characters, underscore, hyphen are allowed.'))

    
    
