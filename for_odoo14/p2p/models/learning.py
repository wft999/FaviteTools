# -*- coding: utf-8 -*-

from odoo import models, fields, api,_

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
        if category == 'Block':
            url = "/p2p/static/lib/block/index.html#%d"%self.id
            
        return {
            "type": "ir.actions.act_url",
            "url": url,
            "target": "new",
        }

class LearningStep(models.Model):
    _name = 'p2p.learning.step'
    _description = 'It is a learning step'
    _order = "sequence asc"
    _inherit = ['mail.thread', 'rating.parent.mixin', 'mail.activity.mixin']
    _inherits = {'p2p.course.lesson': 'lesson_id'}

    learning_id = fields.Many2one('p2p.learning', string='learning', ondelete='cascade',required=True)
    lesson_id = fields.Many2one('p2p.course.lesson',  ondelete='cascade', string='Lesson')
    
        
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
                
    def action_listen(self):
        return {
            "type": "ir.actions.act_url",
            "url": "/p2p/course/lesson/%d"%self.lesson_id.id,
            "target": "new",
        }
        
    def action_online(self):
        remote_uid = self.learning_id.teacher_id.id if self.env.uid == self.learning_id.student_id.id else self.learning_id.student_id.id
        return {
            "type": "ir.actions.act_url",
            "url": "/p2p/online/request/%d"%remote_uid,
            "target": "new",
        }
    
    def action_exercise_view(self):
        pass
    
    @api.model
    def create(self, vals):
        res = super(LearningStep, self).create(vals)
        for s in res:
            for e in s.lesson_id.exercise_ids:
                self.env['p2p.learning.answer'].sudo().create({
                    'step_id':s.id,
                    'exercise_id':e.id
                    }) 
        return res

class Learning(models.Model):
    _name = 'p2p.learning'
    _description = 'It is a learning'
    _inherits = {'p2p.course': 'course_id'}

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
        
