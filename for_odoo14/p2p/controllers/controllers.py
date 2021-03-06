# -*- coding: utf-8 -*-
from odoo import http
import werkzeug
import json
from odoo.http import request
from odoo.addons.bus.controllers.main import BusController
from odoo.addons.bus.models.bus import dispatch

class WebrtcBusController(BusController):
    # override to add channels
    def _poll(self, dbname, channels, last, options):
#       referrer_url = request.httprequest.headers.get('Referer', '')

        if request.session.uid and 'bus_inactivity' in options:
            request.env['bus.presence'].update(options.get('bus_inactivity'),options.get('is_webrtc'))

        request.cr.close()
        request._cr = None
        return dispatch.poll(dbname, channels, last, options)

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
        
    @http.route('/p2p/online/<int:remote>', type='http', auth="user", website=True)
    def online_request(self,remote, **kw):
        db = request.db
        self_id = request.uid
        remote_user = http.request.env['res.users'].browse(remote)
        return http.request.render('p2p.webrtc', {
            'self_id':self_id,
            'remote_id':remote,
            'remote_name':remote_user.name,
            'cur_db':db
        })

        
#     @http.route('/p2p/course/answer/<int:id>', type='http', auth="user", website=True)
#     def do_exercise(self,id, **kw):
#         return werkzeug.utils.redirect('/p2p/static/lib/block/index.html#%d' % id)
#         answer = http.request.env['p2p.learning.answer'].browse(id)
#          
#         category = answer.exercise_id.lesson_id.course_id.category_id.name
#         if category == 'Block':
#             template = 'p2p.exercise_block'
#         else:
#             template = 'p2p.exercise_c'
#          
#         return http.request.render(template, {
#             'content': answer.content,
#             })

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
