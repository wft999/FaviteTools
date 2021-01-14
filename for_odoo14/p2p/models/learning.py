# -*- coding: utf-8 -*-

from odoo import models, fields, api,_
from odoo.exceptions import UserError, ValidationError

default_scratch_content = '''
{"targets":[{"isStage":true,"name":"Stage","variables":{"`jEk@4|i[#Fk?(8x)AV.-my variable":["我的变量",0]},"lists":{},"broadcasts":{},"blocks":{},"comments":{},"currentCostume":0,"costumes":[{"assetId":"cd21514d0531fdffb22204e0ec5ed84a","name":"背景1","md5ext":"cd21514d0531fdffb22204e0ec5ed84a.svg","dataFormat":"svg","rotationCenterX":240,"rotationCenterY":180}],"sounds":[{"assetId":"83a9787d4cb6f3b7632b4ddfebf74367","name":"啵","dataFormat":"wav","format":"","rate":48000,"sampleCount":1124,"md5ext":"83a9787d4cb6f3b7632b4ddfebf74367.wav"}],"volume":100,"layerOrder":0,"tempo":60,"videoTransparency":50,"videoState":"on","textToSpeechLanguage":null},{"isStage":false,"name":"角色1","variables":{},"lists":{},"broadcasts":{},"blocks":{},"comments":{},"currentCostume":0,"costumes":[{"assetId":"bcf454acf82e4504149f7ffe07081dbc","name":"造型1","bitmapResolution":1,"md5ext":"bcf454acf82e4504149f7ffe07081dbc.svg","dataFormat":"svg","rotationCenterX":48,"rotationCenterY":50},{"assetId":"0fb9be3e8397c983338cb71dc84d0b25","name":"造型2","bitmapResolution":1,"md5ext":"0fb9be3e8397c983338cb71dc84d0b25.svg","dataFormat":"svg","rotationCenterX":46,"rotationCenterY":53}],"sounds":[{"assetId":"83a9787d4cb6f3b7632b4ddfebf74367","name":"喵","dataFormat":"wav","format":"","rate":48000,"sampleCount":1124,"md5ext":"83a9787d4cb6f3b7632b4ddfebf74367.wav"}],"volume":100,"layerOrder":1,"visible":true,"x":8,"y":-15,"size":100,"direction":90,"draggable":false,"rotationStyle":"all around"}],"monitors":[],"extensions":[],"meta":{"semver":"3.0.0","vm":"0.2.0-prerelease.20201125065300","agent":"Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:84.0) Gecko/20100101 Firefox/84.0"}}
'''
class LearningRoom(models.Model):
    _name = 'p2p.learning.room'
    _description = 'It is a learning room'

    teacher_id = fields.Many2one('res.users', string='Teacher', ondelete='cascade')

class LearningAnswer(models.Model):
    _name = 'p2p.learning.answer'
    _description = 'It is a learning answer'
    _order = "sequence"
    _inherits = {'p2p.course.exercise': 'exercise_id'}

    step_id = fields.Many2one('p2p.learning.step',  ondelete='cascade', string='Step')
    exercise_id = fields.Many2one('p2p.course.exercise',  ondelete='cascade', string='exercise',required=True)
    
    content = fields.Text()
    mark = fields.Selection(string='mark', selection=[
        ('awaiting_data', 'Data to provide'),
        ('pending', 'Waiting for validation'),
        ('passed', 'Confirmed'),
        ('failed', 'Failed'),
    ], default='awaiting_data')
    
    def action_do_exercise(self):
        category = self.exercise_id.lesson_id.course_id.category_id.name
        if category == 'Scratch':
            url = "/p2p/static/lib/scratch/index.html#%d"%self.id
            
        return {
            "type": "ir.actions.act_url",
            "url": url,
            "target": "new",
        }
        
    @api.model
    def create(self, vals):
        
        return super(LearningAnswer, self).create(vals)

