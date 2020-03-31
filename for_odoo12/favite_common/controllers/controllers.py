# -*- coding: utf-8 -*-
from odoo import http
from odoo.http import request
from odoo.tools import misc
import json

class Favite(http.Controller):
    @http.route('/favite/import_file', methods=['POST'])
    def import_file(self, file, model_name, jsonp='callback'):
        result =  request.env[model_name].import_file(file)
        return 'window.top.%s(%s)' % (misc.html_escape(jsonp), json.dumps(result))