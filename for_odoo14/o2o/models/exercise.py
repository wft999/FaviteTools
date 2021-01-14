# -*- coding: utf-8 -*-

from odoo import models, fields, api,_
from odoo.exceptions import UserError, ValidationError

    
class Exercise(models.Model):
    _name = 'o2o.exercise'
    _description = 'It is a exercise'

    user_id = fields.Many2one('res.users', string='Do by', default=lambda self: self.env.uid)
    slide_id = fields.Many2one('slide.slide',  ondelete='cascade', string='slide')
    
    content = fields.Text()
    def action_do_exercise(self):
        tags = [tag.name for tag in self.slide_id.channel_id.tag_ids]
        if 'Scratch' in tags:
            url = "/o2o/static/lib/scratch/index.html#%d"%self.id
            
        return {
            "type": "ir.actions.act_url",
            "url": url,
            "target": "new",
        }

