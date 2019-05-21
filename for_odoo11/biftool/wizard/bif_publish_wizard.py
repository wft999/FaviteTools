# -*- coding: utf-8 -*-

from odoo import api, fields, models
import base64
import json
import os
from odoo.exceptions import UserError, ValidationError

class BifPublishWizard(models.TransientModel):
    _name = 'biftool.bif.publish.wizard'

    @api.model
    def _default_directory(self):
        return self.env['padtool.directory'].search([('active', '=', True),('model','=','biftool.bif')])

    bif_id = fields.Many2one('biftool.bif', string="Bif to Publish", required=True, ondelete='cascade')
    directory_ids = fields.Many2many('padtool.directory', string='Publish Directory', required=True,default=_default_directory,domain=[('model','=','biftool.bif')])

    @api.model
    def default_get(self, fields):
        result = super(BifPublishWizard, self).default_get(fields)
        result.update({
            'bif_id': self.env.context.get('active_id', False),
        })
        return result
    
    @api.multi
    def publish(self):        
        bif = self.bif_id;  

        strParameter = ''
        
        def output(model,prefix='',prefix2=''):
            str = ''
            fields_data = self.env['ir.model.fields']._get_manual_field_data(model._name)
            for fname, fdata in sorted(fields_data.items(), key=lambda f: f[1]['x_sequence']):
                field = model._fields[fname]
                if not field.manual or not fname.startswith('x_'):
                    continue
                if model._name == 'biftool.camera_scan' and  fdata['x_scope'] == 'cellneighbor.check.greyregion':
                    prefix = prefix2
                
                if field.type == 'boolean' or field.type == 'selection':
                    str += '%s%s = %s\n' % (prefix,fdata['complete_name'],model[fname])
                else:
                    str += '%s%s = %s\n' % (prefix,fdata['complete_name'],field.convert_to_export(model[fname],model))
                    
            return str
         
        strParameter += output(bif)   
            
        strParameter += 'auops.config.camera.num = %d\n' % len(bif.camera_ids)
        for i in range(0, len(bif.camera_ids)):
            strParameter += 'auops.config.camera.%d.scan_num = %d\n' % (i, len(bif.camera_ids[i].scan_ids))
            strParameter += output(bif.camera_ids[i],'auops.config.camera.%d.'%i)
            for j in range(0, len(bif.camera_ids[i].scan_ids)):
                strParameter += output(bif.camera_ids[i].scan_ids[j],'auops.config.camera.%d.scan.%d.'%(i,j),'cellneighbor.check.greyregion.camera%d.scan%d.'%(i,j))
            
        strParameter += 'auops.test.review_region_number = %d\n' % len(bif.review_region_ids)
        for i in range(0, len(bif.review_region_ids)):
            strParameter += output(bif.review_region_ids[i],'auops.test.review_region%d.'%i)
            
        strParameter += 'auops.image.save_region_num = %d\n' % len(bif.save_region_ids)
        for i in range(0, len(bif.save_region_ids)):
            strParameter += output(bif.save_region_ids[i],'auops.image.save_region_%d.'%i)
            
        for i in range(0, len(bif.mark_ids)):
            strParameter += output(bif.mark_ids[i],'auops.mark.mark_%d.'%(i+1))
            
        for i in range(0, len(bif.gsp_ids)):
            strParameter += 'auops.global_subpanel_data.gsp_%d.cellneighbor.check.padfile =%s.pad\n'%((i+1),bif.gsp_ids[i].pad_id.name)
            strParameter += output(bif.gsp_ids[i],'auops.global_subpanel_data.gsp_%d.'%(i+1))
            
        for i in range(0, len(bif.subpanel_ids)):
            strParameter += 'auops.subpanel.subpanel_%d.global_subpanel_data = %s\n'%((i+1),bif.subpanel_ids[i].gsp_id.name.lower())
            strParameter += output(bif.subpanel_ids[i],'auops.subpanel.subpanel_%d.'%(i+1))
            

        for dir in self.directory_ids:  
            with open(dir.name +'/'+ bif.name+'.bif', 'w') as f:
                f.write(strParameter)

