# -*- coding: utf-8 -*-
import requests
import base64
from odoo.addons.base.module import module
from odoo import models, fields, api, _

class Tour(models.Model):

    _inherit = "web_tour.tour"

    @api.model
    def reset(self, tour_names):
        self.search([('name','=',tour_names),('user_id','=', self.env.uid)]).unlink();

class Tour(models.Model):
    _name = 'web_demo.tour'

    name = fields.Char(required=True)
    summary = fields.Text('Summary', translate=True)
    module_id = fields.Many2one('ir.module.module', string='Corresponding Module',required=True, domain=[('application', '=', 1)])
    module_state = fields.Selection(selection=module.STATES, string='Installation State', related='module_id.state')
    module_shortdesc = fields.Char('Module Name', related='module_id.shortdesc')
    module_icon = fields.Char('Icon URL', related='module_id.icon')
    steps = fields.One2many('web_demo.step', 'tour_id', string="Tour Steps")
    
    @api.one
    def create_menu(self):
        Menu = self.env['ir.ui.menu'].with_context({'ir.ui.menu.full_list': True})
        m = Menu.sudo().search([('name', '=', self.module_shortdesc),('parent_id', '=', self.env.ref('web_demo.menu_apps').id),], limit=1)
        if(not m.id):
            action = self.env['ir.actions.act_window'].sudo().create({'name':self.module_shortdesc,'res_model':'web_demo.tour','domain':'[("module_id", "=", %s)]' % self.module_id.id,'view_mode':'kanban,form'})
            Menu.sudo().create({'name': self.module_shortdesc, 'parent_id': self.env.ref('web_demo.menu_apps').id,'action':'ir.actions.act_window,%s' % action.id})
        pass
    
    @api.one
    def remove_menu(self):
        cnt = self.env['web_demo.tour'].search_count([('module_id','=',self.module_id.id),])
        if (cnt > 1):
            return
        
        Menu = self.env['ir.ui.menu'].with_context({'ir.ui.menu.full_list': True})
        m = Menu.sudo().search([('name', '=', self.module_shortdesc),('parent_id', '=', self.env.ref('web_demo.menu_apps').id),], limit=1)
        if(m.id):
            action = self.env['ir.actions.act_window'].sudo().search([('id', '=', m.action.id),], limit=1)
            if(action.id):
                action.unlink()
            m.unlink()
    
    @api.model
    def create(self, vals):
        tour = super(Tour, self).create(vals)
        tour.create_menu()
        return tour
    
    @api.multi
    def write(self, vals):
        if vals.get('module_id', False):
            for t in self:
                t.remove_menu()
            
        tour = super(Tour, self).write(vals)
        
        if vals.get('module_id', False):
            for t in self:
                t.create_menu()
            
        return tour
    
    @api.multi
    def unlink(self):
        for tour in self:
            tour.remove_menu()
            tour.steps.unlink()
        return super(Tour, self).unlink()
    
    @api.multi
    def close_dialog(self):
        return {'type': 'ir.actions.act_window_close'}

    @api.multi
    def edit_dialog(self):
        form_view = self.env.ref('web_demo.tour_view_form')
        return {
            'name': _('Tour'),
            'res_model': 'web_demo.tour',
            'res_id': self.id,
            'views': [(form_view.id, 'form'),],
            'type': 'ir.actions.act_window',
            'target': 'inline'
        }
        
class Step(models.Model):
    _name = 'web_demo.step'

    tour_id = fields.Many2one('web_demo.tour', string='Corresponding Tour',required=True,ondelete='cascade',default=lambda self: self.env.context.get('default_tour_id'))
    sequence = fields.Integer('Sequence',required=True)
    trigger = fields.Text(required=True)
    extra_trigger = fields.Text()
    content = fields.Text(required=True,translate=True)
    position = fields.Selection([
            ('top', _('top')),
            ('right', _('right')),
            ('left', _('left')),
            ('bottom', _('bottom')),
        ],
        string='Tip Position', default='right',
        )
    width = fields.Integer(string='Tip Width',default=270)
    run = fields.Text()
    audio = fields.Binary(attachment=True)
    
    @api.one
    @api.depends('content')
    def _compute_attachment(self):
        self.audio_attachment_id = self.env['ir.attachment'].search([('res_field', '=', 'audio'),('res_id', '=', self.id), ('res_model', '=', 'web_demo.step')], limit=1)
        
    audio_attachment_id = fields.Many2one('ir.attachment', compute='_compute_attachment', ondelete='cascade')
    
    def _get_audio(self,content):
        params={'grant_type': 'client_credentials',
                'client_id':'TUrP8GmcOCPDGPEKObXhI21G',
                'client_secret':'i5YPGTqYj7YTDfB7cWg2rmNYyEe2c0OY'}
        data = requests.get('https://openapi.baidu.com/oauth/2.0/token', params).json()
        params={
                'lan': 'zh',
                'ctp':1,
                'cuid':'abcdxxx',
                'tok':data['access_token'],
                'tex':content,
                'vol':9,
                'per':0,
                'spd':5,
                'pit':5,
                'aue':3,
            }
        
        audio = base64.b64encode(requests.get('http://tsn.baidu.com/text2audio', params).content)
        return audio
    
    @api.model
    def create(self, vals):
        vals['audio'] = self._get_audio(vals['content'])
        
        res = super(Step, self).create(vals)
        return res
        
    @api.multi
    def write(self, vals):
        if vals.get('content', False):
            vals['audio'] = self._get_audio(vals['content'])
            
        res = super(Step, self).write(vals) if vals else True
        return res    
        
    
    
    
    
    
    
    
    
    