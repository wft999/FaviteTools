# -*- coding: utf-8 -*-

from odoo import api, fields, models
import base64
import json
import os
from odoo.exceptions import UserError, ValidationError


class ExportWizard(models.TransientModel):
    _name = 'favite_common.export.wizard'

    @api.model
    def _default_directory(self):
        return self.env['favite_common.directory'].search([('active', '=', True)])

    model_name = fields.Char()
    model_id = fields.Integer()
    directory_ids = fields.Many2many('favite_common.directory', string='Export Directory', required=True,default=_default_directory)

    @api.model
    def default_get(self, fields):
        result = super(ExportWizard, self).default_get(fields)
        result.update({
            'model_id': self.env.context.get('active_id', False),
        })
        return result
    
    @api.multi
    def export(self):
        for w in self:
            model = self.env[w.model_name].browse(w.model_id)
            model.export_file(w.directory_ids)
                
        
    