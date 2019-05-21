# -*- coding: utf-8 -*-
import atexit
import collections
import json
import io
import random
import odoo
from odoo import http
from odoo.http import request
from odoo.tools import misc
from odoo.tools.profiler import profile


class Biftool(http.Controller):
    
    @http.route('/biftool/import_bif', methods=['POST'])
    def import_bif(self, file, menu_id, jsonp='callback'):
        result =  request.env['biftool.bif'].import_bif(file,menu_id)
        return 'window.top.%s(%s)' % (misc.html_escape(jsonp), json.dumps(result))
