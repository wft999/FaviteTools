# -*- coding: utf-8 -*-
import logging
import os       
import json
from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools,_
from PIL import Image
from io import BytesIO
import base64
from ctypes import *

_logger = logging.getLogger(__name__)
class Pad(models.Model):
    _name = 'favite_bif.pad'   
    _inherit = ['favite_common.geometry']
    
    @api.model  
    def _default_geo(self):
        gmd = self.env['favite_gmd.gmd'].browse(self._context['default_gmd_id'])
        panel = self.env['favite_bif.panel'].browse(self._context['default_src_panel_id'])
        
        geo = {
        "mark":{"objs":[]},
        "submark":{"objs":[],"no_add":True},
        "regular":{"objs":[]},
        "unregular":{"objs":[]},
        
        "frame":{"objs":[],"no_add":True},
        "region":{"objs":[],"no_add":True,"readonly":True},
        "filterregion":{"objs":[]},
        
        "glass":gmd.geo['glass'],
        "panel":{"readonly":True,'objs':[]}
        }
        
        for b in gmd.geo['block']['objs']:
            for p in b['panels']:
                if p['name'] == panel.name:
                    geo['panel']['objs'].append(p)
        
        return geo
        

    geo = fields.Jsonb(string = "geometry value",default=_default_geo)   
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade')
    src_panel_id = fields.Many2one('favite_bif.panel',ondelete='cascade',domain="[('gmd_id', '=', gmd_id)]") 
    
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    mainMark = fields.Binary(attachment=True)
    subMark = fields.Binary(attachment=True)
    
    @api.one
    @api.depends('geo')
    def _compute_attachment(self):
        self.mainMark_attachment_id = self.env['ir.attachment'].search([('res_field', '=', 'mainMark'),('res_id', '=', self.id), ('res_model', '=', 'favite_bif.pad')], limit=1)
        self.subMark_attachment_id = self.env['ir.attachment'].search([('res_field', '=', 'subMark'),('res_id', '=', self.id), ('res_model', '=', 'favite_bif.pad')], limit=1)
        
    mainMark_attachment_id = fields.Many2one('ir.attachment', compute='_compute_attachment', ondelete='restrict', readonly=True)
    subMark_attachment_id = fields.Many2one('ir.attachment', compute='_compute_attachment', ondelete='restrict', readonly=True)
    
    @api.model
    def _fields_view_get(self, view_id=None, view_type='form', toolbar=False, submenu=False):
        if view_type == 'map' and not view_id:
            view_id = self.env.ref('favite_bif.favite_bif_pad_map').id
            
        res = super(Pad, self)._fields_view_get(view_id=view_id, view_type=view_type, toolbar=toolbar, submenu=submenu)
        return res
    
    @api.multi
    def edit_dialog(self):
        form_view = self.env.ref('favite_bif.favite_bif_pad_map')
        return {
            'name': _('Pad'),
            'res_model': self._name,
            'res_id': self.id,
            'views': [(form_view.id, 'form'),],
            'type': 'ir.actions.act_window',
            'target': 'new'
        }
    
    @api.multi  
    def open_map(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': self.name,
            'res_model': self._name,
            'res_id': self.id,
            'view_id': self.env.ref('favite_bif.favite_bif_pad_map').id,
            'view_type': 'map',
            'view_mode': 'map',
            'target': 'current',
            'flags':{'hasSearchView':False}
            }
        
    @api.multi
    def save_mark(self,pad):

        mark = None
        markWidth = 0
        markHeight = 0
        markStartx = 0
        markList = []

        for obj in pad['objs']:
            height = 0     
            block_list = []
            iInterSectionWidth = 0
            
            if 'blocks' not in obj:
                continue
                
            for b in obj['blocks']:
                if (not 'iInterSectionHeight' in b):
                    continue;
                if iInterSectionWidth == 0:
                    iInterSectionWidth = b['iInterSectionWidth']
                    
                height += b['iInterSectionHeight']
                imgFile = '%s/Image/IP%d/jpegfile/AoiL_IP%d_scan%d_block%d.jpg' % (self.camera_path,b['iIPIndex']+1,b['iIPIndex'],b['iScanIndex'],b['iBlockIndex'])
                try:       
                    im = Image.open(imgFile)
                except Exception as e:
                    im = Image.new('L',(b['iInterSectionWidth'],b['iInterSectionHeight']))
                
                left = b['iInterSectionStartX']
                right = b['iInterSectionStartX'] + b['iInterSectionWidth']
                upper = im.height - (b['iInterSectionStartY'] + b['iInterSectionHeight'])
                lower = im.height - b['iInterSectionStartY']
                im = im.transpose(Image.FLIP_TOP_BOTTOM)
                region = im.crop((left ,upper, right, lower))
                block_list.append(region)
                im.close()
                
            markWidth += iInterSectionWidth       
            markStartx += iInterSectionWidth
            markHeight = height if height > markHeight else markHeight   
            if len(block_list):
                markList.append(block_list)

        if len(markList):
            mark = Image.new('L', (markWidth,markHeight))
            left = 0
            for blocks in markList:
                lower = markHeight
                for region in blocks:
                    upper = lower - region.size[1]
                    right = left+region.size[0]
                    mark.paste(region, (left ,upper, right, lower))
                    
                    lower = markHeight - region.size[1]
                left += blocks[0].size[0]
            
            b = BytesIO()
            mark.save(b, 'BMP')
            mainMark = base64.b64encode(b.getvalue())

        return mainMark
            
    @api.multi
    def write(self, values):
        if 'geo' in values:
            geo = values['geo']
            if geo['mark'].get('modified',False):
                mark = self.save_mark(geo['mark'])
                if mark is not None:
                    values['mainMark'] = mark
                    
            if geo['submark'].get('modified',False):
                mark = self.save_mark(geo['submark'])
                if mark is not None:
                    values['subMark'] = mark
            
        return super(Pad, self).write(values)