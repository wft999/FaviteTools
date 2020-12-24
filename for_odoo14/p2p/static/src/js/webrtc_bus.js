odoo.define('bus.Webrtc', function (require) {
    "use strict";

    const core = require('web.core');
    const WebClient = require('web.WebClient');

    const _t = core._t;

    WebClient.include({

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------
    	webrtc_call(){
    		let channel = [session.db,"webrtc_candidate",7];
    		let message = this.candidate;
    		this._rpc({
                model: 'bus.bus',
                method: 'sendone',
                args: [channel, message],
            })
    	},

    	onicecandidate(candidate){
    		this.candidate = candidate;
    		//signaling.send({candidate});
    	},
    	
    	onnegotiationneeded() {
    		try {
    		    this.pc.setLocalDescription(this.pc.createOffer());
    		    // Send the offer to the other peer.
    		   //signaling.send({desc: this.pc.localDescription});
    		    let channel = [session.db,"webrtc_description",7];
        		let message = this.pc.localDescription;
        		this._rpc({
                    model: 'bus.bus',
                    method: 'sendone',
                    args: [channel, message],
                })
    		} catch (err) {
    		   console.error(err);
    		}
    	},
    		
    	ontrack(event) {
    			  // Don't set srcObject again if it is already set.
    			  //if (remoteView.srcObject) return;
    		self.$('video[id="remote_webrtc"]')[0].srcObject = event.streams[0];
    	},
        /**
         * Assigns handler to bus notification
         *
         * @override
         */
        show_application() {
            const shown = this._super(...arguments);
            this.pc = new RTCPeerConnection({iceServers: [{urls: 'stun:stun.l.google.com:19302'}]});
            this.pc.onicecandidate = this.onicecandidate.bind(this);
            this.pc.onnegotiationneeded = this.onnegotiationneeded.bind(this);
            this.pc.ontrack = this.ontrack.bind(this);
            try {
                // Get local stream, show it in self-view, and add it to be sent.
                navigator.mediaDevices.getUserMedia({audio: false, video: true}).then(stream=>{
                	stream.getTracks().forEach((track) =>this.pc.addTrack(track, stream));
                  
                	//self.$('video[id="self_webrtc"]')[0].srcObject = stream;
                })
                
              } catch (err) {
                console.error(err);
              }

            this.on('webrtc_call', this, this.webrtc_call);
            this.call('bus_service', 'addChannel', 'webrtc_description');
            this.call('bus_service', 'addChannel', 'webrtc_candidate');
            return shown;
        },

        //----------------------------------------------------------------------
        // Private
        //----------------------------------------------------------------------


        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * Reacts to bus's notification
         *
         * @private
         * @param {Array} notifications: list of received notifications
         */
        _onNotification(notifications) {
        	this._super(...arguments);
            for (const notif of notifications) {
                if (notif[0][1] === 'webrtc_description' && notif[0][1] === 7) {
                	try {
                		let desc = notif[1]
                	    if (desc) {
                	      // If you get an offer, you need to reply with an answer.
                	      if (desc.type === 'offer') {
                	        this.pc.setRemoteDescription(desc);
                	        const stream = navigator.mediaDevices.getUserMedia({audio: false, video: true});
                	        stream.getTracks().forEach((track) => this.pc.addTrack(track, stream));
                	        pc.setLocalDescription(this.pc.createAnswer());
                	        //signaling.send({desc: pc.localDescription});
                	        let channel = [session.db,"webrtc_description",3];
                    		let message = this.pc.localDescription;
                    		this._rpc({
                                model: 'bus.bus',
                                method: 'sendone',
                                args: [channel, message],
                            })
                	      } else if (desc.type === 'answer') {
                	        this.pc.setRemoteDescription(desc);
                	      } else {
                	        console.log('Unsupported SDP type.');
                	      }
                	    }
                	  } catch (err) {
                	    console.error(err);
                	  }
                }else if (notif[0][1] === 'webrtc_candidate' && notif[0][1] === 7) {
                	try {
                		let candidate = notif[1]
                	    if (candidate) {
                	      this.pc.addIceCandidate(candidate);
                	    }
                	  } catch (err) {
                	    console.error(err);
                	  }
                }
            }
        }
    });
});
