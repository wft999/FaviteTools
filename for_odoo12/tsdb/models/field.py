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

class Field(models.Model):
    _name = 'tsdb.field'
    _inherit = ['tsdb.common']
     
    server_id = fields.Many2one('tsdb.server',related='table_id.server_id')
    database_id = fields.Many2one('tsdb.database',related='table_id.database_id')
    
    table_id = fields.Many2one('tsdb.table',ondelete='cascade', required=True)
    type = fields.Selection(selection=[(ord('N'),'none'),(ord('E'),'even'),(ord('O'),'odd')],compute='_compute_vals')
    length = fields.Integer(compute='_compute_vals')
    note = fields.Char(compute='_compute_vals',inverse="_set_vals")
    is_first = fields.Boolean(compute='_compute_vals')
            
    _sql_constraints = [
        ('name_uniq', 'unique (table_id,name)', "Field already exists !"),
    ]
    
    @api.multi
    def unlink(self):
        for f in self:
            if f.table_id.type == 'sub':
                continue
            elif f.note == 'tag':  
                f.server_id.exec_sql('ALTER TABLE %s.%s DROP TAG %s' % (database_id.name,table_id.name,f.name))
            else:
                f.server_id.exec_sql('ALTER TABLE %s.%s DROP COLUMN %s' % (database_id.name,table_id.name,f.name))
            
        res = super(Field, self).unlink()
            
        return res 
    
    @api.model
    def create(self, vals):
        res = super(Field, self).create(vals)
        
        if res.table_id.type == 'super': 
            if res.note == 'tag':  
                res.server_id.exec_sql('ALTER TABLE %s.%s DROP TAG %s' % (database_id.name,table_id.name,f.name))
            else:
                res.server_id.exec_sql('ALTER TABLE %s.%s DROP TAG %s' % (database_id.name,table_id.name,f.name))
        else:
            f.server_id.exec_sql('ALTER TABLE %s.%s DROP COLUMN %s' % (database_id.name,table_id.name,f.name))        
        return res   
    
    @api.multi
    def write(self, vals):
        res = super(Field, self).write(vals)
        return res  
    
    @api.one
    def _compute_vals(self):        
        info = self.server_id.exec_sql('DESCRIBE %s.%s' % (database_id.name,table_id.name) )
        name_pos = info['head'].index('Field')
        type_pos = info['head'].index('Type')
        length_pos = info['head'].index('Length')
        note_pos = info['head'].index('Note')
        for i in range(info['rows']):
            name = info['data'][i][name_pos]
            
            if name != self.name:
                continue
            
            self.is_first = (i == 0)
            self.type = info['data'][i][type_pos]
            self.length = info['data'][i][length_pos]
            self.note = info['data'][i][note_pos]
        
    
    @api.one
    def _set_vals(self):
        if self.table_id.type == 'sub':
            self.server_id.exec_sql('ALTER TABLE %s.%s SET TAG %s=%s' % (database_id.name,table_id.name,self.name,self.note) 
        
        