# -*- coding: utf-8 -*-

from odoo import models, fields, api,_
from odoo.exceptions import UserError, ValidationError

default_scratch_content = '''
{"targets":[{"isStage":true,"name":"Stage","variables":{"`jEk@4|i[#Fk?(8x)AV.-my variable":["我的变量",0]},"lists":{},"broadcasts":{},"blocks":{},"comments":{},"currentCostume":0,"costumes":[{"assetId":"cd21514d0531fdffb22204e0ec5ed84a","name":"背景1","md5ext":"cd21514d0531fdffb22204e0ec5ed84a.svg","dataFormat":"svg","rotationCenterX":240,"rotationCenterY":180}],"sounds":[{"assetId":"83a9787d4cb6f3b7632b4ddfebf74367","name":"啵","dataFormat":"wav","format":"","rate":48000,"sampleCount":1124,"md5ext":"83a9787d4cb6f3b7632b4ddfebf74367.wav"}],"volume":100,"layerOrder":0,"tempo":60,"videoTransparency":50,"videoState":"on","textToSpeechLanguage":null},{"isStage":false,"name":"角色1","variables":{},"lists":{},"broadcasts":{},"blocks":{},"comments":{},"currentCostume":0,"costumes":[{"assetId":"bcf454acf82e4504149f7ffe07081dbc","name":"造型1","bitmapResolution":1,"md5ext":"bcf454acf82e4504149f7ffe07081dbc.svg","dataFormat":"svg","rotationCenterX":48,"rotationCenterY":50},{"assetId":"0fb9be3e8397c983338cb71dc84d0b25","name":"造型2","bitmapResolution":1,"md5ext":"0fb9be3e8397c983338cb71dc84d0b25.svg","dataFormat":"svg","rotationCenterX":46,"rotationCenterY":53}],"sounds":[{"assetId":"83a9787d4cb6f3b7632b4ddfebf74367","name":"喵","dataFormat":"wav","format":"","rate":48000,"sampleCount":1124,"md5ext":"83a9787d4cb6f3b7632b4ddfebf74367.wav"}],"volume":100,"layerOrder":1,"visible":true,"x":8,"y":-15,"size":100,"direction":90,"draggable":false,"rotationStyle":"all around"}],"monitors":[],"extensions":[],"meta":{"semver":"3.0.0","vm":"0.2.0-prerelease.20201125065300","agent":"Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:84.0) Gecko/20100101 Firefox/84.0"}}
'''

class ChannelPartnersRelation(models.Model):
    _inherit = "slide.channel.partner"
    _description = 'Channel / Partners (Members)'
    my_teacher_id = fields.Many2one('res.users', string='Teacher')
    
class ChannelTeachersRelation(models.Model):
    _name = 'slide.channel.teacher'
    _description = 'Channel / Teachers'
    _table = 'slide_channel_teacher'

    channel_id = fields.Many2one('slide.channel', index=True, required=True, ondelete='cascade')
    user_id = fields.Many2one('res.user', index=True, required=True, ondelete='cascade')
    
class ChannelAuthorsRelation(models.Model):
    _name = 'slide.channel.author'
    _description = 'Channel / Authors'
    _table = 'slide_channel_author'

    channel_id = fields.Many2one('slide.channel', index=True, required=True, ondelete='cascade')
    user_id = fields.Many2one('res.user', index=True, required=True, ondelete='cascade')
        
class Channel(models.Model):
    _inherit = "slide.channel"
    
    teacher_ids = fields.Many2many('res.user', 'slide_channel_teacher', 'channel_id', 'user_id',
        string='Teachers', help="All teachers of the channel.", context={'active_test': False}, copy=False, depends=['channel_teacher_ids'])
    channel_teacher_ids = fields.One2many('slide.channel.user', 'channel_id', string='Teachers Information', groups='website_slides.group_website_slides_manager', depends=['teacher_ids'])
    author_ids = fields.Many2many('res.user', 'slide_channel_author', 'channel_id', 'user_id',
        string='Authors', help="All authors of the channel.", context={'active_test': False}, copy=False, depends=['channel_author_ids'])
    channel_author_ids = fields.One2many('slide.channel.author', 'channel_id', string='Authors Information', groups='website_slides.group_website_slides_manager', depends=['author_ids'])


    my_teacher_id = fields.Many2one('res.users', string='My teacher', compute="_compute_my_teacher_id",inverse='_inverse_my_teacher_id',
                                    domain="[('id', 'in', channel_teacher_ids)]",compute_sudo=False)
    
    def _inverse_my_teacher_id(self):
        for channel in self:
            current_user_info = self.env['slide.channel.partner'].sudo().search(
                [('channel_id', '=', channel.id), ('partner_id', '=', self.env.user.partner_id.id)]
            )
            current_user_info.my_teacher_id = channel.my_teacher_id
    
    @api.depends_context('uid')
    def _compute_my_teacher_id(self):
        for channel in self:
            current_user_info = self.env['slide.channel.partner'].sudo().search(
                [('channel_id', '=', channel.id), ('partner_id', '=', self.env.user.partner_id.id)]
            )
            channel.my_teacher_id = current_user_info.my_teacher_id