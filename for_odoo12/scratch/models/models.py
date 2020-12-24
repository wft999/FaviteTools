# -*- coding: utf-8 -*-
import os    
import requests
import base64
import json
from odoo import models, fields, api

NAME_PATTERN = '^[a-zA-Z0-9][a-zA-Z0-9_-]+$'

class TourTags(models.Model):
    """ Tags of tour's tasks """
    _name = "scratch.tags"
    _description = "Tour Tags"

    name = fields.Char(required=True)
    color = fields.Integer(string='Color Index')

    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Tag name already exists!"),
    ]

class Step(models.Model):
    _name = 'scratch.step'
    _order = 'sequence, id'

    description = fields.Text()
    sequence = fields.Integer(string='Sequence', index=True, default=0,
        help="Gives the sequence order when displaying a list of tasks.")
    audio = fields.Binary(attachment=True)
    
    tour_id = fields.Many2one('scratch.tour',
        string='Tour',
        default=lambda self: self.env.context.get('default_tour_id'),
        index=True,
        track_visibility='onchange',
        change_default=True)
    
    @api.one
    @api.depends('sequence')
    def _compute_name(self):
        self.name = 'seq%d' % self.sequence

    name = fields.Char(compute='_compute_name')
    
    @api.one
    @api.depends('description')
    def _compute_attachment(self):
        self.audio_attachment_id = self.env['ir.attachment'].search([('res_field', '=', 'audio'),('res_id', '=', self.id), ('res_model', '=', 'scratch.step')], limit=1)
        
    audio_attachment_id = fields.Many2one('ir.attachment', compute='_compute_attachment', ondelete='cascade')
    
    def _get_audio(self,description):
        params={'locale': 'cmn-CN',
                'gender':'female',
                'text':description}
        
        res = requests.get('https://synthesis-service.scratch.mit.edu/synth', params)
        if res.ok:
            if isinstance(res.content, bytes):
                return res.content
            else:
                content = json.loads(str(res.content, encoding='utf-8'))
                if content['err_no']:
                    return NULL
        
        else:
            return NULL
        
    
    def _get_audio_baidu(self,description):
        params={'grant_type': 'client_credentials',
                'client_id':'TUrP8GmcOCPDGPEKObXhI21G',
                'client_secret':'i5YPGTqYj7YTDfB7cWg2rmNYyEe2c0OY'}
        data = requests.get('https://openapi.baidu.com/oauth/2.0/token', params).json()
        params={
                'lan': 'zh',
                'ctp':1,
                'cuid':'abcdxxx',
                'tok':data['access_token'],
                'tex':description,
                'vol':9,
                'per':0,
                'spd':5,
                'pit':5,
                'aue':3,
            }
        
        data = requests.get('http://tsn.baidu.com/text2audio', params)
        if data.ok:
            content = json.loads(str(data.content, encoding='utf-8'))
            if content['err_no']:
                raise 'tts fail'
        
        
        return data.content
    
    @api.model
    def create(self, vals):
        audio = self._get_audio(vals['description'])
        if audio:
            vals['audio'] = base64.b64encode(audio)

        res = super(Step, self).create(vals)

        return res
        
    @api.multi
    def write(self, vals):
        if vals.get('description', False):
            audio = self._get_audio(vals['description'])
            if audio:
                vals['audio'] = base64.b64encode(audio)
            
        res = super(Step, self).write(vals) if vals else True

        return res 

class Tour(models.Model):
    _name = 'scratch.tour'

    name = fields.Char()
    description = fields.Text()
    
    tag_ids = fields.Many2many('scratch.tags', string='Tags')
    step_ids = fields.One2many('scratch.step', 'tour_id', string="Step Activities")
    
    @api.one
    @api.constrains('name')
    def _check_name(self):
        if not re.match(NAME_PATTERN, self.name):
            raise ValidationError(_('Invalid name. Only alphanumerical characters, underscore, hyphen are allowed.'))
    
    @api.multi
    def play_tour(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_url',
            'target': 'self',
            'url': '/scratch/tour/%d'%self.id,
            'target': 'new'
        }
