# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import _, api, exceptions, fields, models, modules
from odoo.exceptions import ValidationError

class Users(models.Model):
    _name = 'res.users'
    _inherit = ['res.users']
    _description = 'Users'

    tag_ids = fields.Many2many('p2p.course.category', string='Tags')
    
    @api.constrains('tag_ids')
    def _check_relation(self):
        for rec in self:
            if len(rec.tag_ids) > 0:
                if not rec.has_group('p2p.group_assistant'):
                    raise ValidationError("user is denied ")
            
            for tag1 in rec.tag_ids:
                for tag2 in rec.tag_ids:
                    if tag1 == tag2:
                        continue
                    
                    if tag1.check_relation(tag2):
                        raise ValidationError("%s name and %s must be different"%(tag1.name,tag2.name))
                    