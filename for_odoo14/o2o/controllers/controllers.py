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

class O2o(http.Controller):  
    @http.route('/o2o/exercise/<int:id>', type='http', methods=['GET'],auth="user")
    def get_exercise(self,id, **kw):
        answer = http.request.env['o2o.exercise'].browse(id)
        
        if request.httprequest.method == 'GET':
            response = werkzeug.wrappers.Response()
            response.data = answer.content
            return response

    @http.route('/o2o/exercise/<int:id>', type='json', methods=['PUT'],auth="user")
    def put_exercise(self,id, **kw):
        answer = http.request.env['o2o.exercise'].browse(id)
        
        if request.httprequest.method == 'PUT':
            answer.write({'content':request.httprequest.data})
            
        
    @http.route('/o2o/online/request/<int:remote>', type='http', auth="user", website=True)
    def online_request(self,remote,slide, **kw):
        db = request.db
        self_id = request.uid
        remote_user = http.request.env['res.users'].browse(remote)
        
        channel = '%s,webrtc,%d'%(request._cr.dbname,remote)
        message = ['request',request.uid,slide]
        self.env['bus.bus'].sendone(channel, message)
        
        return http.request.render('o2o.onlinehelp', {
            'self_id':self_id,
            'remote_id':remote,
            'remote_name':remote_user.name,
            'cur_db':db
        })
        
    @http.route('/o2o/online/accept/<int:remote>', type='http', auth="user", website=True)
    def online_accept(self,remote, **kw):
        db = request.db
        self_id = request.uid
        remote_user = http.request.env['res.users'].browse(remote)
        
        channel = '%s,webrtc,%d'%(request._cr.dbname,remote)
        message = ['accept',request.uid]
        self.env['bus.bus'].sendone(channel, message)
        
        return http.request.render('o2o.onlinehelp', {
            'self_id':self_id,
            'remote_id':remote,
            'remote_name':remote_user.name,
            'cur_db':db
        })

