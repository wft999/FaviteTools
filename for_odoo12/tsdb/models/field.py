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
    _order = 'create_date asc'
    
    server_id = fields.Many2one('tsdb.server',related='table_id.server_id')
    database_id = fields.Many2one('tsdb.database',related='table_id.database_id')
    
    table_id = fields.Many2one('tsdb.table',ondelete='cascade', required=True)
    type = fields.Selection(selection=[('TIMESTAMP','TIMESTAMP')
                                            ('INT','INT'),
                                            ('BIGINT','BIGINT'),
                                            ('FLOAT','FLOAT'),
                                            ('DOUBLE','DOUBLE'),
                                            ('BINARY','BINARY'),
                                            ('SMALLINT','SMALLINT'),
                                            ('TINYINT','TINYINT'),
                                            ('BOOL','BOOL')
                                            ('NCHAR','NCHAR')],required=True)
    length = fields.Integer()
    note = fields.Char()
            
    _sql_constraints = [
        ('name_uniq', 'unique (table_id,name)', "Field already exists !"),
    ]

    
    @api.multi
    def unlink(self):
        for f in self:
            if f.table_id.type == 'sub':
                raise UserError("Could not unlink field")
            elif f.note == 'tag':  
                f.server_id.exec_sql('ALTER TABLE %s.%s DROP TAG %s' % (database_id.name,table_id.name,f.name))
            else:
                f.server_id.exec_sql('ALTER TABLE %s.%s DROP COLUMN %s' % (database_id.name,table_id.name,f.name))
            
        res = super(Field, self).unlink()
            
        return res 
    
    @api.model
    def create(self, vals):
        res = super(Field, self).create(vals)
        if res.table_id.type == 'sub':
            raise UserError("Could not create field")
        
        if len(res.table_id.col_ids) < 2:
            if res.type != 'TIMESTAMP':
                raise UserError("First col must be TIMESTAMP")
            return res
        elif len(res.table_id.col_ids) == 2:
            if res.table_id.type == 'super':
                if len(res.table_id.tag_ids) == 1: 
                    res.server_id.exec_sql('CREATE TABLE %s.%s TAGS %s' % (res.database_id.name,res.table_id.name,res.name))
            elif res.table_id.type == 'normal':
                res.server_id.exec_sql('CREATE TABLE %s.%s  %s' % (res.database_id.name,res.table_id.name,res.name))
        else:        
            if res.table_id.type == 'super': 
                if res.note == 'tag':  
                    res.server_id.exec_sql('ALTER TABLE %s.%s ADD TAG %s' % (res.database_id.name,res.table_id.name,res.name))
                else:
                    res.server_id.exec_sql('ALTER TABLE %s.%s ADD COLUMN %s' % (res.database_id.name,res.table_id.name,res.name))
            else:
                res.server_id.exec_sql('ALTER TABLE %s.%s ADD COLUMN %s' % (res.database_id.name,res.table_id.name,res.name))
                    
        return res   
    
    @api.multi
    def write(self, vals):
        for f in self:
            if f.table_id.type != 'sub' or 'type' in vals or 'length' in vals or not f.note:
                raise UserError("Could not modify type or length or note")

        res = super(Field, self).write(vals)
        
        for f in self:
            f.server_id.exec_sql('ALTER TABLE %s.%s SET TAG %s=%s' % (database_id.name,table_id.name,f.name,f.note)) 
            
        return res  
        
        