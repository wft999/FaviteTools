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

DATABASE = 'gateway'
TABLE = 'modbus'
NAME_PATTERN = '^[a-zA-Z0-9][a-zA-Z0-9_-]+$'

class Common(models.AbstractModel):
    _name = 'tsdb.common'   
    
    name = fields.Char(required=True,)
    
    @api.one
    @api.constrains('name')
    def _check_name(self):
        if not re.match(NAME_PATTERN, self.name):
            raise ValidationError(_('Invalid name. Only alphanumerical characters, underscore, hyphen are allowed.'))

class Server(models.Model):
    _name = 'tsdb.server'
    _inherit = ['tsdb.common']
     
    description = fields.Text()
    ip = fields.Char(string='Database Server', required=True, help="Hostname or IP of Http RESTful server",default="117.78.60.75")
    port = fields.Integer(string='Database Port', size=5, required=True, default=6020, help="Http RESTful Port.")
    user_name = fields.Char(string='Database user',default='root')
    user_password = fields.Char(string='Database password',default='taosdata')
    
    token = fields.Char(compute='_compute_token')
    db_count = fields.Integer(compute='_compute_info')
    
    database_ids = fields.One2many('tsdb.database', 'server_id', string='Database lines')
    
    def open_database_action(self):
        return {
            'type': 'ir.actions.act_window',
            'name': 'Database',
            'res_model': 'tsdb.database',
            'view_mode': 'kanban,form',
            'view_id': False,
            'target': 'current',
            'flags':{'import_enabled':False},
            'domain':[('server_id','=',self.id),],
            'context':{'default_server_id':self.id}
            }
        
    def open_modbus_action(self):
        return {
            'type': 'ir.actions.act_window',
            'name': 'Gateway',
            'res_model': 'tsdb.modbus',
            'view_mode': 'kanban,form',
            'view_id': False,
            'target': 'current',
            'flags':{'import_enabled':False},
            'domain':[('server_id','=',self.id),],
            'context':{'default_server_id':self.id}
            }
            
    def prepare_database(self):    
        self.exec_sql('CREATE DATABASE IF NOT EXISTS ' + DATABASE)
        self.exec_sql('CREATE TABLE IF NOT EXISTS %s.%s (ts TIMESTAMP, target BINARY(128), content BINARY(504), type TINYINT) TAGS(setting BINARY(504))' % (DATABASE, TABLE) )

    def sync_modbus(self):
        all = self.env['tsdb.modbus'].search([('server_id', '=', self.id)])
        
        self.exec_sql('USE ' + DATABASE)
        info = self.exec_sql('SHOW TABLES') 
        if info['rows'] == 0:
            all.unlink()
            return
        
        name_pos = info['head'].index('table_name')
        stable_pos = info['head'].index('stable')
        for i in range(info['rows']):
            name = info['data'][i][name_pos]
            stable = info['data'][i][stable_pos]
            if stable != TABLE:
                continue
            
            modbus = self.env['tsdb.modbus'].search([('name', '=', name), ('server_id', '=', self.id)])
            if modbus:
                all -= modbus
            else:
                self.env['tsdb.modbus'].create({'name':name,'server_id':self.id})
                
        all.unlink()
    
    def sync_database(self):
        all = self.env['tsdb.database'].search([('server_id', '=', self.id)])
        info = self.exec_sql('SHOW DATABASES')  
        
        self.db_count = info['rows']
        if self.db_count == 0:
            all.unlink()
            return
            
        name_pos = info['head'].index('name')
        for i in range(self.db_count):
            name = info['data'][i][name_pos]
            values = {
                        'name': name,
                        'server_id': self.id
               }
            db = self.env['tsdb.database'].search([('name', '=', name), ('server_id', '=', self.id)])
            if db:
                all -= db
                self.env['tsdb.database'].write(values)
            else:
                self.env['tsdb.database'].create(values)
                
        all.unlink()        
            
    @api.depends('ip', 'port')
    def _compute_info(self):
        self.prepare_database()
        for server in self:
            server.sync_database()
            server.sync_modbus()
    
    @api.depends('user_name', 'user_password')
    def _compute_token(self):
        for server in self:
            token = base64.b64encode(str.encode(server.user_name + ':' + server.user_password))
            self.token = bytes.decode(token)
        
        
    @api.multi
    def unlink(self):
        return super(Server, self).unlink()
    
    @api.model
    def create(self, vals):
        res = super(Server, self).create(vals)
        
        return res   
    
    @api.multi
    def write(self, vals):
        res = super(Server, self).write(vals)
        return res    
    
    def exec_sql(self,sql):
        headers = {'Authorization': 'Basic %s' %( self.token)}

        urllib3.disable_warnings()
        http = urllib3.PoolManager(cert_reqs='CERT_NONE')
        server = 'http://%s:%d/rest/sql' % (self.ip , self.port)

        try:
            resp = http.request(
                'POST',
                server,
                body = sql,
                headers = headers
                )
        except Exception as e:
            _logger.error('Could not exec sql')
            raise UserError("Could not exec sql:%s,reason:%s" % (sql,e))
    
        msg = str(resp.data, encoding = "utf8")
        data = json.loads(msg)    
        if data['status'] == 'succ':
            return data
    
        raise UserError("fail to exec sql:%s,reason:%s" % (sql,data['desc']))    
    
    
class Field(models.Model):
    _name = 'tsdb.field'
     
    is_tag = fields.Boolean(default=False)
    name = fields.Char(required=True,)
    table_id = fields.Many2one('tsdb.table',ondelete='cascade', required=True)
    
class Tag(models.Model):
    _name = 'tsdb.tag'
     
    field_id = fields.Many2one('tsdb.field',ondelete='set null',domain=[('is_tag', '=', True)], required=True)
    table_id = fields.Many2one('tsdb.table',ondelete='cascade',domain=[('type', '=', 'child')], required=True)
    
    value = fields.Char()
    
    _sql_constraints = [
        ('name_uniq', 'unique (table_id,field_id)', "Tag already exists !"),
    ]
