# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
import os
import re
import requests
from os.path import join as opj
from _ast import Not
try:
    import configparser as ConfigParser
except ImportError:
    import ConfigParser
    
from odoo import api, fields, models, tools, _
from odoo.http import request
import odoo
from odoo.exceptions import UserError

class IrUiMenu(models.Model):
    _inherit = 'ir.ui.menu'
    
    @api.multi
    def unlink(self,recursion=False):
        # Detach children and promote them to top-level, because it would be unwise to
        # cascade-delete submenus blindly. We also can't use ondelete=set null because
        # that is not supported when _parent_store is used (would silently corrupt it).
        # TODO: ideally we should move them under a generic "Orphans" menu somewhere?
        extra = {'ir.ui.menu.full_list': True}
        direct_children = self.with_context(**extra).search([('parent_id', 'in', self.ids)])
        if(direct_children):
            if(recursion):
                direct_children.unlink(recursion)
            else:   
                direct_children.write({'parent_id': False})

        self.clear_caches()
        return super(IrUiMenu, self).unlink()

class Http(models.AbstractModel):
    _inherit = 'ir.http'

    def webclient_rendering_context(self):
        
        root =  odoo.tools.config['glass_root_path'] 
        if not root or not os.path.isdir(root):
            return super(Http,self).webclient_rendering_context()

        glass={}
        Menu = request.env['ir.ui.menu'].with_context({'ir.ui.menu.full_list': True})
        for dir in os.listdir(root):   

            iniFilePath = os.path.join(root , dir , "PadToolConfig.ini")
            if not os.path.isfile(iniFilePath):
                continue
            
            conf = ConfigParser.RawConfigParser()
            try:
                conf.read([iniFilePath])
                
                gmenu = Menu.sudo().search([('name', '=', dir),('parent_id', '=', self.env.ref('padtool.menu_glass_root').id),], limit=1)
                if(not gmenu.id):
                    gmenu = Menu.sudo().create({'name': dir, 'parent_id': self.env.ref('padtool.menu_glass_root').id,'groups_id':[(6, 0, [self.env.ref('padtool.group_pad_user').id])]})
                glass[dir] = {'id':gmenu.id,'panel':[]}
                
                for sec in conf.sections():
                    if re.match(r"^gsp_\d+$", sec):
                        parent = glass[dir]['id']
                        pmenu = Menu.sudo().search([('name', '=', sec),('parent_id', '=', parent)], limit=1)
                        if(not pmenu.id):
                            action = 'ir.actions.server,%s' % self.env.ref('padtool.ir_actions_server_pad').id
                            pmenu = Menu.sudo().create({'name': sec, 'parent_id': parent,'action':action,'groups_id':[(6, 0, [self.env.ref('padtool.group_pad_user').id])]})           
                        glass[dir]['panel'].append(sec) 
                                    
            except IOError:
                pass
            except ConfigParser.NoSectionError:
                pass
                          
        menus = Menu.search([('parent_id', '=', self.env.ref('padtool.menu_glass_root').id)])
        for menu in menus:
            submenus = Menu.search([('parent_id', '=', menu.id)])    
            for submenu in submenus:
                if (menu.name not in glass) or submenu.name not in glass[menu.name]['panel']:
                    submenu.unlink(True)
                    
            if(menu.name not in glass):
                menu.unlink(True)
                
        res = super(Http,self).webclient_rendering_context()
        if len(res['menu_data']['children']) and len(res['menu_data']['children'][0]['children']) > 1:
            res['menu_data']['children'][0]['children'][1]['children'] = sorted(res['menu_data']['children'][0]['children'][1]['children'],key=lambda k: k['name'])
        
        return res

