# -*- coding: utf-8 -*-

from odoo import api, fields, models
import base64
import json
import os
from odoo.exceptions import UserError, ValidationError


class PadPublishWizard(models.TransientModel):
    _name = 'padtool.pad.publish.wizard'

    @api.model
    def _default_directory(self):
        return self.env['padtool.directory'].search([('active', '=', True),('model','=','padtool.pad')])

    pad_id = fields.Many2one('padtool.pad', string="Pad to Publish", required=True, ondelete='cascade')
    directory_ids = fields.Many2many('padtool.directory', string='Publish Directory', required=True,default=_default_directory,domain=[('model','=','padtool.pad')])

    @api.model
    def default_get(self, fields):
        result = super(PadPublishWizard, self).default_get(fields)
        result.update({
            'pad_id': self.env.context.get('active_id', False),
        })
        return result
    
    @api.multi
    def publish(self):
        if self.pad_id.content is False:
            raise UserError("Pad(%s) doesn't have content" % self.pad_id.name)
        
        pad = self.pad_id;
        content = json.loads(pad.content)     

        strParameter = 'PanelCenter = %f,%f\n' % (content['dPanelCenterX'],content['dPanelCenterY'])
        
        if 'region_overlap' in content:
            strParameter += 'region_overlap = %d\n' % content['region_overlap']
        else:
            content['region_overlap'] = 0
        
        fields_data = self.env['ir.model.fields']._get_manual_field_data(pad._name)
        for name, field in pad._fields.items():
            if not field.manual or not name.startswith('x_'):
                continue
            elif field.type == 'boolean' or field.type == 'selection':
                strParameter += '%s = %d\n' % (fields_data[name]['complete_name'],pad[name])
            else:
                strParameter += '%s = %s\n' % (fields_data[name]['complete_name'],field.convert_to_export(pad[name],pad))
                

        region_id = 0
        strFrame = ''
        strRegion = ''

        strPad_Filterpos = ''
        Pad_Filterpos_Number = 0
        
        strPad_Filter = ''
        Pad_Filter_Number = 0
 
        strPad_Inspect = ''
        Pad_Inspect_Number = 0
        
        strPad_UnRegularInspect = ''
        Pad_UnRegularInspect_Number = 0
   
        innerFrame = None
        outrtFrame = None   
        
        strMainMark = ''
        strSubMark = ''
        mainMarkWidth = 0
        subMarkWidth = 0
        mainMarkHeight = 0
        subMarkHeight = 0
        mainMarkStartx = 0
        subMarkStartx = 0    
        mainMarkNumber = 0
        subMarkNumber = 0

        for obj in content['objs']:
            if obj['padType'] == 'frame':
                if innerFrame == None:
                    innerFrame = obj
                else:
                    if innerFrame['points'][0]['ux'] > obj['points'][0]['ux'] and innerFrame['points'][1]['ux'] < obj['points'][1]['ux']:
                        outrtFrame = obj
                    else:
                        outrtFrame = innerFrame
                        innerFrame = obj
                        
            elif obj['padType'] == 'uninspectZone' and len(obj['points'])==2:
                left1 = min(obj['points'][0]['ux'],obj['points'][1]['ux'])
                right1 = max(obj['points'][0]['ux'],obj['points'][1]['ux'])
                bottom1 = max(obj['points'][0]['uy'],obj['points'][1]['uy'])
                top1 = min(obj['points'][0]['uy'],obj['points'][1]['uy'])
                strPad_Filterpos += 'Pad.Filterpos%d.BottomLeft = %f,%f\n' % (Pad_Filterpos_Number,left1-content['dPanelCenterX'],bottom1-content['dPanelCenterY'])
                strPad_Filterpos += 'Pad.Filterpos%d.BottomRight = %f,%f\n' % (Pad_Filterpos_Number,right1-content['dPanelCenterX'],bottom1-content['dPanelCenterY'])
                strPad_Filterpos += 'Pad.Filterpos%d.TopLeft = %f,%f\n' % (Pad_Filterpos_Number,left1-content['dPanelCenterX'],top1-content['dPanelCenterY'])
                strPad_Filterpos += 'Pad.Filterpos%d.TopRight = %f,%f\n' % (Pad_Filterpos_Number,right1-content['dPanelCenterX'],top1-content['dPanelCenterY'])
                
                Pad_Filterpos_Number += 1
            elif obj['padType'] == 'uninspectZone' and len(obj['points'])>2:
                strPad_Filter += 'Pad.Filter'+str(Pad_Filter_Number)+' = '
                for p in obj['points']:
                    strPad_Filter += str(p['ux']-content['dPanelCenterX'])+','+str(p['uy']-content['dPanelCenterY'])+';'
                strPad_Filter += '\n'        
                Pad_Filter_Number += 1
            elif obj['padType'] == 'inspectZone' and len(obj['points'])>1:
                if len(obj['points']) == 2:
                    obj['points'].append(obj['points'][1])
                    obj['points'].append({'ux':obj['points'][2]['ux'],'uy':obj['points'][0]['uy']})
                    obj['points'][1]={'ux':obj['points'][0]['ux'],'uy':obj['points'][2]['uy']}
                    
                strPad_Inspect += 'Pad.Inspect'+str(Pad_Inspect_Number)+' = '
                for p in obj['points']:
                    strPad_Inspect += str(p['ux']-content['dPanelCenterX'])+','+str(p['uy']-content['dPanelCenterY'])+';'
                strPad_Inspect += '\n' 
                strPad_Inspect += 'Pad.Inspect%d.Period = %f,%f\n' % (Pad_Inspect_Number,obj['periodX'],obj['periodY'])
                strPad_Inspect += 'Pad.Inspect%d.D1G1 = %d\n' % (Pad_Inspect_Number,obj['D1G1'])
                
                strPad_Inspect += 'Pad.Inspect%d.Tolerance = %d,%d\n' % (Pad_Inspect_Number,obj['toleranceX'],obj['toleranceY'])
                strPad_Inspect += 'Pad.Inspect%d.zone = %d\n' % (Pad_Inspect_Number,obj['zone'])
                       
                Pad_Inspect_Number += 1
            elif obj['padType'] == 'unregularInspectZone' and len(obj['points'])>1:
                if len(obj['points']) == 2:
                    obj['points'].append(obj['points'][1])
                    obj['points'].append({'ux':obj['points'][2]['ux'],'uy':obj['points'][0]['uy']})
                    obj['points'][1]={'ux':obj['points'][0]['ux'],'uy':obj['points'][2]['uy']}
                    
                strPad_UnRegularInspect += 'Pad.UnRegularInspect'+str(Pad_UnRegularInspect_Number)+' = '
                for p in obj['points']:
                    strPad_UnRegularInspect += str(p['ux']-content['dPanelCenterX'])+','+str(p['uy']-content['dPanelCenterY'])+';'
                strPad_UnRegularInspect += '\n' 
                       
                Pad_UnRegularInspect_Number += 1
            elif obj['padType'] == 'mainMark':
                if not 'blocks' in obj:
                    raise UserError("Please perform the save operation(panel map) first!")
                
                height = 0     
                iInterSectionWidth = 0
                
                for block in obj['blocks']:
                    if (not 'iInterSectionHeight' in block):
                        continue;
                    if iInterSectionWidth == 0:
                        iInterSectionWidth = block['iInterSectionWidth']
                    
                    height += block['iInterSectionHeight']
                
                mainMarkWidth += iInterSectionWidth       
                strMainMark += 'MainMark'+str(mainMarkNumber)+'.size = '+ str(iInterSectionWidth) +','+str(height)+'\n'
                strMainMark += 'MainMark'+str(mainMarkNumber)+'.startx = '+ str(mainMarkStartx) + '\n'
                strMainMark += 'MainMark'+str(mainMarkNumber)+'.pos = '+str((obj['points'][0]['ux'] + obj['points'][1]['ux'])/2-content['dPanelCenterX'])+','+str((obj['points'][0]['uy']+obj['points'][1]['uy'])/2-content['dPanelCenterY'])+'\n'
                strMainMark += 'MainMark'+str(mainMarkNumber)+'.ipindex = '+str(block['iIPIndex'])+'\n'
                strMainMark += 'MainMark'+str(mainMarkNumber)+'.scanindex = '+str(block['iScanIndex'])+'\n'
                
                mainMarkStartx += iInterSectionWidth
                mainMarkHeight = height if height > mainMarkHeight else mainMarkHeight   
                mainMarkNumber += 1

            elif obj['padType'] == 'subMark':
                if not 'blocks' in obj:
                    raise UserError("Please perform the save operation(panel map) first!")
                
                height = 0     
                iInterSectionWidth = 0
                
                for block in obj['blocks']:
                    if (not 'iInterSectionHeight' in block):
                        continue;
                    if iInterSectionWidth == 0:
                        iInterSectionWidth = block['iInterSectionWidth']
                    
                    height += block['iInterSectionHeight']
                        
                subMarkWidth += iInterSectionWidth
                strSubMark += 'SubMark'+str(subMarkNumber)+'.size = '+ str(iInterSectionWidth) +','+str(height)+'\n'
                strSubMark += 'SubMark'+str(subMarkNumber)+'.startx = '+ str(subMarkStartx) + '\n'
                strSubMark += 'SubMark'+str(subMarkNumber)+'.pos = '+str((obj['points'][0]['ux'] + obj['points'][1]['ux'])/2-content['dPanelCenterX'])+','+str((obj['points'][0]['uy']+obj['points'][1]['uy'])/2-content['dPanelCenterY'])+'\n'
                strSubMark += 'SubMark'+str(subMarkNumber)+'.ipindex = '+str(block['iIPIndex'])+'\n'
                strSubMark += 'SubMark'+str(subMarkNumber)+'.scanindex = '+str(block['iScanIndex'])+'\n'
                strSubMark += 'SubMark'+str(subMarkNumber)+'.horizontal = '+str(obj['iMarkDirectionType'])+'\n'
                
                subMarkStartx += iInterSectionWidth
                subMarkHeight = height if height > subMarkHeight else subMarkHeight   
                subMarkNumber += 1

            elif obj['padType'] == 'region':
                regionLeft = obj['points'][0]['ux'] - content['dPanelCenterX']
                regionBottom = obj['points'][0]['uy'] - content['dPanelCenterY']
                regionRight = obj['points'][1]['ux'] - content['dPanelCenterX']
                regionTop = obj['points'][1]['uy'] - content['dPanelCenterY']
                
                strRegion += 'Region'+str(region_id)+'.region = '+str(regionLeft)+','+str(regionBottom)+';'+str(regionRight)+','+str(regionBottom)+';'+str(regionRight)+','+str(regionTop)+';'+str(regionLeft)+','+str(regionTop)+'\n'
                strRegion += 'Region'+str(region_id)+'.iFrameNo = '+str(obj['iFrameNo'])+'\n'
                region_id = region_id + 1
                
        if innerFrame is not None  and outrtFrame is not None:
            frameLeft0 = outrtFrame['points'][0]['ux']-content['dPanelCenterX']
            frameRight0 = innerFrame['points'][0]['ux']-content['dPanelCenterX']
            frameTop0 = innerFrame['points'][1]['uy']-content['dPanelCenterY'] + content['region_overlap']
            frameBottom0 = innerFrame['points'][0]['uy']-content['dPanelCenterY'] - content['region_overlap']
            strFrame += 'PadFrameNum = 4\n'
            strFrame += 'PadFrame0.iDirection = 0\n'
            strFrame += 'PadFrame0.postion_topleft = '+str(frameLeft0)+','+str(frameBottom0)+'\n'
            strFrame += 'PadFrame0.postion_topright = '+str(frameRight0)+','+str(frameBottom0)+'\n'
            strFrame += 'PadFrame0.postion_bottomleft = '+str(frameLeft0)+','+str(frameTop0)+'\n'
            strFrame += 'PadFrame0.postion_bottomright = '+str(frameRight0)+','+str(frameTop0)+'\n'
            
            frameLeft1 = outrtFrame['points'][0]['ux']-content['dPanelCenterX']
            frameRight1 = outrtFrame['points'][1]['ux']-content['dPanelCenterX']
            frameTop1 = innerFrame['points'][0]['uy']-content['dPanelCenterY']
            frameBottom1 = outrtFrame['points'][0]['uy']-content['dPanelCenterY']
            strFrame += 'PadFrame1.iDirection = 1\n'
            strFrame += 'PadFrame1.postion_topleft = '+str(frameLeft1)+','+str(frameBottom1)+'\n'
            strFrame += 'PadFrame1.postion_topright = '+str(frameRight1)+','+str(frameBottom1)+'\n'
            strFrame += 'PadFrame1.postion_bottomleft = '+str(frameLeft1)+','+str(frameTop1)+'\n'
            strFrame += 'PadFrame1.postion_bottomright = '+str(frameRight1)+','+str(frameTop1)+'\n'
            
            frameLeft2 = innerFrame['points'][1]['ux']-content['dPanelCenterX']
            frameRight2 = outrtFrame['points'][1]['ux']-content['dPanelCenterX']
            frameTop2 = innerFrame['points'][1]['uy']-content['dPanelCenterY'] + content['region_overlap']
            frameBottom2 = innerFrame['points'][0]['uy']-content['dPanelCenterY'] - content['region_overlap']
            strFrame += 'PadFrame2.iDirection = 2\n'
            strFrame += 'PadFrame2.postion_topleft = '+str(frameLeft2)+','+str(frameBottom2)+'\n'
            strFrame += 'PadFrame2.postion_topright = '+str(frameRight2)+','+str(frameBottom2)+'\n'
            strFrame += 'PadFrame2.postion_bottomleft = '+str(frameLeft2)+','+str(frameTop2)+'\n'
            strFrame += 'PadFrame2.postion_bottomright = '+str(frameRight2)+','+str(frameTop2)+'\n'
            
            frameLeft3 = outrtFrame['points'][0]['ux']-content['dPanelCenterX']
            frameRight3 = outrtFrame['points'][1]['ux']-content['dPanelCenterX']
            frameTop3 = outrtFrame['points'][1]['uy']-content['dPanelCenterY']
            frameBottom3 = innerFrame['points'][1]['uy']-content['dPanelCenterY']
            strFrame += 'PadFrame3.iDirection = 3\n'
            strFrame += 'PadFrame3.postion_topleft = '+str(frameLeft3)+','+str(frameBottom3)+'\n'
            strFrame += 'PadFrame3.postion_topright = '+str(frameRight3)+','+str(frameBottom3)+'\n'
            strFrame += 'PadFrame3.postion_bottomleft = '+str(frameLeft3)+','+str(frameTop3)+'\n'
            strFrame += 'PadFrame3.postion_bottomright = '+str(frameRight3)+','+str(frameTop3)+'\n'
 
        if mainMarkNumber > 0:
            strMainMark = 'MainMarkNumber = '+str(mainMarkNumber)+'\n' + strMainMark
            for dir in self.directory_ids:
                if not os.path.exists(dir.name +'/'+ pad.name):
                    os.mkdir(dir.name +'/'+ pad.name)
                with open(dir.name +'/'+ pad.name +'/MainMark.bmp', 'wb') as f:
                    f.write(base64.b64decode(pad.mainMark))
            #mark = Image.new('L', (mainMarkWidth,mainMarkHeight))
            #mark.save(markFile)  
            
        if subMarkNumber > 0:
            strSubMark = 'SubMarkNumber = '+str(subMarkNumber)+'\n' + strSubMark
            for dir in self.directory_ids:
                if not os.path.exists(dir.name +'/'+ pad.name):
                    os.mkdir(dir.name +'/'+ pad.name)
                with open(dir.name +'/'+ pad.name +'/SubMark.bmp', 'wb') as f:
                    f.write(base64.b64decode(pad.subMark))
            
        if Pad_Filterpos_Number > 0:
            strPad_Filterpos = 'Pad_Filterpos_Number = '+str(Pad_Filterpos_Number) +'\n' + strPad_Filterpos   
        if Pad_Filter_Number > 0:
            strPad_Filter = 'Pad_Filter_Number = '+str(Pad_Filter_Number) +'\n'+ strPad_Filter 
        if Pad_Inspect_Number > 0:
            strPad_Inspect = 'Pad_Inspect_Number = '+str(Pad_Inspect_Number) +'\n'+ strPad_Inspect     
        if Pad_UnRegularInspect_Number > 0:
            strPad_UnRegularInspect = 'Pad_UnRegularInspect_Number = '+str(Pad_UnRegularInspect_Number) +'\n'+ strPad_UnRegularInspect 
        if region_id > 0:
            strRegion = 'TotalRegionNumber = '+str(region_id) +'\n'+ strRegion 
        
        for dir in self.directory_ids:  
            with open(dir.name +'/'+ pad.name+'.pad', 'w') as f:
                f.write(strParameter)
                f.write( strFrame )
                f.write( strRegion )
                f.write( strMainMark )
                f.write( strSubMark )
                f.write( strPad_Filterpos )
                f.write( strPad_Filter )
                f.write( strPad_Inspect )
                f.write( strPad_UnRegularInspect )
