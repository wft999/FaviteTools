# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import base64
import logging
import os
import io
import shutil
import tempfile
import zipfile

import odoo
from odoo import api, fields, models, modules, tools, _
from odoo.exceptions import UserError

from odoo.http import request
from decorator import decorator

_logger = logging.getLogger(__name__)

class ModuleUpdateWizard(models.TransientModel):
    _name = "favite.module.update.wizard"
    _description = "Module Update"

    module_id = fields.Many2one('ir.module.module', string="Module", required=True,domain=[('state', 'in', ['installed', 'to upgrade'])])
    data = fields.Binary('File', required=True)
    filename = fields.Char('File Name', required=True)

    @api.multi
    def import_file(self):
        this = self[0]
        tmp = tempfile.mkdtemp()
        try:
            content = base64.decodestring(this.data)
            zipfile.ZipFile(io.BytesIO(content)).extractall(tmp)
            assert os.path.isdir(os.path.join(tmp, self.module_id.name))
            
            module_path = modules.get_module_path(self.module_id.name, downloaded=True, display_warning=False)
            _logger.info('Copy downloaded module `%s` to `%s`', self.module_id.name, module_path)
            shutil.rmtree(module_path)
            shutil.move(os.path.join(tmp, self.module_id.name), module_path)
            
            self.module_id.update_list()
            self._cr.commit()
            odoo.service.server.restart()
            return {
                    'type': 'ir.actions.client',
                    'tag': 'home',
                    'params': {'wait': True},
                }

        except Exception as e:
            _logger.exception('File unsuccessfully imported, due to format mismatch.')
            raise UserError(_('File not imported due to format mismatch or a malformed file. (Valid formats are .zip)\n\nTechnical Details:\n%s') % tools.ustr(e))
        finally:
            shutil.rmtree(tmp)
        
        return True

def assert_log_admin_access(method):
    """Decorator checking that the calling user is an administrator, and logging the call.

    Raises an AccessDenied error if the user does not have administrator privileges, according
    to `user._is_admin()`.
    """
    def check_and_log(method, self, *args, **kwargs):
        user = self.env.user
        origin = request.httprequest.remote_addr if request else 'n/a'
        log_data = (method.__name__, self.sudo().mapped('name'), user.login, user.id, origin)
        if not self.env.user._is_admin():
            _logger.warning('DENY access to module.%s on %s to user %s ID #%s via %s', *log_data)
            raise AccessDenied()
        _logger.info('ALLOW access to module.%s on %s to user %s #%s via %s', *log_data)
        return method(self, *args, **kwargs)
    return decorator(check_and_log, method)
class Module(models.Model):   
    _inherit = "ir.module.module"    
    
    @assert_log_admin_access
    @api.multi
    def button_favite_update_wizard(self):
        """ Launch the wizard to update the given module. """
        return {
            'type': 'ir.actions.act_window',
            'target': 'new',
            'name': _('Select module package to import (.zip file)'),
            'view_mode': 'form',
            'res_model': 'favite.module.update.wizard',
            'context': {'default_module_id': self.id},
        }