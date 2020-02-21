# -*- coding: utf-8 -*-
import logging
import os       
import re
import urllib3
import base64
import json

from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools
from odoo.exceptions import UserError


_logger = logging.getLogger(__name__)

NAME_PATTERN = '^[a-zA-Z0-9][a-zA-Z0-9_-]+$'


DATABASE = 'gateway_test'
TABLE = 'lm_collector'
CONFIG_TYPE = 0
COMMAND_TYPE = 1
STATUS_TYPE = 2

COMMAND_SET_VALUE = 0
  
class Common(models.AbstractModel):
    _name = 'lm_gate.common'   
    
    active = fields.Boolean(default=True)
    name = fields.Char(required=True,)
    description = fields.Text()
    
    @api.one
    @api.constrains('name')
    def _check_name(self):
        if not re.match(NAME_PATTERN, self.name):
            raise ValidationError(_('Invalid name. Only alphanumerical characters, underscore, hyphen are allowed.'))
    
    @api.multi
    def close_dialog(self):
        return {'type': 'ir.actions.act_window_close'}

class Point(models.Model):
    _name = 'lm_gate.point'   
    _inherit = ['lm_gate.common']
    
    @api.model
    def _default_table(self):
        collector_id = self.env.context.get('default_collector_id', False)
        if collector_id:
            tables = self.env['lm_gate.table'].search([('collector_id', '=', collector_id)])
            if tables:
                return tables[0]
        return self.env['lm_gate.table']
    
    def _compute_current_value(self):
        for point in self:
            res = json.loads(point.table_id.current_value)  
            
            name = 'last(%s)' % point.name
            if name in res['head'] and res['rows'] > 0:
                pos = res['head'].index(name)
                point.current_value = str(res['data'][0][pos])
            else:
                point.current_value = ''
    
    def _inverse_current_value(self):
        for point in self:
            setting = {'id':COMMAND_SET_VALUE,'value':point.current_value}
            sql = "INSERT INTO %s.%s_%s (ts,target,content,type) VALUES(0,'point_%s','%s',%d)" % (DATABASE,TABLE,point.collector_id.name,
                                                                                                    point.name,
                                                                                                    json.dumps(setting),
                                                                                                    COMMAND_TYPE)
            point.collector_id.exec_sql(sql)
    
    current_value = fields.Char(compute='_compute_current_value', inverse='_inverse_current_value', string='Current value')
    collector_type = fields.Selection(related='collector_id.type', readonly=True)
    
    table_id = fields.Many2one('lm_gate.table',ondelete='cascade', default=_default_table,required=True)  
    collector_id = fields.Many2one(related='table_id.collector_id', readonly=True) 
    
    
    period = fields.Integer(string="scan period sec",default=0)
    device = fields.Integer(string='Device ID',default=0)
    type = fields.Selection(selection=[('coil bit','coil bit'),
                                       ('input bit','input bit'),
                                       ('holding register','holding register'),
                                       ('input register','input register')],required=True)
    address = fields.Integer(required=True)
    value_type = fields.Selection(selection=[('INT','INT'),
                                             ('BIGINT','BIGINT'),
                                             ('FLOAT','FLOAT'),
                                             ('DOUBLE','DOUBLE'),
                                             ('BINARY(64)','BINARY(64)'),
                                             ('SMALLINT','SMALLINT'),
                                             ('TINYINT','TINYINT'),
                                             ('BOOL','BOOL')],required=True)
    
    _sql_constraints = [
        ('name_uniq', 'unique (name,collector_id)', "Name already exists !"),
    ]
    
    def set_value(self):
        return {
            'type': 'ir.actions.act_window',
            'name': 'Set Value',
            'res_model': 'lm_gate.point',
            'view_mode': 'form',
            'view_id': self.env.ref('lm_gate.view_set_value').id,
            'res_id': self.id,
            'target': 'new',
            }
        
    def _build_setting(self):
        return json.dumps({
            'device':self.device,
            'type':self.type,
            'address':self.address,
            'value_type':self.value_type,
            'period':self.period})
    
    def _build_insert_sql(self,setting):
        sql = "INSERT INTO %s.%s_%s (ts,target,content,type) VALUES(0,'point_%s','%s',%d)" % (DATABASE,TABLE,self.collector_id.name,
                                                                                                    self.name,
                                                                                                    setting,
                                                                                                    CONFIG_TYPE)
        return sql
    
    @api.multi
    def unlink(self):
        for p in self:
            sql = p._build_insert_sql('')
            p.collector_id.exec_sql(sql)
            
        if (len(self.table_id.point_ids) - len(self)) > 0:
            for p in self:
                sql = 'ALTER TABLE %s.%s_%s DROP COLUMN %s' % (DATABASE,p.collector_id.name,p.table_id.name,
                                                              p.name);
                p.collector_id.exec_sql(sql)
        else:
            for p in self:
                sql = 'DROP TABLE IF EXISTS %s.%s_%s' % (DATABASE,p.collector_id.name,p.table_id.name)
                p.collector_id.exec_sql(sql)
            
        return super(Point, self).unlink()
    
    @api.model
    def create(self, vals):
        res = super(Point, self).create(vals)
        if len(res.table_id.point_ids) == 1:
            sql = 'CREATE TABLE IF NOT EXISTS %s.%s_%s (ts TIMESTAMP,%s %s)' % (DATABASE,res.collector_id.name,res.table_id.name,
                                                              res.name,
                                                              res.value_type)
            res.collector_id.exec_sql(sql)
        else:
            sql = 'ALTER TABLE %s.%s_%s ADD COLUMN %s %s' % (DATABASE,res.collector_id.name,res.table_id.name,
                                                              res.name,
                                                              res.value_type)
            res.collector_id.exec_sql(sql)
            
        setting = res._build_setting()
        sql = res._build_insert_sql(setting)
        res.collector_id.exec_sql(sql)  
        
        setting = res.table_id._build_setting()
        sql = res.table_id._build_insert_sql(setting)
        res.collector_id.exec_sql(sql)            
        
        return res    
    
    @api.multi
    def write(self, vals):
        for p in self:
            if ('name' in vals and p.name != vals['name']) or ('value_type' in vals and p.value_type != vals['value_type']):
                sql = 'ALTER TABLE %s.%s_%s DROP COLUMN %s' % (DATABASE,
                                                              p.collector_id.name,
                                                              p.table_id.name,
                                                              p.name);
                p.collector_id.exec_sql(sql)
                sql = 'ALTER TABLE %s.%s_%s ADD COLUMN %s %s' % (DATABASE,
                                                              p.collector_id.name,
                                                              p.table_id.name,
                                                              getattr(vals,'name',p.name),
                                                              getattr(vals,'value_type',p.value_type)
                                                              );
                p.collector_id.exec_sql(sql)
                
        res = super(Point, self).write(vals)  
        for p in self:
            setting = p._build_setting()
            sql = p._build_insert_sql(setting)
            p.collector_id.exec_sql(sql) 
            
        return res
    
