# -*- coding: utf-8 -*-
from odoo import http

class Gmd(http.Controller):
    @http.route('/gmd/hello', auth='user', type='json')
    def hello(self):
        return {'html': '<h1>hello, world</h1>'}
#     @http.route('/gmd/gmd/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/gmd/gmd/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('gmd.listing', {
#             'root': '/gmd/gmd',
#             'objects': http.request.env['gmd.gmd'].search([]),
#         })

#     @http.route('/gmd/gmd/objects/<model("gmd.gmd"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('gmd.object', {
#             'object': obj
#         })