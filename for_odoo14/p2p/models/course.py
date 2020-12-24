# -*- coding: utf-8 -*-

from odoo import models, fields, api,_
import os    
import requests
import base64
import json

class CourseCategory(models.Model):
    _description = 'Course Tags'
    _name = 'p2p.course.category'
    _order = 'parent_id,name'
    _parent_store = True

    def _get_default_color(self):
        return randint(1, 11)

    name = fields.Char(string='Tag Name', required=True, translate=True)
    color = fields.Integer(string='Color Index')
    parent_id = fields.Many2one('p2p.course.category', string='Parent Category', index=True, ondelete='cascade')
    child_ids = fields.One2many('p2p.course.category', 'parent_id', string='Child Tags')
    active = fields.Boolean(default=True, help="The active field allows you to hide the category without removing it.")
    parent_path = fields.Char(index=True)

    @api.constrains('parent_id')
    def _check_parent_id(self):
        if not self._check_recursion():
            raise ValidationError(_('You can not create recursive tags.'))

    def name_get(self):
        if self._context.get('course_category_display') == 'short':
            return super(CourseCategory, self).name_get()

        res = []
        for category in self:
            names = []
            current = category
            while current:
                names.append(current.name)
                current = current.parent_id
            res.append((category.id, ' / '.join(reversed(names))))
        return res

    @api.model
    def _name_search(self, name, args=None, operator='ilike', limit=100, name_get_uid=None):
        args = args or []
        if name:
            # Be sure name_search is symetric to name_get
            name = name.split(' / ')[-1]
            args = [('name', operator, name)] + args
        return self._search(args, limit=limit, access_rights_uid=name_get_uid)
    
class CourseSlide(models.Model):
    _name = 'p2p.course.slide'
    _description = 'It is a course slide'
    _order = 'sequence'

    lesson_id = fields.Many2one('p2p.course.lesson',  ondelete='cascade', string='Course lesson',required=True)
    
    sequence = fields.Integer(string='Sequence', index=True, default=0)
    content = fields.Text()
    tts = fields.Text()
    
    audio = fields.Binary(attachment=True)
    
    @api.depends('sequence')
    def _compute_name(self):
        for s in self:
            s.name = 'slide%d' % (s.sequence+1)

    name = fields.Char(compute='_compute_name')
    
    @api.depends('tts')
    def _compute_description(self):
        for s in self:
            s.description = s.tts.slice(0,80) if s.tts else ''

    description = fields.Char(compute='_compute_description')
    
    @api.depends('tts')
    def _compute_attachment(self):
        self.audio_attachment_id = self.env['ir.attachment'].search([('res_field', '=', 'audio'),('res_id', '=', self.id), ('res_model', '=', 'p2p.course.slide')], limit=1)
        
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
#         if 'tts' in vals:
#             audio = self._get_audio_baidu(vals['tts'])
#             if audio:
#                 vals['audio'] = base64.b64encode(audio)

        vals['sequence'] = self.search_count([('lesson_id','=',vals['lesson_id'])])
        res = super(CourseSlide, self).create(vals)

        return res
        
    def write(self, vals):
#         if 'tts' in vals:
#             audio = self._get_audio_baidu(vals['tts'])
#             if audio:
#                 vals['audio'] = base64.b64encode(audio)
            
        res = super(CourseSlide, self).write(vals) if vals else True

        return res
    
class CourseExercise(models.Model):
    _name = 'p2p.course.exercise'
    _description = 'It is a course exercise'
    _order = "sequence"

    active = fields.Boolean(default=True)
    sequence = fields.Integer(string='Sequence', index=True, default=0)
    description = fields.Html(required=True)
    
    lesson_id = fields.Many2one('p2p.course.lesson',  ondelete='cascade', string='lesson',required=True)
    
    @api.depends('sequence')
    def _compute_name(self):
        for e in self:
            e.name = 'Exercise%d' % (e.sequence+1)

    name = fields.Char(compute='_compute_name')
    
