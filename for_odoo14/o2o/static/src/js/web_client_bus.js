odoo.define('p2p.WebClient', function (require) {
    "use strict";

    const core = require('web.core');
    const WebClient = require('web.WebClient');
    var session = require('web.session');
    const _t = core._t;
    var CrossTab = require('bus.CrossTab');

    CrossTab.include({
    	_poll: function () {
    		this._super.apply(this, arguments);
    		this.updateOption('is_webrtc',false);
    	}
    });

    WebClient.include({

    	show_application() {
            const shown = this._super(...arguments);
            this.self_channel = session.db+',webrtc,'+session.uid
            this.call('bus_service', 'addChannel', this.self_channel);
            return shown;
        },
        _displayRequestNotification(remote_id,slide_url) {
        	let self = this;
        	this.call('notification', 'notify', {
                title: _t('Request'),
                message: _t('The remote user is requesting online.'),
                sticky: true,
                onClose: () => {

                },
                buttons: [{
                    text: _t('View'),
                    primary: true,
                    click: () => {
                    	self.do_action({
				            'res_model': 'p2p.learning.step',
				            'res_id': step_id,
				            'views': [[false, 'form']],
				            'type': 'ir.actions.act_window',
				            'target': 'main'
				        })
                    }
                }],
            });
        },

        _onNotification(notifications) {
        	const shown = this._super(...arguments);
            for (const notif of notifications) {
            	if(notif[0] !== this.self_channel)
            		continue;
            	if (notif[1][0] === 'request'){
            		this._displayRequestNotification(notif[1][1],notif[1][2]);
            	}
            }
        }
    });
});
