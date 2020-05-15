# -*- coding: utf-8 -*-
import logging
import os       

from odoo import models, fields, api, SUPERUSER_ID, sql_db, registry, tools,_
try:
    import configparser as ConfigParser
except ImportError:
    import ConfigParser
    
from odoo.exceptions import UserError, ValidationError

_logger = logging.getLogger(__name__)

class Panel(models.Model):
    _name = 'favite_bif.panel'   
    _inherit = ['favite_common.geometry']
    
    _sql_constraints = [
        ('name_uniq', 'unique (name,bif_id)', "Name already exists !"),
    ]
    
    active = fields.Boolean(default=True)
    
    @api.model
    def _default_geo(self):
        geo = {
        "filter":{"objs":[]},
        }
        return geo
    
    geo = fields.Jsonb(string = "geometry value",default=_default_geo)   
    glass = fields.Jsonb(related='gmd_id.glass', readonly=True)
       
    bif_id = fields.Many2one('favite_bif.bif',ondelete='cascade')  
    gsp_id = fields.Many2one('favite_bif.gsp',ondelete='set null',domain="[('bif_id', '=', bif_id)]")
    
    gmd_id = fields.Many2one('favite_gmd.gmd',related='bif_id.gmd_id')
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    @api.multi
    def get_formview_id(self, access_uid=None):
        return self.env.ref('favite_bif.favite_bif_panel_map').id

