# -*- coding: utf-8 -*-
from odoo import http
from Demos.BackupRead_BackupWrite import pss
import werkzeug
import json
from odoo.http import request

class Course(http.Controller):  
    @http.route('/p2p/answer/<int:id>', type='http', methods=['GET'],auth="user")
    def test1(self,id, **kw):
        answer = http.request.env['p2p.learning.answer'].browse(id)
        
        if request.httprequest.method == 'GET':
            response = werkzeug.wrappers.Response()
            response.data = answer.content
            return response

    @http.route('/p2p/answer/<int:id>', type='json', methods=['PUT'],auth="user")
    def test2(self,id, **kw):
        answer = http.request.env['p2p.learning.answer'].browse(id)
        
        if request.httprequest.method == 'PUT':
            answer.write({'content':request.httprequest.data})
              
    @http.route('/p2p/course/lesson/<int:lesson>', type='http', auth="user", website=True)
    def learn(self,lesson, **kw):
        lesson = http.request.env['p2p.course.lesson'].browse(lesson)
        content = ''.join(s.content for s in lesson.slide_ids)
        return http.request.render('p2p.webslide', {
            'content': content,
        })
        
    @http.route('/p2p/course/answer/<int:id>', type='http', auth="user", website=True)
    def do_exercise(self,id, **kw):
        return werkzeug.utils.redirect('/p2p/static/lib/scratch/index.html#%d' % id)
        answer = http.request.env['p2p.learning.answer'].browse(id)
         
        category = answer.exercise_id.lesson_id.course_id.category_id.name
        if category == 'Scratch':
            template = 'p2p.exercise_scratch'
        else:
            template = 'p2p.exercise_c'
         
        return http.request.render(template, {
            'content': answer.content,
            })

#     @http.route('/p2p/course/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('p2p.listing', {
#             'root': '/p2p/p2p',
#             'objects': http.request.env['p2p.p2p'].search([]),
#         })
# 
#     @http.route('/p2p/p2p/objects/<model("p2p.p2p"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('p2p.object', {
#             'object': obj
#         })
