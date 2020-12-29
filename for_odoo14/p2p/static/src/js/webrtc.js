odoo.define('p2p.webrtc', function (require) {
'use strict';

var time = require('web.time');
var publicWidget = require('web.public.widget');
var session = require('web.session');

publicWidget.registry.ProjectRatingImage = publicWidget.Widget.extend({
    selector: '.o_webrtc',
    template: "survey.survey_breadcrumb_template",
    events: {
        'click a.js_update_line_json': '_onClick',
        'click a.js_add_optional_products': '_onClickOptionalProduct',
        'change .js_quantity': '_onChangeQuantity'
    },

    init: function (parent, options) {
        this._super.apply(this, arguments);
    	
    	this.mediaConstraints = {video: true};
    },
    
    start: function () {
    	let self = this;
    	let def = this._super.apply(this, arguments);
    	let is_request = $('main').data('request');
    	
    	this.video = this.$('.background-video')[0];
    	this.self_channel = $('main').data('db')+',webrtc,'+$('main').data('self');
    	this.remote_channel = $('main').data('db')+',webrtc,'+$('main').data('remote');
    	
    	this.call('bus_service', 'addChannel', this.self_channel);
    	this.call('bus_service', 'startPolling');
    	this.call('bus_service', 'onNotification', this, this._onNotification);
    	
    	
    	this.createPeerConnection();
        if(is_request){
        	let message = ['request',this.self_channel];
			self.send(message);
        }
    	
        return def;
    },
    
    destroy: function() {
    	this.closeVideoCall();
        this._super(...arguments);
    },
    
    createPeerConnection: function() {
    	this.pc = new RTCPeerConnection({
    			iceServers: [{urls: "stun:stun.stunprotocol.org"}]
    		});

    	this.pc.onicecandidate = this.handleICECandidateEvent.bind(this);
    	this.pc.ontrack = this.handleTrackEvent.bind(this);
    	this.pc.onnegotiationneeded = this.handleNegotiationNeededEvent.bind(this);
    	this.pc.onremovetrack = this.handleRemoveTrackEvent.bind(this);
    	this.pc.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent.bind(this);
    	this.pc.onicegatheringstatechange = this.handleICEGatheringStateChangeEvent.bind(this);
    	this.pc.onsignalingstatechange = this.handleSignalingStateChangeEvent.bind(this);
    },
    
    closeVideoCall: function() {
  	  	if (this.pc) {
  	  		this.pc.ontrack = null;
  	  		this.pc.onremovetrack = null;
  	  		this.pc.onremovestream = null;
  	  		this.pc.onicecandidate = null;
  	  		this.pc.oniceconnectionstatechange = null;
  	  		this.pc.onsignalingstatechange = null;
  	  		this.pc.onicegatheringstatechange = null;
  	  		this.pc.onnegotiationneeded = null;
  	  		if (this.video && this.video.srcObject) {
  	  			this.video.srcObject.getTracks().forEach(track => track.stop());
  	  		}
  	  		this.pc.close();
  	  		this.pc = null;
  	  	}
    },
    
    send: function(message){
    	let channel = this.remote_channel;
    	return this._rpc({route: '/longpolling/send', params: {channel,message}}, {shadow : true, timeout: 60000});
    },
    
    handleSignalingStateChangeEvent: function(event) {
    	switch(this.pc.signalingState) {
	    	case "closed":
	    		this.closeVideoCall();
	    		break;
    	}
	},
    	  	
    handleICEGatheringStateChangeEvent: function(event) {
    	// Our sample just logs information to console here,
    	// but you can do whatever you need.
    },
    
    handleICEConnectionStateChangeEvent: function(event) {
    	switch(this.pc.iceConnectionState) {
	    	case "closed":
	    	case "failed":
	    		this.closeVideoCall();
	    		break;
    	}
	},
	
	handleRemoveTrackEvent: function(event) {
		var stream = this.video.srcObject;
		var trackList = stream.getTracks();
		if (trackList.length == 0) {
			this.closeVideoCall();
		}
	},
	
	handleTrackEvent: function(event) {
		this.video.srcObject = event.streams[0];
	},
	
	handleICECandidateEvent: function(e){
		if (!e || !e.candidate) 
			return;
		if (e.candidate) {
			let message = ['candidate',e.candidate];
			this.send(message);
		}
	},
	
	handleNegotiationNeededEvent: function() {
		let self = this;
		this.pc.createOffer().then(function(offer) {
			return self.pc.setLocalDescription(offer);
			}).then(function() {
				let message = ['description',self.pc.localDescription];
				self.send(message);
			}).catch(this.reportError);
	},
	
	handleGetUserMediaError: function (e) {
		switch(e.name) {
	    	case "NotFoundError":
	    		alert("Unable to open your call because no camera and/or microphone were found.");
	    		break;
	    	case "SecurityError":
	    	case "PermissionDeniedError":
	    		// Do nothing; this is the same as the user canceling the call.
	    		break;
	    	default:
	    		alert("Error opening your camera and/or microphone: " + e.message);
	    	break;
		}

		this.closeVideoCall();
	},
	
	handleNewICECandidateMsg: function(candidate) {
		this.pc.addIceCandidate(candidate).catch(this.reportError);
	},
	
	handleVideoOfferMsg: function(desc) {
		let self = this;
		this.pc.setRemoteDescription(desc).then(function () {
			return navigator.mediaDevices.getUserMedia(self.mediaConstraints);
		}).then(function(stream) {
			stream.getTracks().forEach((track) => self.pc.addTrack(track, stream));
			//self.video.srcObject = stream;
		}).then(function() {
			return self.pc.createAnswer();
		}).then(function(answer) {
			return self.pc.setLocalDescription(answer);
		}).then(function() {
			let message = ['description',self.pc.localDescription];
			self.send(message);
		}).catch(self.handleGetUserMediaError);
	},
	
	log_error: function(text) {
		  
	},
	
	reportError: function(errMessage) {
		var time = new Date();
		console.trace("[" + time.toLocaleTimeString() + "] " + `Error ${errMessage.name}: ${errMessage.message}`);
	},
	
	_onNotification: function(notifications) {
		var self = this;
		for (const notif of notifications) {
			if(notif[0] !== this.self_channel)
				continue;
		    if (notif[1][0] === 'description') {
		    	let desc = notif[1][1]
			    if (desc) {
			      if (desc.type === 'offer') {
			    	  self.handleVideoOfferMsg(desc);
			      } else if (desc.type === 'answer') {
			    	  this.pc.setRemoteDescription(desc).catch(error=>{console.error(err)});
			      } else {
			    	  console.log('Unsupported SDP type.');
			      }
			    }
		    }else if (notif[1][0] === 'candidate') {
		    	let candidate = notif[1][1]
			    if (candidate) {
			    	this.handleNewICECandidateMsg(candidate);
			    }
		    }else if (notif[1][0] === 'accept'){
		    	navigator.mediaDevices.getUserMedia(this.mediaConstraints).then(function(stream) {
	    			stream.getTracks().forEach((track) =>self.pc.addTrack(track, stream));
	    		}).catch(this.handleGetUserMediaError);
			}else if (notif[1][0] === 'refuse'){
				this.do_warn(_t('Operation Result'),_t('The search failed!'),false);
			}
		}
	}    
    
});
});


