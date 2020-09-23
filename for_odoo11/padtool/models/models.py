# -*- coding: utf-8 -*-

from odoo import models, fields, api,_
from odoo.http import request
import odoo
import json
import os
import re
import math
from PIL import Image
from io import BytesIO
import base64
from ctypes import *

from lxml import etree
from lxml.etree import LxmlError
from lxml.builder import E

from odoo.exceptions import UserError, ValidationError
from suds import null
from odoo.tools import pickle
from _collections import defaultdict

try:
    import configparser as ConfigParser
except ImportError:
    import ConfigParser
import logging   

from . import cfields

_logger = logging.getLogger(__name__) 

PADNAME_PATTERN = '^[a-zA-Z0-9][a-zA-Z0-9_-]+$'

class PadtoolMixIn(models.AbstractModel):
    _name = "padtool.mixin"
    _description = 'Padtool Mixin'
    
    @api.model_cr_context
    def _init_column(self, column_name):
        """ Initialize the value of the given column for existing rows. """
        # get the default value; ideally, we should use default_get(), but it
        # fails due to ir.default not being ready
        field = self._fields[column_name]
        if field.default:
            value = field.default(self)
            value = field.convert_to_cache(value, self, validate=False)
            value = field.convert_to_record(value, self)
            value = field.convert_to_write(value, self)
            value = field.convert_to_column(value, self)
        else:
            ir_defaults = self.env['ir.default'].get_model_defaults(self._name)
            if column_name in ir_defaults:
                value = ir_defaults[column_name]
                value = field.convert_to_cache(value, self, validate=False)
                value = field.convert_to_record(value, self)
                value = field.convert_to_write(value, self)
                value = field.convert_to_column(value, self)
            else:
                value = None
        # Write value if non-NULL, except for booleans for which False means
        # the same as NULL - this saves us an expensive query on large tables.
        necessary = (value is not None) if field.type != 'boolean' else value
        if necessary:
            _logger.debug("Table '%s': setting default value of new column %s to %r",
                          self._table, column_name, value)
            query = 'UPDATE "%s" SET "%s"=%s WHERE "%s" IS NULL' % (
                self._table, column_name, field.column_format, column_name)
            self._cr.execute(query, (value,))
        
