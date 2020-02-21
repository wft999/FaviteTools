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
    
class Database(models.Model):
    _name = 'tsdb.database'
    _inherit = ['tsdb.common']
     
    server_id = fields.Many2one('tsdb.server',ondelete='set null', required=True)
    status = fields.Selection(selection=[("done",'ready'),('normal','dropping')],compute='_compute_info')
    ntables = fields.Integer(compute='_compute_info')
    tables = fields.Integer(compute='_compute_info')
    
    _sql_constraints = [
        ('name_uniq', 'unique (name,server_id)', "database already exists !"),
    ]
    
    def sync_table(self):
        all = self.env['tsdb.table'].search([('database_id', '=', self.id)])
        
        self.server_id.exec_sql('USE ' + self.name)
        info = self.server_id.exec_sql('SHOW STABLES') 

        name_pos = info['head'].index('name')
        for i in range(info['rows']):
            name = info['data'][i][name_pos]
            table = self.env['tsdb.table'].search([('name', '=', name), ('database_id', '=', self.id)])
            if table:
                all -= table
            else:
                table = self.env['tsdb.table'].create({'type':'super','name':name,'database_id':self.id})  
                
            table.sync_col()  
        
        
        self.server_id.exec_sql('USE ' + self.name)
        info = self.server_id.exec_sql('SHOW TABLES') 
        name_pos = info['head'].index('table_name')
        stable_pos = info['head'].index('stable')
        for i in range(info['rows']):
            name = info['data'][i][name_pos]
            stable = info['data'][i][stable_pos]
            if stable != TABLE:
                continue
            
            table = self.env['tsdb.table'].search([('name', '=', name), ('database_id', '=', self.id)])
            if table:
                all -= table
            else:
                if stable:
                    stable = self.env['tsdb.table'].search([('name', '=', stable), ('database_id', '=', self.id)])
                    table = self.env['tsdb.table'].create({'type':'sub','name':name,'database_id':self.id,'super_id':stable.id})  
                else:
                    table = self.env['tsdb.table'].create({'type':'normal','name':name,'database_id':self.id})
            table.sync_col()  

        all.unlink()
            
    def _compute_info(self):
        self.sync_table()
        info = self.server_id.exec_sql('SHOW DATABASES')  

        name_pos = info['head'].index('name')
        status_pos = info['head'].index('status')
        ntables_pos = info['head'].index('ntables')
        tables_pos = info['head'].index('tables')
        
        for d in self:
            for i in range(info['rows']):
                if info['data'][i][name_pos] == d.name:
                    d.status = info['data'][i][status_pos]
                    if d.status == 'ready':
                        d.status = 'done'
                    elif d.status == 'dropping':
                        d.status = 'normal'
                    
                    d.ntables = info['data'][i][ntables_pos]
                    d.tables = info['data'][i][tables_pos]   
                    break
    @api.multi
    def unlink(self):
        res = super(Database, self).unlink()
        for d in self:
            d.server_id.exec_sql('DROP DATABASE IF EXISTS %s' % d.name)  
            
        return res 
    
    @api.model
    def create(self, vals):
        res = super(Database, self).create(vals)
        res.server_id.exec_sql('CREATE DATABASE IF NOT EXISTS %s' % res.name)
        return res   
    
    @api.multi
    def write(self, vals):
        res = super(Database, self).write(vals)
        return res       
    
    def open_table_action(self):
        return {
            'type': 'ir.actions.act_window',
            'name': 'Database',
            'res_model': 'tsdb.table',
            'view_mode': 'kanban,form',
            'view_id': False,
            'target': 'current',
            'flags':{'import_enabled':False},
            'domain':[('database_id','=',self.id),],
            'context':{'default_database_id':self.id}
            }