class CourseLesson(models.Model):
    _name = 'p2p.course.lesson'
    _description = 'It is a course lesson'
    _order = "sequence asc"
    
    @api.depends('sequence')
    def _compute_name(self):
        for l in self:
            l.name = 'Lesson%d' % (l.sequence+1)

    name = fields.Char(compute='_compute_name')

    active = fields.Boolean(default=True)
    sequence = fields.Integer(string='Sequence', index=True, default=0)
    title = fields.Char(required=True)
    description = fields.Html()
    slide_ids = fields.One2many('p2p.course.slide', 'lesson_id', string='slide list')
    
    course_id = fields.Many2one('p2p.course',  ondelete='cascade', string='Course',required=True)
    exercise_ids = fields.One2many('p2p.course.exercise', 'lesson_id', string='lesson list')
    
    @api.model
    def create(self, vals):
        vals['sequence'] = self.search_count([('course_id','=',vals['course_id'])])
        return super(CourseLesson, self).create(vals)
    
    def name_get(self):
        if self._context.get('course_lesson_display') == 'short':
            return super(CourseLesson, self).name_get()

        res = []
        for lesson in self:
            res.append((lesson.id, 'Lesson%d:%s'%(lesson.sequence+1,lesson.name)))
        return res
    
        
    def do_exercise(self):
        learning = self.env['p2p.learning'].search([('lesson_id','=',self.id),('student_id','=',self.env.uid)])
        if not learning:
            learning = self.env['p2p.learning'].create({
                'lesson_id':self.id,
                'student_id':self.env.uid
                })
        return {
                    "type": "ir.actions.act_url",
                    "url": "/p2p/course/exercise/%d"%learning.id,
                    "target": "new",
                }

class Course(models.Model):
    _name = 'p2p.course'
    _description = 'It is a course'

    name = fields.Char(required=True)
    
    description = fields.Html()
    category_id = fields.Many2one('p2p.course.category',  ondelete='restrict', string='Category',required=True)
    lesson_ids = fields.One2many('p2p.course.lesson', 'course_id', string='lesson list')
    
    level = fields.Selection(selection=[
        ('low','Low'),
        ('normal','Normal'),
        ('high','High')],default='low')
    
    active = fields.Boolean(default=True)
    displayed_image_id = fields.Many2one('ir.attachment', domain="[('res_model', '=', 'p2p.course'), ('res_id', '=', id), ('mimetype', 'ilike', 'image')]", string='Cover Image')
    website = fields.Char("Website", readonly=True)
    
    lesson_count = fields.Integer(compute='_compute_lesson_count', string="Lesson Count")
    attend_count = fields.Integer(compute='_compute_attend_count', string="Attend_count")
    
    def _compute_lesson_count(self):
        lesson_data = self.env['p2p.course.lesson'].read_group([('course_id', 'in', self.ids)], ['course_id'], ['course_id'])
        result = dict((data['course_id'][0], data['course_id_count']) for data in lesson_data)
        for c in self:
            c.lesson_count = result.get(c.id, 0)
            
    def _compute_attend_count(self):
        attend_data = self.env['p2p.learning'].read_group([('course_id', 'in', self.ids)], ['course_id'], ['course_id'])
        result = dict((data['course_id'][0], data['course_id_count']) for data in attend_data)
        for c in self:
            c.attend_count = result.get(c.id, 0)
            
    def action_view_lessons(self):
        action = self.with_context(active_id=self.id, active_ids=self.ids) \
            .env.ref('p2p.act_p2p_course_2_p2p_lesson_all') \
            .sudo().read()[0]
        action['display_name'] = self.name
        return action
    
    def action_attend(self):
        learning = self.env['p2p.learning'].search([('course_id','=',self.id),('student_id','=',self.env.uid)])
        if not learning:
            learning = self.env['p2p.learning'].sudo().create({
                'course_id':self.id,
                'student_id':self.env.uid
                })
            step = self.env['p2p.learning.step'].sudo().create({
                    'learning_id':learning.id,
                    'lesson_id':self.lesson_ids[0].id
                    }) 
                
            
        form_view = self.env.ref('p2p.step_form')
        return {
            'name': _('Learning'),
            'res_model': 'p2p.learning.step',
            'res_id': step.id,
            'views': [(form_view.id, 'form'),],
            'type': 'ir.actions.act_window',
            'target': 'current'
        }
            

    
