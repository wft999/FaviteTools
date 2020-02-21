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


CONFIG_TYPE = 0
COMMAND_TYPE = 1
STATUS_TYPE = 2

COMMAND_SET_VALUE = 0
  

    

class Point(models.Model):
    _name = 'tsdb.point'   
    _inherit = ['tsdb.common']
    
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

