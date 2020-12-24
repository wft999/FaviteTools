# -*- coding: utf-8 -*-
from odoo import http

class Scratch(http.Controller):
#     @http.route('/scratch/scratch/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/scratch/scratch/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('scratch.listing', {
#             'root': '/scratch/scratch',
#             'objects': http.request.env['scratch.scratch'].search([]),
#         })

    @http.route(['/scratch/tour/<int:tour_id>'], type='http', auth="public", website=True)
    def play_tour(self, tour_id, access_token=None, report_type=None, download=False, **kw):
        
        tour = http.request.env['scratch.tour'].browse(tour_id)
        values = {
            'tour_name':tour['name'],
            'steps':tour['step_ids'],
            'audios':[s['audio_attachment_id'].id for s in tour['step_ids']]
            }
        return http.request.render("scratch.tour_layout", values)