# -*- coding: utf-8 -*-
from odoo import http

# class Tsdb(http.Controller):
#     @http.route('/tsdb/tsdb/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/tsdb/tsdb/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('tsdb.listing', {
#             'root': '/tsdb/tsdb',
#             'objects': http.request.env['tsdb.tsdb'].search([]),
#         })

#     @http.route('/tsdb/tsdb/objects/<model("tsdb.tsdb"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('tsdb.object', {
#             'object': obj
#         })