class Pad(models.Model):
    _name = 'padtool.pad'
    _order = 'name asc'
    
    _inherit = ['padtool.mixin']
    
    name = fields.Char(required=True)
    glassName = fields.Selection(selection='_get_glassName', string='GlassName',required=True)
    panelName = fields.Char(required=True)
    summary = fields.Text('Summary', translate=True)
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Pad name already exists !"),
    ]
    
    @api.model
    def _get_glassName(self):
        Menu = self.env['ir.ui.menu'].with_context({'ir.ui.menu.full_list': True})
        menus = Menu.sudo().search([('parent_id', '=', self.env.ref('padtool.menu_glass_root').id),])
        return [(m.name, m.name) for m in menus]
    
    @api.onchange('glassName')
    def _onchange_glassName(self):
        if self.glassName:
            Menu = self.env['ir.ui.menu'].with_context({'ir.ui.menu.full_list': True})
            menus = Menu.sudo().search([('parent_id.name', '=', self.glassName),])
            self.panelName = menus[0].name
            
    @api.one
    @api.constrains('glassName', 'panelName')
    def _check_name(self):
        Menu = self.env['ir.ui.menu'].with_context({'ir.ui.menu.full_list': True})
        menus = Menu.sudo().search([('name','=',self.panelName),('parent_id.name', '=', self.glassName),])
        if len(menus) < 1:
            raise ValidationError("GlassName and PanelName must be match")
         
    content = fields.Text()
    curl = fields.Text()
    mainMark = fields.Binary(attachment=True)
    subMark = fields.Binary(attachment=True)

    @api.one
    @api.depends('content')
    def _compute_attachment(self):
        self.mainMark_attachment_id = self.env['ir.attachment'].search([('res_field', '=', 'mainMark'),('res_id', '=', self.id), ('res_model', '=', 'padtool.pad')], limit=1)
        self.subMark_attachment_id = self.env['ir.attachment'].search([('res_field', '=', 'subMark'),('res_id', '=', self.id), ('res_model', '=', 'padtool.pad')], limit=1)
        
    mainMark_attachment_id = fields.Many2one('ir.attachment', compute='_compute_attachment', ondelete='restrict', readonly=True)
    subMark_attachment_id = fields.Many2one('ir.attachment', compute='_compute_attachment', ondelete='restrict', readonly=True)
    
    @api.model
    def load_views(self, views, options=None):
        result = super(Pad, self).load_views(views, options)
        
        spec = self.env['ir.model.fields'].get_scopes(self);
        
        
        if 'form' in result['fields_views'] and result['fields_views']['form']['name'] == 'Pad Parameter':
            root = E.xpath(expr="//sheet", position="inside")
            
            notebook = E.notebook()
            root.append(notebook)
            
            pages = {}
            g1 = {}
            g2 = {}
            
            fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
            for fname, field in sorted(fields_data.items(), key=lambda f: f[1]['x_sequence']):
                if field['state'] != 'manual':
                    continue
                if not fname.startswith('x_'):
                    continue
                
                if 'x_scope' in field and field['x_scope'] is not None:
                    names = field['x_scope'].split('.')
                    if len(names) == 1:
                        names = ['Common','Unnamed']+ names
                    elif len(names) == 2:
                        names = ['Common']+names
                        
                    key1 = names[0]
                    if key1 not in pages:
                        p = E.page(string=names[0])
                        pages[key1] = p
                        notebook.append(p)
                        
                    key2 = names[0] + '.' + names[1]
                    if key2 not in g1:
                        g = E.group(string=names[1])
                        g1[key2] = g
                        pages[key1].append(g)
                        
                    key3 = names[0] + '.' + names[1]  + '.' + names[2]
                    if key3 not in g2:
                        g = E.group(string=names[2])
                        g2[key3] = g
                        g1[key2].append(g)
                        
                    g2[key3].append(E.field(name=fname))
            
            root.append(notebook)
            src = etree.fromstring(result['fields_views']['form']['arch'])
            View = self.env['ir.ui.view']
            dest = View.apply_inheritance_specs(src,root,0)
            result['fields_views']['form']['arch'] = etree.tostring(dest, encoding='unicode')
        
        return result
        
    
    @api.model
    def create(self, vals):
        if not re.match(PADNAME_PATTERN, vals['name']):
            raise ValidationError(_('Invalid pad name. Only alphanumerical characters, underscore, hyphen are allowed.'))
        
        if ('glassName' not in vals):
            menu_id = self.env.context['params']['menu_id']
            menu = self.env['ir.ui.menu'].browse(menu_id)
            parts=[c for c in menu.complete_name.split('/') if c]
            vals['glassName'] = parts[2]
            vals['panelName'] = parts[3]
            
        if ('panelName' not in vals):
            Menu = self.env['ir.ui.menu'].with_context({'ir.ui.menu.full_list': True})
            menus = Menu.sudo().search([('parent_id.name', '=', vals['glassName']),])
            vals['panelName'] = menus[0].name
            
        pad = super(Pad, self).create(vals)
        return pad
    
    @api.multi
    def unlink(self):
        dirs = self.env['padtool.directory'].with_context(active_test=False).search([('model','=','padtool.pad')])
        for dir in dirs:  
            for pad in self:
                if os.path.isfile(os.path.join(dir.name, pad.name+'.pad')):
                    os.remove(os.path.join(dir.name, pad.name+'.pad'))
                if os.path.isfile(os.path.join(dir.name, pad.name+'.cur')):
                    os.remove(os.path.join(dir.name, pad.name+'.cur'))
                if os.path.isfile(os.path.join(dir.name, pad.name,'MainMark.bmp')):
                    os.remove(os.path.join(dir.name, pad.name,'MainMark.bmp'))
                if os.path.isfile(os.path.join(dir.name, pad.name,'SubMark.bmp')):
                    os.remove(os.path.join(dir.name, pad.name,'SubMark.bmp'))
                if os.path.isdir(os.path.join(dir.name, pad.name)):
                    os.rmdir(os.path.join(dir.name, pad.name))
        return super(Pad, self).unlink()
    
    @api.multi
    def copy(self, default=None):
        if default is None:
            default = {}
        if not default.get('name'):
            default['name'] = "%s_copy" % self.name

        return super(Pad, self).copy(default)
    
    @api.multi
    def save_mark(self,pad):
        root =  odoo.tools.config['glass_root_path']
        mainMark = None
        subMark = None
        mainMarkWidth = 0
        subMarkWidth = 0
        mainMarkHeight = 0
        subMarkHeight = 0
        mainMarkStartx = 0
        subMarkStartx = 0    
        mainMarkList = []
        subMarkList = []
        for obj in pad['objs']:
            if obj['padType'] == 'mainMark' and pad.get('isMainMarkModified',False):
                height = 0     
                block_list = []
                iInterSectionWidth = 0
                
                for block in obj['blocks']:
                    if (not 'iInterSectionHeight' in block):
                        continue;
                    if iInterSectionWidth == 0:
                        iInterSectionWidth = block['iInterSectionWidth']
                    
                    height += block['iInterSectionHeight']
                    imgFile = os.path.normcase(root + '/'+ self.glassName+'/JpegFile/IP'+str(block['iIPIndex']+1)+'/'+'AoiL_IP'+str(block['iIPIndex'])+'_scan'+str(block['iScanIndex'])+'_block'+str(block['iBlockIndex'])+'.jpg')
                    with Image.open(imgFile) as im:
                        left = block['iInterSectionStartX']
                        right = block['iInterSectionStartX'] + block['iInterSectionWidth']
                        upper = im.height - (block['iInterSectionStartY'] + block['iInterSectionHeight'])
                        lower = im.height - block['iInterSectionStartY']
                        im = im.transpose(Image.FLIP_TOP_BOTTOM)
                        region = im.crop((left ,upper, right, lower))
                        block_list.append(region)
                
                mainMarkWidth += iInterSectionWidth       
                mainMarkStartx += iInterSectionWidth
                mainMarkHeight = height if height > mainMarkHeight else mainMarkHeight   
                if len(block_list):
                    mainMarkList.append(block_list)
            elif obj['padType'] == 'subMark' and pad.get('isSubMarkModified',False):
                if 'blocks' not in obj:
                    continue
                
                height = 0     
                block_list = []
                iInterSectionWidth = 0
                
                for block in obj['blocks']:
                    if (not 'iInterSectionHeight' in block):
                        continue;
                    if iInterSectionWidth == 0:
                        iInterSectionWidth = block['iInterSectionWidth']
                    
                    height += block['iInterSectionHeight']
                    imgFile = os.path.normcase(root + '/'+ self.glassName+'/JpegFile/IP'+str(block['iIPIndex']+1)+'/'+'AoiL_IP'+str(block['iIPIndex'])+'_scan'+str(block['iScanIndex'])+'_block'+str(block['iBlockIndex'])+'.jpg')
                    with Image.open(imgFile) as im:
                        left = block['iInterSectionStartX']
                        right = block['iInterSectionStartX'] + block['iInterSectionWidth']
                        upper = im.height - (block['iInterSectionStartY'] + block['iInterSectionHeight'])
                        lower = im.height - block['iInterSectionStartY']
                        im = im.transpose(Image.FLIP_TOP_BOTTOM)
                        region = im.crop((left ,upper, right, lower))
                        block_list.append(region)
                        
                subMarkWidth += iInterSectionWidth
                subMarkStartx += iInterSectionWidth
                subMarkHeight = height if height > subMarkHeight else subMarkHeight   
                if len(block_list):
                    subMarkList.append(block_list)
                    
        if len(mainMarkList):
            mark = Image.new('L', (mainMarkWidth,mainMarkHeight))
            left = 0
            for blocks in mainMarkList:
                lower = mainMarkHeight
                for region in blocks:
                    upper = lower - region.size[1]
                    right = left+region.size[0]
                    mark.paste(region, (left ,upper, right, lower))
                    
                    lower = mainMarkHeight - region.size[1]
                left += blocks[0].size[0]
            
            b = BytesIO()
            mark.save(b, 'BMP')
            mainMark = base64.b64encode(b.getvalue())
            
        if len(subMarkList):
            mark = Image.new('L', (subMarkWidth,subMarkHeight))
            left = 0
            for blocks in subMarkList:
                lower = subMarkHeight
                for region in blocks:
                    upper = lower - region.size[1]
                    right = left+region.size[0]
                    mark.paste(region, (left ,upper, right, lower))
                    
                    lower = subMarkHeight - region.size[1]
                left += blocks[0].size[0]

            b = BytesIO()
            mark.save(b, 'BMP')
            subMark = base64.b64encode(b.getvalue())
        
        return (mainMark,subMark)  
            
    @api.multi
    def write(self, values):
        if 'content' in values:
            content = json.loads(values['content'])
            if content.get('isMainMarkModified',False) or content.get('isSubMarkModified',False):
                mainMark,subMark = self.save_mark(content)
                if mainMark is not None:
                    values['mainMark'] = mainMark
                if subMark is not None:
                    values['subMark'] = subMark
            
        return super(Pad, self).write(values)
    
    @api.multi
    def close_dialog(self):
        return {'type': 'ir.actions.act_window_close'}

    @api.multi
    def edit_dialog(self):
        form_view = self.env.ref('padtool.pad_view_form')
        return {
            'name': _('Pad'),
            'res_model': 'padtool.pad',
            'res_id': self.id,
            'views': [(form_view.id, 'form'),],
            'type': 'ir.actions.act_window',
            'target': 'inline'
        }
        
    @api.model
    def open_kanban(self):
        menu_id = self.env.context['params']['menu_id']
        menu = self.env['ir.ui.menu'].browse(menu_id)
        parts=[c for c in menu.complete_name.split('/') if c]
        return {
            'type': 'ir.actions.act_window',
            'name': "Pads",
            'res_model': "padtool.pad",
            'view_mode': 'kanban,form',
            'view_id': False,
            'view_type': 'form',
            'domain': [('glassName', '=', parts[2]), ('panelName', '=', parts[3])],
            'target': 'current',
            'flags':{'import_enabled':False,'import_pad_enabled':True}
            }
        
    @api.model
    def glass_information(self,menu_id):
        if menu_id is None:
            return
        
        menu = request.env['ir.ui.menu'].sudo().browse(int(menu_id))
        parts=[c for c in menu.complete_name.split('/') if c]
        
        _logger.info('cur menu:%s', menu.complete_name)
        
        root =  odoo.tools.config['glass_root_path']
        padConfFile = os.path.normcase(root + '/' + parts[2] + "/PadToolConfig.ini")
        if not os.path.isfile(padConfFile):
            raise UserError("File(%s) doesn't exist" % padConfFile)
    
        padConf = ConfigParser.ConfigParser()
        try:
            padConf.read(padConfFile)
        except Exception as e:
            raise UserError("File(%s) format is not correct" % padConfFile)
        
        mapFile = os.path.normcase(root + '/' + parts[2]  +'/' + padConf['GLASS_INFORMATION']['GLASS_MAP'])
        if not os.path.isfile(mapFile):
            raise UserError("File(%s) doesn't exist" % mapFile)
        
        bifFile = os.path.normcase(root + '/' + parts[2]  +'/' + padConf['GLASS_INFORMATION']['BIF_FILE'])
        if not os.path.isfile(bifFile):
            raise UserError("File(%s) doesn't exist" % bifFile)
        
        bifConf = ConfigParser.RawConfigParser()
        with open(bifFile, 'r') as f:
            bifConf.read_string("[DEFAULT]\r\n" + f.read())
        
        cameraFile = os.path.normcase(root + '/' + parts[2]  +'/' + padConf['GLASS_INFORMATION']['CAMERA_FILE'])
        if not os.path.isfile(cameraFile):
            raise UserError("File(%s) doesn't exist" % cameraFile)
        
        cameraConf = ConfigParser.RawConfigParser()
        with open(cameraFile, 'r') as f:
            cameraConf.read_string("[general]\r\n" + f.read())
            
        globalConf = request.env['res.config.settings'].get_values();
        
        return {
            "cameraConf":cameraConf._sections,
            "bifConf":bifConf._defaults,
            "padConf":padConf._sections,
            "globalConf":globalConf,
            "glassName":parts[2],
        }
        
    @api.model
    def set_panel_information(self,menu_id,panelName,offsetXum,offsetYum):
        if menu_id is None:
            return
        
        menu = request.env['ir.ui.menu'].sudo().browse(int(menu_id))
        parts=[c for c in menu.complete_name.split('/') if c]

        root =  odoo.tools.config['glass_root_path']
        padConfFile = os.path.join(root , parts[2] , "PadToolConfig.ini")
        if not os.path.isfile(padConfFile):
            raise UserError("File(%s) doesn't exist" % padConfFile)
    
        padConf = ConfigParser.ConfigParser()
        try:
            padConf.read(padConfFile)
        except Exception as e:
            raise UserError("File(%s) format is not correct" % padConfFile)   
        
        x = float(padConf._sections[panelName]['panel_center_x']) + offsetXum    
        y = float(padConf._sections[panelName]['panel_center_y']) + offsetYum 
        padConf._sections[panelName]['panel_center_x'] = x
        padConf._sections[panelName]['panel_center_y'] = y
        
        with open(padConfFile,'w') as fp:
            padConf.write(fp)
            
        mapFile = os.path.join(root , parts[2] ,parts[3], padConf[parts[3]]['PANEL_MAP'])
        if not os.path.isfile(mapFile):
            raise UserError("File(%s) doesn't exist" % mapFile)
        
        bifFile = os.path.join(root , parts[2],padConf['GLASS_INFORMATION']['BIF_FILE'])
        if not os.path.isfile(bifFile):
            raise UserError("File(%s) doesn't exist" % bifFile)
        
        bifConf = ConfigParser.RawConfigParser()
        with open(bifFile, 'r') as f:
            bifConf.read_string("[DEFAULT]\r\n" + f.read())
        
        cameraFile = os.path.join(root,parts[2],padConf['GLASS_INFORMATION']['CAMERA_FILE'])
        if not os.path.isfile(cameraFile):
            raise UserError("File(%s) doesn't exist" % cameraFile)
        
        cameraConf = ConfigParser.RawConfigParser()
        with open(cameraFile, 'r') as f:
            cameraConf.read_string("[general]\r\n" + f.read())
            
        gmdConf = None
        if 'GMD_FILE' in padConf['GLASS_INFORMATION']:
            gmdFile = os.path.join(root,parts[2],padConf['GLASS_INFORMATION']['GMD_FILE'])
            if os.path.isfile(gmdFile):
                gmdConf = ConfigParser.ConfigParser()
                with open(gmdFile, 'r') as f:
                    gmdConf.read(gmdFile)
            
        globalConf = request.env['res.config.settings'].get_values();
        return {
            "cameraConf":cameraConf._sections,
            "bifConf":bifConf._defaults,
            "padConf":padConf._sections,
            "glassName":parts[2],
            "panelName": parts[3],
            "globalConf":globalConf,
            "gmdConf":gmdConf and gmdConf._sections
        }
        
    @api.model
    def panel_information(self,menu_id):
        if menu_id is None:
            return
        
        menu = request.env['ir.ui.menu'].sudo().browse(int(menu_id))
        parts=[c for c in menu.complete_name.split('/') if c]
        
        _logger.info('cur menu:%s', menu.complete_name)
        
        root =  odoo.tools.config['glass_root_path']
        padConfFile = os.path.normcase(root + '/' + parts[2] + "/PadToolConfig.ini")
        if not os.path.isfile(padConfFile):
            raise UserError("File(%s) doesn't exist" % padConfFile)
    
        padConf = ConfigParser.ConfigParser()
        try:
            padConf.read(padConfFile)
        except Exception as e:
            raise UserError("File(%s) format is not correct" % padConfFile)
        
        mapFile = os.path.normcase(root + '/' + parts[2]  +'/' +parts[3]+'/'+ padConf[parts[3]]['PANEL_MAP'])
        if not os.path.isfile(mapFile):
            raise UserError("File(%s) doesn't exist" % mapFile)
        
        bifFile = os.path.normcase(root + '/' + parts[2]  +'/' + padConf['GLASS_INFORMATION']['BIF_FILE'])
        if not os.path.isfile(bifFile):
            raise UserError("File(%s) doesn't exist" % bifFile)
        
        bifConf = ConfigParser.RawConfigParser()
        with open(bifFile, 'r') as f:
            bifConf.read_string("[DEFAULT]\r\n" + f.read())
        
        cameraFile = os.path.normcase(root + '/' + parts[2]  +'/' + padConf['GLASS_INFORMATION']['CAMERA_FILE'])
        if not os.path.isfile(cameraFile):
            raise UserError("File(%s) doesn't exist" % cameraFile)
        
        cameraConf = ConfigParser.RawConfigParser()
        with open(cameraFile, 'r') as f:
            cameraConf.read_string("[general]\r\n" + f.read())
            
        gmdConf = None
        if 'GMD_FILE' in padConf['GLASS_INFORMATION']:
            gmdFile = os.path.normcase(root + '/' + parts[2]  +'/' + padConf['GLASS_INFORMATION']['GMD_FILE'])
            if os.path.isfile(gmdFile):
                gmdConf = ConfigParser.ConfigParser()
                with open(gmdFile, 'r') as f:
                    gmdConf.read(gmdFile)
            
        globalConf = request.env['res.config.settings'].get_values();
        return {
            "cameraConf":cameraConf._sections,
            "bifConf":bifConf._defaults,
            "padConf":padConf._sections,
            "glassName":parts[2],
            "panelName": parts[3],
            "globalConf":globalConf,
            "gmdConf":gmdConf and gmdConf._sections
        }
        
    @api.model
    def import_pad(self,file,menu_id):
        written = True
        message = ''

        content = {'objs':[]}
        pad = {'name':file.filename.split('.')[0]}
        
        try:
            menu = self.env['ir.ui.menu'].browse(int(menu_id))
            parts=[c for c in menu.complete_name.split('/') if c]
            pad['glassName'] = parts[2]
            pad['panelName'] = parts[3]
            
            root =  odoo.tools.config['glass_root_path']
            padConfFile = os.path.normcase(root + '/' + parts[2] + "/PadToolConfig.ini")
            if not os.path.isfile(padConfFile):
                raise UserError("File(%s) doesn't exist" % padConfFile)
            padConf = ConfigParser.ConfigParser()
            padConf.read(padConfFile)
            cameraFile = os.path.normcase(root + '/' + parts[2]  +'/' + padConf['GLASS_INFORMATION']['CAMERA_FILE'])
            if not os.path.isfile(cameraFile):
                raise UserError("File(%s) doesn't exist" % cameraFile)
            cameraConf = ConfigParser.RawConfigParser()
            with open(cameraFile, 'r') as f:
                cameraConf.read_string("[general]\r\n" + f.read())
            
                
            padParser = ConfigParser.RawConfigParser()
            padParser.read_string("[DEFAULT]\r\n" + file.read().decode())
            par = padParser._defaults
            
            if 'region_overlap' in par:
                content['region_overlap'] = int(par['region_overlap'])
            content['dPanelCenterX'],content['dPanelCenterY'] = (float(s) for s in par['PanelCenter'.lower()].split(','))

            fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
            for name, field in self._fields.items():
                if not field.manual or not name.startswith('x_'):
                    continue
                
                complete_name = fields_data[name]['complete_name']
                if complete_name.lower() in par:
                    value = par[complete_name.lower()]
                    if name == 'x_GlassToGlassMode' and value == '1':
                        value = '2'
                    pad[name] = field.convert_to_cache(value, self)   
                    if isinstance(pad[name], bool):
                        pad[name] = value == '1' 
                        
            frameLeft0,frameBottom0 = (float(s) for s in par['PadFrame0.postion_topleft'.lower()].split(','))
            frameRight0,frameBottom0 = (float(s) for s in par['PadFrame0.postion_topright'.lower()].split(','))
            frameLeft0,frameTop0 = (float(s) for s in par['PadFrame0.postion_bottomleft'.lower()].split(','))
            frameRight0,frameTop0 = (float(s) for s in par['PadFrame0.postion_bottomright'.lower()].split(','))
            
            frameLeft1,frameBottom1 = (float(s) for s in par['PadFrame1.postion_topleft'.lower()].split(','))
            frameRight1,frameBottom1 = (float(s) for s in par['PadFrame1.postion_topright'.lower()].split(','))
            frameLeft1,frameTop1 = (float(s) for s in par['PadFrame1.postion_bottomleft'.lower()].split(','))
            frameRight1,frameTop1 = (float(s) for s in par['PadFrame1.postion_bottomright'.lower()].split(','))
            
            frameLeft2,frameBottom2 = (float(s) for s in par['PadFrame2.postion_topleft'.lower()].split(','))
            frameRight2,frameBottom2 = (float(s) for s in par['PadFrame2.postion_topright'.lower()].split(','))
            frameLeft2,frameTop2 = (float(s) for s in par['PadFrame2.postion_bottomleft'.lower()].split(','))
            frameRight2,frameTop2 = (float(s) for s in par['PadFrame2.postion_bottomright'.lower()].split(','))
            
            frameLeft3,frameBottom3 = (float(s) for s in par['PadFrame3.postion_topleft'.lower()].split(','))
            frameRight3,frameBottom3 = (float(s) for s in par['PadFrame3.postion_topright'.lower()].split(','))
            frameLeft3,frameTop3 = (float(s) for s in par['PadFrame3.postion_bottomleft'.lower()].split(','))
            frameRight3,frameTop3 = (float(s) for s in par['PadFrame3.postion_bottomright'.lower()].split(','))
            
            innerFrame = {"padType":"frame","points":[{},{}]}
            innerFrame['points'][0]['ux'] = frameRight0 + content['dPanelCenterX']
            innerFrame['points'][0]['uy'] = frameTop1 + content['dPanelCenterY']
            innerFrame['points'][1]['ux'] = frameLeft2 + content['dPanelCenterX']
            innerFrame['points'][1]['uy'] = frameBottom3 + content['dPanelCenterY']
            content['objs'].append(innerFrame)
            
            outrtFrame = {"padType":"frame","points":[{},{}]}
            outrtFrame['points'][0]['ux'] = frameLeft0 + content['dPanelCenterX']
            outrtFrame['points'][0]['uy'] = frameBottom1 + content['dPanelCenterY']
            outrtFrame['points'][1]['ux'] = frameRight1 + content['dPanelCenterX']
            outrtFrame['points'][1]['uy'] = frameTop3 + content['dPanelCenterY']
            content['objs'].append(outrtFrame)
            
            TotalRegionNumber = int(par.get('TotalRegionNumber'.lower(),0))
            for i in range(0, TotalRegionNumber):
                (regionLeft,regionBottom),(regionRight,_),(_1,regionTop),(_2,_3) = ((float(s2) for s2 in s1.split(',')) for s1 in par[('Region%d.region' % i).lower()].split(';'))
                region = {'points':[{},{}],'padType':'region'}
                region['points'][0]['ux'] = regionLeft + content['dPanelCenterX']
                region['points'][0]['uy'] = regionBottom + content['dPanelCenterY']
                region['points'][1]['ux'] = regionRight + content['dPanelCenterX']
                region['points'][1]['uy'] = regionTop + content['dPanelCenterY']
                region['iFrameNo'] = int(par.get(('Region%d.iFrameNo' % i).lower(),0))
                region['period0'] = float(par.get(('Region%d.period0' % i).lower(),0))
                region['period1'] = float(par.get(('Region%d.period1' % i).lower(),0))
                region['angle0'] = float(par.get(('Region%d.angle0' % i).lower(),0))
                region['angle1'] = float(par.get(('Region%d.angle1' % i).lower(),0))
                content['objs'].append(region)
                
            MainMarkNumber = int(par.get('MainMarkNumber'.lower(),0))
            for i in range(0, MainMarkNumber):
                ipindex = int(par[('MainMark%d.ipindex' % i).lower()]) + 1
                scanindex = int(par[('MainMark%d.scanindex' % i).lower()]) + 1
                resolutionx = float(cameraConf['IP%dscantimes%d' % (ipindex,scanindex)]['Camera_X_Res'])
                resolutiony = float(cameraConf['IP%dscantimes%d' % (ipindex,scanindex)]['Camera_Y_Res'])
                sizex,sizey = (int(s)  for s in par[('MainMark%d.size' % i).lower()].split(','))
                sizex *= resolutionx
                sizey *= resolutiony
                posx,posy = (float(s)  for s in par[('MainMark%d.pos' % i).lower()].split(','))
                posx += content['dPanelCenterX']
                posy += content['dPanelCenterY']
                mainMark = {'points':[{},{}],'padType':'mainMark'}
                mainMark['points'][0]['ux'] = posx - sizex/2
                mainMark['points'][0]['uy'] = posy - sizey/2
                mainMark['points'][1]['ux'] = posx + sizex/2
                mainMark['points'][1]['uy'] = posy + sizey/2
                content['objs'].append(mainMark)
            
            SubMarkNumber = int(par.get('SubMarkNumber'.lower(),0))
            for i in range(0, SubMarkNumber):
                ipindex = int(par[('SubMark%d.ipindex' % i).lower()]) + 1
                scanindex = int(par[('SubMark%d.scanindex' % i).lower()]) + 1
                resolutionx = float(cameraConf['IP%dscantimes%d' % (ipindex,scanindex)]['Camera_X_Res'])
                resolutiony = float(cameraConf['IP%dscantimes%d' % (ipindex,scanindex)]['Camera_Y_Res'])
                sizex,sizey = (int(s)  for s in par[('SubMark%d.size' % i).lower()].split(','))
                sizex *= resolutionx
                sizey *= resolutiony
                posx,posy = (float(s)  for s in par[('SubMark%d.pos' % i).lower()].split(','))
                posx += content['dPanelCenterX']
                posy += content['dPanelCenterY']
                subMark = {'points':[{},{}],'padType':'subMark'}
                subMark['iMarkDirectionType'] = int(par[('SubMark%d.horizontal' % i).lower()])
                subMark['points'][0]['ux'] = posx - sizex/2
                subMark['points'][0]['uy'] = posy - sizey/2
                subMark['points'][1]['ux'] = posx + sizex/2
                subMark['points'][1]['uy'] = posy + sizey/2
                content['objs'].append(subMark)    
                
            Pad_Filterpos_Number = int(par.get('Pad_Filterpos_Number'.lower(),0))
            for i in range(0, Pad_Filterpos_Number):
                uninspectZone = {'points':[],'padType':'uninspectZone'} 
                Left,Bottom = (float(s)  for s in par[('Pad.Filterpos%d.BottomLeft' % i).lower()].split(','))
                Right,Top = (float(s)  for s in par[('Pad.Filterpos%d.TopRight' % i).lower()].split(','))
                uninspectZone['points'].append({'ux':Left + content['dPanelCenterX'],'uy':Bottom + content['dPanelCenterY']})
                uninspectZone['points'].append({'ux':Right + content['dPanelCenterX'],'uy':Top + content['dPanelCenterY']})
                content['objs'].append(uninspectZone)  
                 
            Pad_Filter_Number = int(par.get('Pad_Filter_Number'.lower(),0))
            for i in range(0, Pad_Filter_Number):
                uninspectZone = {'points':[],'padType':'uninspectZone'}
                for p in par[('Pad.Filter%d' % i).lower()].split(';'):
                    if p == '':
                        continue
                    x,y = (float(s)  for s in p.split(','))
                    uninspectZone['points'].append({'ux':x + content['dPanelCenterX'],'uy':y + content['dPanelCenterY']})
                content['objs'].append(uninspectZone)
                
            Pad_Inspect_Number = int(par.get('Pad_Inspect_Number'.lower(),0))
            for i in range(0, Pad_Inspect_Number):
                inspectZone = {'points':[],'padType':'inspectZone'}
                xPeriod,yPeriod = (float(s)  for s in par[('Pad.Inspect%d.Period' % i).lower()].split(','))
                inspectZone['periodX'] = xPeriod
                inspectZone['periodY'] = yPeriod
                inspectZone['D1G1'] = int(par[('Pad.Inspect%d.D1G1' % i).lower()])
                
                inspectZone['toleranceX'] = 10
                inspectZone['toleranceY'] = 10
                if ('Pad.Inspect%d.Tolerance' % i).lower() in par:
                    toleranceX,toleranceY = (int(s)  for s in par[('Pad.Inspect%d.Tolerance' % i).lower()].split(','))
                    inspectZone['toleranceX'] = toleranceX
                    inspectZone['toleranceY'] = toleranceY
                
                inspectZone['zone'] = int(par[('Pad.Inspect%d.zone' % i).lower()])
                
                for p in par[('Pad.Inspect%d' % i).lower()].split(';'):
                    if p == '':
                        continue
                    x,y = (float(s)  for s in p.split(','))
                    inspectZone['points'].append({'ux':x + content['dPanelCenterX'],'uy':y + content['dPanelCenterY']})
                content['objs'].append(inspectZone)
                
            Pad_UnRegularInspect_Number = int(par.get('Pad_UnRegularInspect_Number'.lower(),0))
            for i in range(0, Pad_UnRegularInspect_Number):
                unregularInspectZone = {'points':[],'padType':'unregularInspectZone'}
                for p in par[('Pad.UnRegularInspect%d' % i).lower()].split(';'):
                    if p == '':
                        continue
                    x,y = (float(s)  for s in p.split(','))
                    unregularInspectZone['points'].append({'ux':x + content['dPanelCenterX'],'uy':y + content['dPanelCenterY']})
                content['objs'].append(unregularInspectZone)
                    
            pad['content'] = json.dumps(content)
            self.create(pad)
        except Exception as e:
            written = False
            message = str(e)
        return {'success': written,'message':message}
    
    @api.model
    def search_goa(self,glass_name,width,height,strBlocks,strPoints,type):
        try:
            getattr(windll,"AutoPeriod")
        except:
            raise UserError("'auto search' not supported on goa")
        
        root =  odoo.tools.config['glass_root_path']
        blocks = json.loads(strBlocks)
        points = json.loads(strPoints)
         
        dest = Image.new('L', (width,height))   
        left = 0
        top = 0 
        for x in range(len(blocks)):
            for y in range(len(blocks[x])-1,-1,-1):
                b = blocks[x][y]    
                if b is None or b['bHasIntersection'] == False:
                    continue;
                
                try:
                    imgFile = os.path.normcase('%s/%s/JpegFile/IP%d/AoiL_IP%d_scan%d_block%d.jpg' % (root,glass_name,b['iIPIndex']+1,b['iIPIndex'],b['iScanIndex'],b['iBlockIndex']))
                    with Image.open(imgFile) as im:
                        im = im.transpose(Image.FLIP_TOP_BOTTOM)
                        region = im.crop((b['iInterSectionStartX'] ,im.height-(b['iInterSectionStartY']+b['iInterSectionHeight']),b['iInterSectionStartX']+ b['iInterSectionWidth'], im.height-b['iInterSectionStartY']))
                        dest.paste(region, (left,top))
                        if y == 0:
                            left += region.width
                            top = 0
                        else:
                            top += region.height
                except:
                    raise UserError("No such file:%s"% (imgFile))
        
        dest = dest.transpose(Image.FLIP_TOP_BOTTOM)
        pSrcStart = dest.tobytes()
        step = width
        nVertices = len(points['x'])
        aVerticesX = (c_int * nVertices)(*points['x'])
        aVerticesY = (c_int * nVertices)(*points['y'])
        periodX = c_int()
        periodY = c_int()
        periodType = c_int(type)
        pMapStart = create_string_buffer(width*height*3)
        nMapStep = 3*width
        
        with open('d:/src.bmp', 'wb') as f:
            dest.save(f, format="BMP")
            
        with open('d:/src.txt', 'wt') as f:
            f.write("width:%d\n"%width)
            f.write("height:%d\n"%height)
            f.write("step:%d\n"%step)
            f.write("nVertices:%d\n"%nVertices)
            f.write("aVerticesX:%s\n"%strPoints)
        
        
        res = windll.AutoPeriod.GetPeriod(pSrcStart,width,height,step,nVertices,aVerticesX,aVerticesY,byref(periodX),byref(periodY),periodType,pMapStart,nMapStep)
        if res == 1:
            out = Image.frombytes('RGB', (width,height), pMapStart)
            b = BytesIO()
            out.save(b, 'JPEG')
        
            return {
                'result': True,
                "periodX":periodX.value,
                "periodY":periodY.value,
                'map':base64.b64encode(b.getvalue())
            }
        else:
            return {
                'result': False
            }

    @api.model
    def search_pframe(self,strPoints,dResolutionX,dResolutionY):
        try:
            getattr(windll,"AutoPeriod")
        except:
            raise UserError("'auto search' not supported on goa")
        
        points = json.loads(strPoints)

        nVertices1 = len(points['x1'])
        aVerticesX1 = (c_int * nVertices1)(*points['x1'])
        aVerticesY1 = (c_int * nVertices1)(*points['y1'])
        nVertices2 = len(points['x2'])
        aVerticesX2 = (c_int * nVertices2)(*points['x2'])
        aVerticesY2 = (c_int * nVertices2)(*points['y2'])
        
        buf = create_string_buffer(1024*100)
        res = windll.AutoPeriod.SplitPolygonRegion(aVerticesX1,aVerticesY1,nVertices1,aVerticesX2,aVerticesY2,nVertices2,c_double(dResolutionX),c_double(dResolutionY),buf)
        if res == 1:
            b = string_at(buf,1024*100)
            return {
                'result': True,
                "buf":b,
            }
        else:
            return {
                'result': False
            }
            
            
class PublishDirectory(models.Model):
    _name = "padtool.directory"
    _description = "Publich directory of pad"

    name = fields.Char(required=True,string = "directory")
    active = fields.Boolean(string="Active", default=True)
    model = fields.Char(string='Model',required=True,default="padtool.pad")

    _sql_constraints = [
        ('name_uniq', 'unique (name,model)', "Directory already exists !"),
    ]     
    
    @api.multi
    def write(self, vals):
        if 'name' in vals:
            vals['name'] = os.path.normpath(vals['name'])
            if not os.path.exists(vals['name']):
                raise ValidationError(_('Invalid publish directory.'))
            
        return super(PublishDirectory, self).write(vals)

    @api.model
    def create(self, vals):
        vals['name'] = os.path.normpath(vals['name'])
        if not os.path.exists(vals['name']):
            raise ValidationError(_('Invalid publish directory.'))

        dir = super(PublishDirectory, self).create(vals)
        return dir   
    