class Table(models.Model):
    _name = 'lm_gate.table'   
    _inherit = ['lm_gate.common']
    
    
    def _compute_current_value(self):
        for t in self:
            sql = 'SELECT LAST(*) FROM %s.%s_%s' % (DATABASE,t.collector_id.name,t.name)
            t.current_value = t.collector_id.exec_sql(sql)
    
    def _inverse_current_value(self):
        pass
    
    current_value = fields.Char(compute='_compute_current_value', inverse='_inverse_current_value', string='Current value')
    
    collector_id = fields.Many2one('lm_gate.collector',ondelete='cascade')  
    point_ids = fields.One2many('lm_gate.point', 'table_id', string='Point lines')
    period = fields.Integer(string="scan period sec")
    
    _sql_constraints = [
        ('name_uniq', 'unique (name,collector_id)', "Name already exists !"),
    ]
    
    def _build_setting(self):
        return json.dumps({
                           'period':self.period,
                           'children':self._build_children()})
    
    def _build_children(self):
        return ','.join(id.name for id in self.point_ids)
    
    def _build_insert_sql(self,setting):
        sql = "INSERT INTO %s.%s_%s (ts,target,content,type) VALUES(0,'table_%s','%s',%d)" % (DATABASE,TABLE,self.collector_id.name,
                                                                                                  self.name,setting,CONFIG_TYPE)
        return sql
    
    @api.multi
    def unlink(self):
        for d in self:
            sql = d._build_insert_sql('');
            d.collector_id.exec_sql(sql)
            
        return super(Table, self).unlink()
    
    @api.model
    def create(self, vals):
        res = super(Table, self).create(vals)
        
        setting = res._build_setting()
        sql = res._build_insert_sql(setting);
        res.collector_id.exec_sql(sql)
        
        setting = res.collector_id._build_setting()
        sql = "ALTER TABLE %s.%s_%s SET TAG setting = '%s'" % (DATABASE,TABLE,res.collector_id.name,
                                                                  setting)
        res.collector_id.exec_sql(sql)
        
        return res   
    
    @api.multi
    def write(self, vals):
        res = super(Table, self).write(vals)
        
        for d in self:
            setting = d._build_setting()
            sql = d._build_insert_sql(setting);
            d.collector_id.exec_sql(sql)
            
        return res      