class Bif(models.Model):
    _name = 'favite_bif.bif'
    _inherit = ['favite_common.geometry']
    
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Name already exists !"),
    ]
    
    @api.one
    def _inverse_geo(self):
        def _check_region(filter,left,right,bottom,top):
            for pt in f['points']:
                if pt['x'] > right or pt['x'] < left or pt['y'] > top or pt['y'] < bottom:
                    return False
            return True
        
        bif_geo = dict(self.geo)
        
        for p in  bif_geo['panel']['objs']:
            geo = {
                "filter":{"objs":[]},
                }
            
            p1 = p['points'][0]
            p2 = p['points'][1]
            left = min(p1['x'],p2['x'])
            right = max(p1['x'],p2['x'])
            bottom = min(p1['y'],p2['y'])
            top = max(p1['y'],p2['y'])
            for f in bif_geo['panel_filter']['objs']:
                if _check_region(f,left,right,bottom,top):
                    geo['filter']['objs'].append(f)
                    
            panel = self.env['favite_bif.panel'].sudo().search([('name','=',p['name']),('bif_id','=',self.id)])
            panel.write({'geo':geo})

    @api.one
    @api.depends('gmd_id','gmd_id.geo','panel_ids.geo')
    def _compute_geo(self):
        self.geo['mark'] = self.gmd_id.geo['mark']
        self.geo['mark']['readonly'] = True
        self.geo['panel'] = {"objs":[],"readonly":True}
        
        total = self.env['favite_bif.panel'].sudo().search([('bif_id','=',self.id)])
        names = [p['name'] for b in self.gmd_id.geo['block']['objs'] for p in b['panels'] ]
        cur = self.env['favite_bif.panel'].sudo().search([('name','in',names)])
        (total - cur).unlink()
        
        objs = []
        for b in self.gmd_id.geo['block']['objs']:
            for p in b['panels']:
                objs.append(p)
                panel = self.env['favite_bif.panel'].sudo().search([('name','=',p['name']),('bif_id','=',self.id)]);
                if not panel:
                    self.env['favite_bif.panel'].sudo().create({'bif_id': self.id,'name':p['name']})
        self.geo['panel']['objs'] = list(objs)

        self.geo['panel_filter'] = {"objs":[]}
        for panel in self.panel_ids:
            for obj in panel.geo['filter']['objs']:
                filter = obj
                filter['name'] = panel['name']
                self.geo['panel_filter']['objs'].append(filter)
        
    geo = fields.Jsonb(string = "geometry value",compute='_compute_geo',inverse='_inverse_geo')
    glass = fields.Jsonb(related='gmd_id.glass', readonly=True)
    
    camera_path = fields.Selection(related='gmd_id.camera_path', readonly=True)
    camera_ini = fields.Text(related='gmd_id.camera_ini', readonly=True)
    
    gmd_id = fields.Many2one('favite_gmd.gmd',ondelete='cascade', requery=True)
    
    frame_id = fields.Many2one('favite_bif.frame',ondelete='set null')
    mark_id = fields.Many2one('favite_bif.mark',ondelete='set null')
    measure_id = fields.Many2one('favite_bif.measure',ondelete='set null')
    fixpoint_id = fields.Many2one('favite_bif.fixpoint',ondelete='set null')
    lut_id = fields.Many2one('favite_bif.lut',ondelete='set null')
    
    panel_ids = fields.One2many('favite_bif.panel', 'bif_id', string='Panel')
    gsp_ids = fields.One2many('favite_bif.gsp', 'bif_id', string='Gsp')
    
    color = fields.Integer('Color Index', default=0)
 
    _sql_constraints = [
        
    ]    
    
    @api.multi  
    def open_map(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': self.name,
            'res_model': self._name,
            'res_id': self.id,
            'view_id': self.env.ref('favite_bif.favite_bif_bif_map').id,
            'view_type': 'map',
            'view_mode': 'map',
            'target': 'current',
            'flags':{'hasSearchView':False}
            }
    
    @api.multi
    def open_gsp_list(self):
        ctx = dict(
            default_bif_id=self.id,
        )
        return {
            'type': 'ir.actions.act_window',
            'name':'Gsp',
            'res_model': 'favite_bif.gsp',
            'view_mode': 'kanban,form',
            'view_id': False,
            'target': 'current',
            'flags':{'import_enabled':False},
            'domain': [('bif_id', '=', self.id)],
            'context': ctx,
            }

    @api.one
    def export_file(self,directory_ids):
        geo = self._export_geo()
        
        self.gmd_id.export_file(directory_ids)
        
        markNum = len(geo['mark']['objs'])
        strMark = 'mark.number = %d\n' % markNum
        for i in range(0,markNum):
            p1 = geo['mark']['objs'][i]['points'][0]
            p2 = geo['mark']['objs'][i]['points'][1]
            x = (p1['x'] + p2['x'])/2
            y = (p1['y'] + p2['y'])/2
            strMark += 'mark.%d.position = %f,%f\n' % (i,x,y)
            w = abs(p1['x'] - p2['x'])
            h = abs(p1['y'] - p2['y'])
            strMark += 'mark.%d.size = %f,%f\n' % (i,w,h)
        
        gsp_list = []
        panelNum = 0
        strPanel = 'panel.gmd = %s\n' % self.gmd_id.name    
        for p in self.geo['panel']['objs']:
            p1 = p['points'][0]
            p2 = p['points'][1]
            left = min(p1['x'],p2['x'])
            right = max(p1['x'],p2['x'])
            bottom = min(p1['y'],p2['y'])
            top = max(p1['y'],p2['y'])
            strPanel += 'panel.%d.topleft = %f,%f\n' % (panelNum,left,top)
            strPanel += 'panel.%d.topright = %f,%f\n' % (panelNum,right,top)
            strPanel += 'panel.%d.bottomleft = %f,%f\n' % (panelNum,left,bottom)
            strPanel += 'panel.%d.bottomright = %f,%f\n' % (panelNum,right,bottom)
            
            panel = self.env['favite_bif.panel'].sudo().search([('name','=',p['name']),('bif_id','=',self.id)]);
            strPanel += 'panel.%d.name = %s\n' % (panelNum,panel.name)
            if panel.gsp_id:
                strPanel += 'panel.%d.gspname = %s\n' % (panelNum,panel.gsp_id.name)
                if panel.gsp_id not in gsp_list:
                    strPanel += 'panel.%d.gspindex = %d\n' % (panelNum,len(gsp_list))
                    gsp_list.append(panel.gsp_id)
                else:
                    strPanel += 'panel.%d.gspindex = %d\n' % (panelNum,gsp_list.index(panel.gsp_id))
                    
            panelFilterNum = 0
            for f in panel.geo['filter']['objs']:
                p1 = f['points'][0]
                p2 = f['points'][1]
                left = min(p1['x'],p2['x'])
                right = max(p1['x'],p2['x'])
                bottom = min(p1['y'],p2['y'])
                top = max(p1['y'],p2['y'])
                strPanel += 'panel.%d.filter.%d.topleft = %f,%f\n' % (panelNum,panelFilterNum,left,top)
                strPanel += 'panel.%d.filter.%d.topright = %f,%f\n' % (panelNum,panelFilterNum,right,top)
                strPanel += 'panel.%d.filter.%d.bottomleft = %f,%f\n' % (panelNum,panelFilterNum,left,bottom)
                strPanel += 'panel.%d.filter.%d.bottomright = %f,%f\n' % (panelNum,panelFilterNum,right,bottom)
                panelFilterNum = panelFilterNum + 1
            strPanel += 'panel.%d.filternumber = %d\n' % (panelNum,panelFilterNum)
            panelNum = panelNum + 1
        strPanel += 'panel.number = %d\n' % panelNum
        
        gspNum = len(gsp_list)
        strGsp = 'gsp.number = %d\n' % gspNum
        for i in range(0,gspNum):
            if gsp_list[i].pad_id:
                gsp_list[i].pad_id.export_file(directory_ids)
                strGsp += 'gsp.%d.padfile = %s.pad\n' % (i,gsp_list[i].pad_id.name) 
            strGsp += gsp_list[i].export_string(i)
            
        strSubbif = ''
        if self.frame_id:
            strSubbif += 'subbif.frame = %s.frm\n'%self.frame_id.name
            self.frame_id.export_file(directory_ids)
        if self.mark_id:
            strSubbif += 'subbif.mark = %s.mrk\n'%self.mark_id.name
            self.mark_id.export_file(directory_ids)
        if self.measure_id:
            strSubbif += 'subbif.measure = %s.msr\n'%self.measure_id.name
            self.measure_id.export_file(directory_ids)
        if self.fixpoint_id:
            strSubbif += 'subbif.fixpoint = %s.fxp\n'%self.fixpoint_id.name
            self.fixpoint_id.export_file(directory_ids)
        if self.lut_id:
            strSubbif += 'subbif.lut = %s.lut\n'%self.lut_id.name
            self.lut_id.export_file(directory_ids)
        
        strParameter = ''
        fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
        for name, field in self._fields.items():
            if not field.manual or not name.startswith('x_'):
                continue
            elif field.type == 'boolean' or field.type == 'selection':
                strParameter += '%s = %d\n' % (fields_data[name]['complete_name'],self[name])
            else:
                strParameter += '%s = %s\n' % (fields_data[name]['complete_name'],field.convert_to_export(self[name],self))
                
        for d in directory_ids:  
            dir = os.path.join(d.name ,'bif')
            if not os.path.isdir(dir):
                os.makedirs(dir)
            path = os.path.join(dir,self.name+'.bif')
            with open(path, 'w') as f:
                f.write(strParameter)
                f.write(strMark)
                f.write(strPanel)
                f.write(strGsp)
                f.write(strSubbif)
                
    @api.model
    def import_file(self,file):
        written = True
        message = 'Success'
        obj = {'name':file.filename.split('.')[0]}

        try:
            parser = ConfigParser.RawConfigParser()
            parser.read_string("[DEFAULT]\r\n" + file.read().decode())
            par = parser._defaults
            
            if 'panel.gmd' in par:
                name = par['panel.gmd']
                gmd = self.env['favite_gmd.gmd'].sudo().search([('name','=',name)])
                if gmd:
                    obj['gmd_id'] = gmd.id
                else:
                    raise UserError("File(%s) must first be imported!" % par['panel.gmd'])
            else:
                raise UserError("File(%s) must contain gmd!" % file.filename)
            
            if 'subbif.frame' in par:
                name,_ = par['subbif.frame'].split('.')
                model = self.env['favite_bif.frame'].sudo().search([('name','=',name)])
                if model:
                    obj['frame_id'] = model.id
                else:
                    raise UserError("File(%s) must first be imported!" % par['subbif.frame'])
                
            if 'subbif.mark' in par:
                name,_ = par['subbif.mark'].split('.')
                model = self.env['favite_bif.mark'].sudo().search([('name','=',name)])
                if model:
                    obj['mark_id'] = model.id
                else:
                    raise UserError("File(%s) must first be imported!" % par['subbif.mark'])
                
            if 'subbif.measure' in par:
                name,_ = par['subbif.measure'].split('.')
                model = self.env['favite_bif.measure'].sudo().search([('name','=',name)])
                if model:
                    obj['measure_id'] = model.id
                else:
                    raise UserError("File(%s) must first be imported!" % par['subbif.measure'])
                
            if 'subbif.fixpoint' in par:
                name,_ = par['subbif.fixpoint'].split('.')
                model = self.env['favite_bif.fixpoint'].sudo().search([('name','=',name)])
                if model:
                    obj['fixpoint_id'] = model.id
                else:
                    raise UserError("File(%s) must first be imported!" % par['subbif.fixpoint'])
                
            if 'subbif.lut' in par:
                name,_ = par['subbif.lut'].split('.')
                model = self.env['favite_bif.lut'].sudo().search([('name','=',name)])
                if model:
                    obj['lut_id'] = model.id
                else:
                    raise UserError("File(%s) must first be imported!" % par['subbif.lut'])
            
            fields_data = self.env['ir.model.fields']._get_manual_field_data(self._name)
            for name, field in self._fields.items():
                if not field.manual or not name.startswith('x_'):
                    continue
                
                complete_name = fields_data[name]['complete_name']
                if complete_name.lower() in par:
                    value = par[complete_name.lower()]
                    obj[name] = field.convert_to_cache(value, self)   
                    if isinstance(obj[name], bool):
                        obj[name] = value == '1' 
                         
            bif = self.create(obj) 
            
            n = int(par.get('panel.number',0))
            for i in range(0, n):
                name = par['panel.%d.name'%i]
                panel = self.env['favite_bif.panel'].sudo().search([('name','=',name),('bif_id','=',bif.id)]);
                
                gspname = par['panel.%d.gspname'%i]
                gspindex = par['panel.%d.gspindex'%i]
                gsp = self.env['favite_bif.gsp'].sudo().search([('name','=',gspname),('bif_id','=',bif.id)]);
                if not gsp:
                    gsp = self.env['favite_bif.gsp'].sudo().import_string(par,gspname,gspindex,bif,panel)

                geo = {"filter":{"objs":[]},}
                
                m = int(par.get('panel.%d.filternumber'%i,0))
                for j in range(0, m):
                    left,top = (float(s) for s in par['panel.%d.filter.%d.topleft'%(i,j)].split(','))
                    right,bottom = (float(s) for s in par['panel.%d.filter.%d.bottomright'%(i,j)].split(','))
                    o = {'points':[]}
                    o['points'].append({'x':left,'y':top})
                    o['points'].append({'x':right,'y':bottom})
                    geo['filter']['objs'].append(o)
                    
                panel.write({'gsp_id':gsp.id,'geo':geo})

        except Exception as e:
            written = False
            message = str(e)
            raise UserError(message)
        return {'success': written,'message':message} 