class LearningStep(models.Model):
    _name = 'p2p.learning.step'
    _description = 'It is a learning step'
    _order = "sequence asc"
    _inherit = ['mail.thread', 'rating.parent.mixin', 'mail.activity.mixin']
    _inherits = {'p2p.course.lesson': 'lesson_id'}

    learning_id = fields.Many2one('p2p.learning', string='learning', ondelete='cascade',required=True)
    lesson_id = fields.Many2one('p2p.course.lesson',  ondelete='cascade', string='Lesson')
    is_self_requested = fields.Boolean(compute='_compute_is_requested')
    
    @api.depends('learning_id.online_remote_uid')
    def _compute_is_requested(self):
        for step in self:
            step.is_self_requested = step.learning_id.online_remote_uid.id == self._uid
        
    answer_ids = fields.One2many('p2p.learning.answer', 'step_id', string='exercise')  
    status = fields.Selection(string='status', selection=[
            ('Not learning', 'Not learning'),
            ('learning', 'learning'),
            ('exercising', 'exercising'),
            ('pending', 'pending'),
            ('failed', 'Failed'),
            ('passed', 'passed'),
            ], default='learning', compute='_compute_status')
    
    def _compute_status(self):
        for step in self:
        
            if len(step.exercise_ids) == len(step.answer_ids):
                if all(answer.mark == 'passed' for answer in step.answer_ids):
                    step.status = 'passed'
                elif any(answer.mark == 'pending' for answer in step.answer_ids):
                    step.status = 'pending'
                elif any(answer.mark == 'failed' for answer in step.answer_ids):
                    step.status = 'failed'
                else:
                    step.status = 'exercising'
            elif len(step.answer_ids) > 0:
                step.status = 'exercising'
            elif all(s.status == 'passed' for s in step.learning_id.step_ids[0:step.sequence]):
                step.status = 'learning'
            else:
                step.status = 'Not learning'
                
    def action_watch_slide(self):
        return {
            "type": "ir.actions.act_url",
            "url": "/p2p/course/lesson/%d"%self.lesson_id.id,
            "target": "new",
        }
        
    def action_accept_online(self):
        channel = '%s,webrtc,%d'%(self._cr.dbname,self.learning_id.online_local_uid.id)
        message = ['accept',self._uid,self.id]
        self.env['bus.bus'].sendone(channel, message)
        url = "/p2p/online/%d"%self.learning_id.online_local_uid.id
        self.learning_id.write({
            'online_local_uid':False,
            'online_remote_uid':False
            })
        return {
            "type": "ir.actions.act_url",
            "url": url,
            "target": "new",
        }
    
    def action_Cancel_online(self):
        channel = '%s,webrtc,%d'%(self._cr.dbname,self.learning_id.online_local_uid.id)
        message = ['Cancel',self._uid,self.id]
        self.env['bus.bus'].sendone(channel, message)
        self.learning_id.write({
            'online_local_uid':False,
            'online_remote_uid':False
            })
        
    def action_request_online(self):
        remote = self.learning_id.teacher_id if self._uid == self.learning_id.student_id.id else self.learning_id.student_id
        if self.env.user.webrtc_status != 'idle':
            raise UserError(_("I am busy!"))
        if remote.im_status == 'offline':
            raise UserError(_("%s is offline!" % remote.name))
        if remote.webrtc_status != 'idle':
            raise UserError(_("%s is busy!" % remote.name))
        
        channel = '%s,webrtc,%d'%(self._cr.dbname,remote.id)
        message = ['request',self._uid,self.id]
        self.env['bus.bus'].sendone(channel, message)
        
        self.learning_id.write({
            'online_local_uid':self._uid,
            'online_remote_uid':remote.id
            })
        
        return {
            "type": "ir.actions.act_url",
            "url": "/p2p/online/%d"%remote.id,
            "target": "new",
        }
    
    def action_exercise_view(self):
        pass
    
    @api.model
    def create(self, vals):
        res = super(LearningStep, self).create(vals)
        
        content = ''
        if res.course_id.category_id.name == 'Scratch':
            content = default_scratch_content
        for s in res:
            for e in s.lesson_id.exercise_ids:
                self.env['p2p.learning.answer'].sudo().create({
                    'step_id':s.id,
                    'exercise_id':e.id,
                    'content':content
                    }) 
        return res

class Learning(models.Model):
    _name = 'p2p.learning'
    _description = 'It is a learning'
    _inherits = {'p2p.course': 'course_id'}

    online_local_uid = fields.Many2one('res.users', string='Local user', ondelete='set null')
    online_remote_uid = fields.Many2one('res.users', string='Local user', ondelete='set null')
    student_id = fields.Many2one('res.users', string='Student', ondelete='cascade',default=lambda self: self.env.user)
    teacher_id = fields.Many2one('res.users', string='Teacher', ondelete='set null',
                                domain=lambda self: [('groups_id', 'in', self.env.ref('p2p.group_teacher').id)])
    assistant_id = fields.Many2one('res.users', string='Assistant', ondelete='set null',
                                domain=lambda self: [('groups_id', 'in', self.env.ref('p2p.group_assistant').id)])
    
    course_id = fields.Many2one('p2p.course',  ondelete='cascade', string='course',required=True)
    step_ids = fields.One2many('p2p.learning.step', 'learning_id', string='step list')
    progress = fields.Char(compute='_compute_progress', string="Finished/Total")
    user_is_teacher = fields.Boolean(compute='_compute_user')
    user_is_assistant = fields.Boolean(compute='_compute_user')
    user_is_student = fields.Boolean(compute='_compute_user')
    
    @api.model
    def create(self, vals):
        course = self.env['p2p.course'].browse(vals['course_id'])
        vals['teacher_id'] = course.create_uid.id
        vals['assistant_id'] = course.create_uid.id
        res = super(Learning, self).create(vals)

        return res
    
    def _compute_user(self):
        for rec in self:
            rec.user_is_teacher = (rec.env.uid == rec.teacher_id.id)
            rec.user_is_assistant = (rec.env.uid == rec.assistant_id.id)
            rec.user_is_student = (rec.env.uid == rec.student_id.id)
    
    def _compute_progress(self):
        for l in self:
            l.progress = "%d/%d"%(len(l.step_ids) - 1,len(l.course_id.lesson_ids))
            
    def action_abort(self):
        self.sudo().unlink();
        return {'type': 'ir.actions.act_window_close'}

    def action_continue(self):

        return {
            'name': _('Learning'),
            'res_model': 'p2p.learning.step',
            'res_id': self.step_ids[-1].id,
            'views': [(self.env.ref('p2p.step_form').id, 'form'),],
            'type': 'ir.actions.act_window',
            'target': 'current'
        }
        
    def action_view_finsidhed(self):
        return {
            'type': 'ir.actions.act_window',
            'name': _('Finished lessons'),
            'res_model': 'p2p.learning.step',
            'view_mode': 'tree,form',
            'view_id': False,
            'target': 'current',
            'flags':{'import_enabled':False},
            'domain': [('learning_id', '=', self.id),('status','=','passed')],
            }
        
