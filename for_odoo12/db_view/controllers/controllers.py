# -*- coding: utf-8 -*-
from odoo import http

# class DbView(http.Controller):
#     @http.route('/db_view/db_view/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/db_view/db_view/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('db_view.listing', {
#             'root': '/db_view/db_view',
#             'objects': http.request.env['db_view.db_view'].search([]),
#         })

#     @http.route('/db_view/db_view/objects/<model("db_view.db_view"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('db_view.object', {
#             'object': obj
#         })