class Collector(models.Model):
    _name = 'lm_gate.collector'   
    _inherit = ['lm_gate.common']
    
    db_host = fields.Char(string='Database Server', required=True, help="Hostname or IP of Http RESTful server",default="192.168.64.129")
    db_port = fields.Integer(string='Database Port', size=5, required=True, default=6020, help="Http RESTful Port.")
    user_name = fields.Char(string='Database user',default='root')
    user_password = fields.Char(string='Database password',default='taosdata')
    
    table_ids = fields.One2many('lm_gate.table', 'collector_id', string='Table lines')
    
    type = fields.Selection(selection=[
        ('Modbus RTU','Modbus RTU'),
        ('Modbus TCP','Modbus TCP'),
        ('Modbus PI','Modbus PI')],default='Modbus TCP')
    state = fields.Selection([
        ('stop', 'Grey'),
        ('run', 'Green'),
        ('blocked', 'Red')], string='Collector State',copy=False, default='stop', required=True)
    
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Name already exists !"),
    ]
    
    def _build_setting(self):
        if self.type == 'Modbus RTU':
            return self._build_setting_rtu()
        elif self.type == 'Modbus TCP':
            return self._build_setting_tcp()
        elif self.type == 'Modbus PI':
            return self._build_setting_pi()
        else:
            return ''
    
    def _build_children(self):
        return ','.join(id.name for id in self.table_ids)
    
    @api.multi
    def unlink(self):
        for c in self:
            for d in c.table_ids:
                d.unlink()
        
            sql = 'DROP TABLE IF EXISTS %s.%s_%s' % (DATABASE,TABLE,c.name)
            c.exec_sql(sql)
            
        return super(Collector, self).unlink()
    
    @api.model
    def create(self, vals):
        res = super(Collector, self).create(vals)
        
        setting = res._build_setting()
        sql = "CREATE TABLE %s.%s_%s USING %s.%s TAGS ('%s')" % (DATABASE,TABLE,res.name,
                                                                 DATABASE,TABLE,
                                                                 setting)
        
        res.prepare_database()
        res.exec_sql(sql)
        return res   
    
    @api.multi
    def write(self, vals):
        res = super(Collector, self).write(vals)
        
        for c in self:
            setting = c._build_setting()
            sql = "ALTER TABLE %s.%s_%s SET TAG setting = '%s'" % (DATABASE,TABLE,c.name,
                                                                  setting)
            c.exec_sql(sql)
            
        return res    

    def exec_sql(self,sql):
        token = base64.b64encode(str.encode(self.user_name + ':' + self.user_password))
        token = bytes.decode(token)
        headers = {'Authorization': 'Basic %s' %( token)}

        urllib3.disable_warnings()
        http = urllib3.PoolManager(cert_reqs='CERT_NONE')
        server = 'http://%s:%d' % (self.db_host , self.db_port)

        try:
            resp = http.request(
                'POST',
                server + "/rest/sql",
                body = sql,
                headers = headers
                )
        except Exception as e:
            _logger.error('Could not exec sql')
            raise UserError("Could not exec sql:%s,reason:%s" % (sql,e))
    
        msg = str(resp.data, encoding = "utf8")
        data = json.loads(msg)    
        if data['status'] == 'succ':
            return msg
    
        raise UserError("fail to exec sql:%s,reason:%s" % (sql,data['desc']))
               
    def prepare_database(self):    
        self.exec_sql('CREATE DATABASE IF NOT EXISTS ' + DATABASE)
        self.exec_sql('CREATE TABLE IF NOT EXISTS %s.%s (ts TIMESTAMP, target BINARY(128), content BINARY(504), type TINYINT) TAGS(setting BINARY(504))' % (DATABASE, TABLE) )
     
    def action_view_points(self):
        return {
            'type': 'ir.actions.act_window',
            'name': 'Points',
            'res_model': 'lm_gate.collector',
            'view_mode': 'gateway',
            'view_id': False,
            'target': 'current',
            'flags':{'import_enabled':False},
            'domain':[('collector_id','=',self.id),],
            'context':{'default_collector_id':self.id}
            }
        
class Modbus(models.Model):
#     _name = 'lm_gate.modbus'   
    _inherit = ['lm_gate.collector']
    
    byte_timeout_sec = fields.Integer(string="byte timeout sec",default=0)
    byte_timeout_usec = fields.Integer(string="byte timeout usec",default=0)
    response_timeout_sec = fields.Integer(string="response timeout sec",default=0)
    response_timeout_usec = fields.Integer(string="response timeout usec",default=0)    

class Rtu(models.Model):
#     _name = 'lm_gate.modbus_rtu'   
    _inherit = ['lm_gate.collector']
    
    mode = fields.Selection(selection=[(0,'RS232'),(1,'RS485')],default=0)
    rts = fields.Selection(selection=[(0,'none'),(1,'up'),(2,'down')],default='0')
    rts_delay = fields.Integer(string="RTS delay(us)",default=0)
    
    device = fields.Char()
    baud = fields.Selection(selection=[(9600,9600),(19200,19200),(57600,57600),(115200,115200)],default=9600)
    parity = fields.Selection(selection=[(ord('N'),'none'),(ord('E'),'even'),(ord('O'),'odd')],default=ord('E'))
    data_bit = fields.Selection(selection=[(5,5),(6,6),(7,7),(8,8)],default=8)
    stop_bit = fields.Selection(selection=[(1,1),(2,2)],default=1)
    
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
    
class Pi(models.Model):
#     _name = 'lm_gate.modbus_pi'   
    _inherit = ['lm_gate.collector']
    
    node = fields.Char(string="Server node")
    service = fields.Char(string="Server service")
    
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
    
class Tcp(models.Model):
#     _name = 'lm_gate.modbus_tcp'   
    _inherit = ['lm_gate.collector']
    
    ip = fields.Char(string="Server ip",default="localhost")
    port = fields.Integer(string="Server port",default=502)
    
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
        