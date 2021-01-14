# -*- coding: utf-8 -*-

from odoo import models, fields, api,_
from odoo.exceptions import UserError, ValidationError

default_scratch_content = '''
{"targets":[{"isStage":true,"name":"Stage","variables":{"`jEk@4|i[#Fk?(8x)AV.-my variable":["我的变量",0]},"lists":{},"broadcasts":{},"blocks":{},"comments":{},"currentCostume":0,"costumes":[{"assetId":"cd21514d0531fdffb22204e0ec5ed84a","name":"背景1","md5ext":"cd21514d0531fdffb22204e0ec5ed84a.svg","dataFormat":"svg","rotationCenterX":240,"rotationCenterY":180}],"sounds":[{"assetId":"83a9787d4cb6f3b7632b4ddfebf74367","name":"啵","dataFormat":"wav","format":"","rate":48000,"sampleCount":1124,"md5ext":"83a9787d4cb6f3b7632b4ddfebf74367.wav"}],"volume":100,"layerOrder":0,"tempo":60,"videoTransparency":50,"videoState":"on","textToSpeechLanguage":null},{"isStage":false,"name":"角色1","variables":{},"lists":{},"broadcasts":{},"blocks":{},"comments":{},"currentCostume":0,"costumes":[{"assetId":"bcf454acf82e4504149f7ffe07081dbc","name":"造型1","bitmapResolution":1,"md5ext":"bcf454acf82e4504149f7ffe07081dbc.svg","dataFormat":"svg","rotationCenterX":48,"rotationCenterY":50},{"assetId":"0fb9be3e8397c983338cb71dc84d0b25","name":"造型2","bitmapResolution":1,"md5ext":"0fb9be3e8397c983338cb71dc84d0b25.svg","dataFormat":"svg","rotationCenterX":46,"rotationCenterY":53}],"sounds":[{"assetId":"83a9787d4cb6f3b7632b4ddfebf74367","name":"喵","dataFormat":"wav","format":"","rate":48000,"sampleCount":1124,"md5ext":"83a9787d4cb6f3b7632b4ddfebf74367.wav"}],"volume":100,"layerOrder":1,"visible":true,"x":8,"y":-15,"size":100,"direction":90,"draggable":false,"rotationStyle":"all around"}],"monitors":[],"extensions":[],"meta":{"semver":"3.0.0","vm":"0.2.0-prerelease.20201125065300","agent":"Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:84.0) Gecko/20100101 Firefox/84.0"}}
'''

class Slide(models.Model):
    _inherit = "slide.slide"
    
    has_exercise = fields.Boolean('has a exercise', default=False)
    exercise_url = fields.Char(compute='_compute_exercise_url')
    
    def _compute_exercise_url(self):
        for slide in self:
            url = '#'
            if slide.has_exercise:
                tags = [tag.name for tag in slide.channel_id.tag_ids]
                
                exercise = self.env['o2o.exercise'].sudo().search([('user_id', '=', self._uid),('slide_id','=',slide.id)])
                if not exercise:
                    content = ''
                    if 'Scratch' in tags:
                        content = default_scratch_content
                    exercise = self.env['o2o.exercise'].sudo().create({'user_id':self._uid,'slide_id':slide.id,'content':content})
                    
                if 'Scratch' in tags:
                    url = "/o2o/static/lib/scratch/index.html#%d"%exercise.id
                
            slide.exercise_url = url
    
