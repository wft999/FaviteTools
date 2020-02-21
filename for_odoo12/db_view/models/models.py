# -*- coding: utf-8 -*-

from odoo import models, fields, api

PADNAME_PATTERN = '^[a-zA-Z0-9][a-zA-Z0-9_-]+$'

class Server(models.Model):
    _name = 'db_view.server'

    db_host = fields.Char(string='Database Server', required=True, help="Hostname or IP of Http RESTful server",default="192.168.64.129")
    db_port = fields.Integer(string='Database Port', size=5, required=True, default=6020, help="Http RESTful Port.")
    user_name = fields.Char(string='Database user',default='root')
    user_password = fields.Char(string='Database password',default='taosdata')
    
    database_ids = fields.One2many('db_view.database', 'server_id', string='Database',)
    
    _sql_constraints = [
        ('db_host_uniq', 'unique (db_host)', "db_host already exists !"),
    ]

    @api.multi
    def unlink(self):
        for d in self:
            sql = d._build_insert_sql('');
            d.collector_id.exec_sql(sql)
            
        return super(Server, self).unlink()
    
    @api.model
    def create(self, vals):
        res = super(Server, self).create(vals)
        
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
        res = super(Server, self).write(vals)
        
        for d in self:
            setting = d._build_setting()
            sql = d._build_insert_sql(setting);
            d.collector_id.exec_sql(sql)
            
        return res    
    
    
class Database(models.Model):
    _name = 'db_view.database'

    name = fields.Char(required=True,)
    server_id = fields.Many2one('db_view.server',ondelete='cascade', required=True)  
    
    _sql_constraints = [
        ('db_host_uniq', 'unique (db_host,server_id)', "db_host already exists !"),
    ]
    
    @api.one
    @api.constrains('name')
    def _check_name(self):
        if not re.match(NAME_PATTERN, self.name):
            raise ValidationError(_('Invalid name. Only alphanumerical characters, underscore, hyphen are allowed.'))    