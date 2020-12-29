odoo.define('p2p.WebClient', function (require) {
    "use strict";

    const core = require('web.core');
    const WebClient = require('web.WebClient');
    var session = require('web.session');

    const _t = core._t;

    WebClient.include({

    	show_application() {
            const shown = this._super(...arguments);
            this.self_channel = session.db+',webrtc,'+session.uid
            //this.call('bus_service', 'onNotification', this, this._onNotification);
            this.call('bus_service', 'addChannel', this.self_channel);
            return shown;
        },
        _displayRequestNotification(remote_channel) {
        	let self = this;
        	this.call('notification', 'notify', {
                title: _t('Accept'),
                message: _t('The page appears to be out of date.'),
                sticky: true,
                onClose: () => {

                },
                buttons: [{
                    text: _t('Accept'),
                    primary: true,
                    click: () => {
                    	self._rpc({route: '/longpolling/send', params: {channel:remote_channel,message:['accept']}},
                    			{shadow : true, timeout: 60000});
                    	self.do_action({
                    		type: "ir.actions.act_url",
                            url: "/p2p/online/accept/"+remote_channel.split(',')[2],
                            target: "new",
                        });
                    }
                },{
                    text: _t('Refuse'),
                    primary: true,
                    click: () => {
                    	self._rpc({route: '/longpolling/send', params: {channel:remote_channel,message:['refuse']}}, 
                    		{shadow : true, timeout: 60000});
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
            		let remote_channel = notif[1][1];
            		this._displayRequestNotification(remote_channel);
            	}
            }
        }
    });
});
