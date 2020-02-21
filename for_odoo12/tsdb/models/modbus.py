# -*- coding: utf-8 -*-
import logging
import os       
import re
import urllib3
import base64
import json

from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools
from odoo.exceptions import UserError
from .server import DATABASE,TABLE,NAME_PATTERN

_logger = logging.getLogger(__name__)


CONFIG_TYPE = 0
COMMAND_TYPE = 1
STATUS_TYPE = 2

COMMAND_SET_VALUE = 0 

class Modbus(models.Model):
    _name = 'tsdb.modbus'   
    _inherit = ['tsdb.common']
    
    server_id = fields.Many2one('tsdb.server',ondelete='set null', required=True)
#     table_ids = fields.One2many('tsdb.table', 'collector_id', string='Table lines')
    
    ###modbus###
    byte_timeout_sec = fields.Integer(string="byte timeout sec",compute='_compute_vals',inverse="_set_vals")
    byte_timeout_usec = fields.Integer(string="byte timeout usec",compute='_compute_vals',inverse="_set_vals")
    response_timeout_sec = fields.Integer(string="response timeout sec",compute='_compute_vals',inverse="_set_vals")
    response_timeout_usec = fields.Integer(string="response timeout usec",compute='_compute_vals',inverse="_set_vals")    
        
    ###RTU#####
    mode = fields.Selection(selection=[(0,'RS232'),(1,'RS485')],compute='_compute_vals',inverse="_set_vals")
    rts = fields.Selection(selection=[(0,'none'),(1,'up'),(2,'down')],compute='_compute_vals',inverse="_set_vals")
    rts_delay = fields.Integer(string="RTS delay(us)",compute='_compute_vals',inverse="_set_vals")
    
    device = fields.Char(compute='_compute_vals',inverse="_set_vals")
    baud = fields.Selection(selection=[(9600,9600),(19200,19200),(57600,57600),(115200,115200)],compute='_compute_vals',inverse="_set_vals")
    parity = fields.Selection(selection=[(ord('N'),'none'),(ord('E'),'even'),(ord('O'),'odd')],compute='_compute_vals',inverse="_set_vals")
    data_bit = fields.Selection(selection=[(5,5),(6,6),(7,7),(8,8)],compute='_compute_vals',inverse="_set_vals")
    stop_bit = fields.Selection(selection=[(1,1),(2,2)],compute='_compute_vals',inverse="_set_vals")
    
    ###PI###
    node = fields.Char(string="Server node",compute='_compute_vals',inverse="_set_vals")
    service = fields.Char(string="Server service",compute='_compute_vals',inverse="_set_vals")
    
    ###TCP###    
    ip = fields.Char(string="Server ip",compute='_compute_vals',inverse="_set_vals")
    port = fields.Integer(string="Server port",compute='_compute_vals',inverse="_set_vals")
    
    type = fields.Selection(selection=[
        ('rtu','Modbus RTU'),
        ('tcp','Modbus TCP'),
        ('pi','Modbus PI')],default='tcp')
    state = fields.Selection([
        ('stop', 'Grey'),
        ('run', 'Green'),
        ('blocked', 'Red')], string='Modbus State',copy=False, default='stop')
    
    _sql_constraints = [
        ('name_uniq', 'unique (name,server_id)', "Name already exists !"),
    ]
    
    @api.one
    def _set_vals(self):
        setting = self._build_setting()
        self.server_id.exec_sql('ALTER TABLE %s.%s SET TAG setting=%s' % (DATABASE,self.name,setting)) 
    
    @api.one
    def _compute_vals(self):
        self.byte_timeout_sec = 0
        self.byte_timeout_usec = 0
        self.response_timeout_sec = 0
        self.response_timeout_usec = 0
        self.mode = 0
        self.rts = 0
        self.rts_delay = 0
        self.baud = 9600
        self.parity = ord('E')
        self.data_bit = 8
        self.stop_bit = 1
        self.ip = 'localhost'
        self.port = 502
        
        try:
            info = self.server_id.exec_sql('DESCRIBE %s.' %(DATABASE, self.name)) 
            setting = json.loads(info['data'][-1][-1])       
            self.update(setting)
        except Exception as e:
            pass
    
    def open_point_action(self):
        return {
            'type': 'ir.actions.act_window',
            'name': 'Database',
            'res_model': 'tsdb.point',
            'view_mode': 'kanban,form',
            'view_id': False,
            'target': 'current',
            'flags':{'import_enabled':False},
            'domain':[('server_id','=',self.id),],
            'context':{'default_server_id':self.id}
            }
    
    def _build_setting(self):
        if self.type == 'rtu':
            return self._build_setting_rtu()
        elif self.type == 'tcp':
            return self._build_setting_tcp()
        elif self.type == 'pi':
            return self._build_setting_pi()
        else:
            return ''
    
    @api.multi
    def unlink(self):
        for m in self:
            sql = 'DROP TABLE IF EXISTS %s.%s' % (DATABASE,m.name)
            m.server_id.exec_sql(sql)
            
        return super(Modbus, self).unlink()
    
    @api.model
    def create(self, vals):
        res = super(Modbus, self).create(vals)
        
        setting = res._build_setting()
        sql = "CREATE TABLE %s.%s USING %s.%s TAGS ('%s')" % (DATABASE,res.name,DATABASE,TABLE,setting) 
        res.server_id.exec_sql(sql)
        return res   
    
    @api.multi
    def write(self, vals):
        res = super(Modbus, self).write(vals)
        return res    


    def _build_setting_tcp(self):
        return json.dumps({'type':self.type,
                           'byte_timeout_sec':self.byte_timeout_sec,
                           'byte_timeout_usec':self.byte_timeout_usec,
                           'response_timeout_sec':self.response_timeout_sec,
                           'response_timeout_usec':self.response_timeout_usec,
                           'ip':self.ip,
                           'port':self.port,
                           'children':self._build_children()
                           }) 
        
    def _build_setting_rtu(self):
        return json.dumps({'type':self.type,
                           'byte_timeout_sec':self.byte_timeout_sec,
                           'byte_timeout_usec':self.byte_timeout_usec,
                           'response_timeout_sec':self.response_timeout_sec,
                           'response_timeout_usec':self.response_timeout_usec,
                           'mode':self.mode,
                           'rts':self.rts,
                           'rts_delay':self.rts_delay,
                           'device':self.device,
                           'baud':self.baud,
                           'parity':self.parity,
                           'data_bit':self.data_bit,
                           'stop_bit':self.stop_bit,
                           'children':self._build_children()
                           })       

    def _build_setting_pi(self):
        return json.dumps({'type':self.type,
                           'byte_timeout_sec':self.byte_timeout_sec,
                           'byte_timeout_usec':self.byte_timeout_usec,
                           'response_timeout_sec':self.response_timeout_sec,
                           'response_timeout_usec':self.response_timeout_usec,
                           'node':self.node,
                           'service':self.service,
                           'children':self._build_children()
                           })
        