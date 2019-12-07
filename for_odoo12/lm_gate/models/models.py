# -*- coding: utf-8 -*-
import logging
import os       
import re
from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools

_logger = logging.getLogger(__name__)

NAME_PATTERN = '^[a-zA-Z0-9][a-zA-Z0-9_-]+$'
class Point(models.Model):
    _name = 'lm_gate.point'   
    
    active = fields.Boolean(default=True)
    name = fields.Char(required=True,)
    description = fields.Text()
    device_id = fields.Many2one('lm_gate.device',ondelete='cascade')  
    
    type = fields.Selection(selection=[(1,'coil bit'),(2,'input bit'),(3,'holding register'),(4,'input register')],required=True)
    address = fields.Integer(required=True)
    length = fields.Integer(required=True)
    
    value_type = fields.Selection(selection=[('coil bit',1),('input bit',2),('holding register',3),(' input register',4)],required=True)
    
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Name already exists !"),
    ]
    
    @api.one
    @api.constrains('name')
    def _check_name(self):
        if not re.match(NAME_PATTERN, self.name):
            raise ValidationError(_('Invalid name. Only alphanumerical characters, underscore, hyphen are allowed.'))

class Device(models.Model):
    _name = 'lm_gate.device'   
    
    active = fields.Boolean(default=True)
    name = fields.Char(required=True,)
    description = fields.Text()
    collector_id = fields.Many2one('lm_gate.collector',ondelete='cascade')  
    point_ids = fields.One2many('lm_gate.point', 'device_id', string='Point lines')
    
    address = fields.Integer()
    period = fields.Integer(string="scan period sec")
    
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Name already exists !"),
    ]
    
    @api.one
    @api.constrains('name')
    def _check_name(self):
        if not re.match(NAME_PATTERN, self.name):
            raise ValidationError(_('Invalid name. Only alphanumerical characters, underscore, hyphen are allowed.'))
        
class Collector(models.Model):
    _name = 'lm_gate.collector'   
    
    active = fields.Boolean(default=True)
    name = fields.Char(required=True,)
    description = fields.Text()
    gate_id = fields.Many2one('lm_gate.gate',ondelete='cascade')  
    device_ids = fields.One2many('lm_gate.device', 'collector_id', string='Device lines')
    
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Name already exists !"),
    ]
    
    @api.one
    @api.constrains('name')
    def _check_name(self):
        if not re.match(NAME_PATTERN, self.name):
            raise ValidationError(_('Invalid name. Only alphanumerical characters, underscore, hyphen are allowed.'))

class Modbus(models.Model):
    _name = 'lm_gate.modbus'   
    _inherit = ['lm_gate.collector']
    
    byte_timeout_sec = fields.Integer(string="byte timeout sec")
    byte_timeout_usec = fields.Integer(string="byte timeout usec")
    response_timeout_sec = fields.Integer(string="response timeout sec")
    response_timeout_usec = fields.Integer(string="response timeout usec")    

class Rtu(models.Model):
    _name = 'lm_gate.modbus_rtu'   
    _inherit = ['lm_gate.modbus']
    
    mode = fields.Selection(selection=[('RS232','RS232'),('RS485','RS485')],required=True,default='RS232')
    rts = fields.Selection(selection=[('none','none'),('up','up'),('down','down')],required=True,default='none')
    rts_delay = fields.Integer(string="RTS delay(us)")
    
    device = fields.Char(required=True)
    baud = fields.Selection(selection=[(9600,9600),(19200,19200),(57600,57600),(115200,115200)],required=True,default=9600)
    parity = fields.Selection(selection=[(ord('N'),'none'),(ord('E'),'even'),(ord('O'),'odd')], required=True,default=ord('E'))
    data_bit = fields.Selection(selection=[(5,5),(6,6),(7,7),(8,8)],required=True,default=8)
    stop_bit = fields.Selection(selection=[(1,1),(2,2)],required=True,default=1)
    
class Pi(models.Model):
    _name = 'lm_gate.modbus_pi'   
    _inherit = ['lm_gate.modbus']
    
    node = fields.Char(string="Server ip")
    service = fields.Char(string="Server port")
    
class Tcp(models.Model):
    _name = 'lm_gate.modbus_tcp'   
    _inherit = ['lm_gate.modbus']
    
    ip = fields.Char(string="Server ip")
    port = fields.Integer(string="Server port")
    

class Gate(models.Model):
    _name = 'lm_gate.gate'   
    
    active = fields.Boolean(default=True)
    name = fields.Char(required=True,)
    description = fields.Text()
    modbus_tcp_ids = fields.One2many('lm_gate.modbus_tcp', 'gate_id', string='ModbusTcp collector lines')
    modbus_rtu_ids = fields.One2many('lm_gate.modbus_rtu', 'gate_id', string='ModbusRtu collector lines')
    modbus_pi_ids = fields.One2many('lm_gate.modbus_pi', 'gate_id', string='ModbusPi collector lines')
    
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Name already exists !"),
    ]
    
    @api.one
    @api.constrains('name')
    def _check_name(self):
        if not re.match(NAME_PATTERN, self.name):
            raise ValidationError(_('Invalid name. Only alphanumerical characters, underscore, hyphen are allowed.'))
    
    @api.multi
    def close_dialog(self):
        return {'type': 'ir.actions.act_window_close'}