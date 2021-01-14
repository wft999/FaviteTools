# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
import datetime
import time
from odoo import api, fields, models
from odoo import tools

from odoo.tools.misc import DEFAULT_SERVER_DATETIME_FORMAT
from odoo.addons.bus.models.bus_presence import AWAY_TIMER
from odoo.addons.bus.models.bus_presence import DISCONNECTION_TIMER

class BusPresence(models.Model):
    _inherit = "bus.presence"
    
    last_webrtc_poll = fields.Datetime('Last webrtc Poll', default=lambda self: fields.Datetime.now())
    
    @api.model
    def update(self, inactivity_period,is_webrtc):
        """ Updates the last_poll and last_presence of the current user
            :param inactivity_period: duration in milliseconds
        """
        presence = self.search([('user_id', '=', self._uid)], limit=1)
        # compute last_presence timestamp
        last_presence = datetime.datetime.now() - datetime.timedelta(milliseconds=inactivity_period)
        values = {
            'last_poll': fields.Datetime.now(),
        }
        if is_webrtc:
            values['last_webrtc_poll'] = values['last_poll']
   
        # update the presence or a create a new one
        if not presence:  # create a new presence for the user
            values['user_id'] = self._uid
            values['last_presence'] = last_presence
            self.create(values)
        else:  # update the last_presence if necessary, and write values
            if presence.last_presence < last_presence:
                values['last_presence'] = last_presence
            # Hide transaction serialization errors, which can be ignored, the presence update is not essential
            with tools.mute_logger('odoo.sql_db'):
                presence.write(values)
        # avoid TransactionRollbackError
        self.env.cr.commit() # TODO : check if still necessary    
    
class ResUsers(models.Model):

    _inherit = "res.users"

    webrtc_status = fields.Char('webrtc Status', compute='_compute_webrtc_status')
    tag_ids = fields.Many2many('slide.channel.tag', string='Tags',domain=lambda self: "[('group_id', '=', %s)]" % self.env.ref('o2o.slide_channel_tag_group_category').id)
    
    @api.constrains('tag_ids')
    def _check_relation(self):
        for rec in self:
            if len(rec.tag_ids) > 0:
                if not rec.has_group('base.group_user'):
                    raise ValidationError("user is denied ")
            
            for tag1 in rec.tag_ids:
                for tag2 in rec.tag_ids:
                    if tag1 == tag2:
                        continue
                    
                    if tag1.check_relation(tag2):
                        raise ValidationError("%s name and %s must be different"%(tag1.name,tag2.name))
                    

    def _compute_webrtc_status(self):
        """ Compute the webrtc_status of the users """
        self.env.cr.execute("""
            SELECT
                user_id as id,
                CASE WHEN age(now() AT TIME ZONE 'UTC', last_webrtc_poll) > interval %s THEN 'idle'
                     ELSE 'busy'
                END as status
            FROM bus_presence
            WHERE user_id IN %s
        """, ("%s seconds" % DISCONNECTION_TIMER, tuple(self.ids)))
        res = dict(((status['id'], status['status']) for status in self.env.cr.dictfetchall()))
        for user in self:
            user.webrtc_status = res.get(user.id, 'offline')
            
                    