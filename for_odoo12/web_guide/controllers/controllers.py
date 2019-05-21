# -*- coding: utf-8 -*-
from odoo import http

# class WebDemo(http.Controller):
#     @http.route('/web_demo/web_demo/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/web_demo/web_demo/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('web_demo.listing', {
#             'root': '/web_demo/web_demo',
#             'objects': http.request.env['web_demo.web_demo'].search([]),
#         })

#     @http.route('/web_demo/web_demo/objects/<model("web_demo.web_demo"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('web_demo.object', {
#             'object': obj
#         })