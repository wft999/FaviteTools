odoo.define('p2p.webrtc', function (require) {
'use strict';

var time = require('web.time');
var publicWidget = require('web.public.widget');
var session = require('web.session');
var CrossTab = require('bus.CrossTab');

CrossTab.include({
	_heartbeat: function () {
		this.updateOption('is_webrtc',true);
		this._super.apply(this, arguments);
		
	}
});

publicWidget.registry.ProjectRatingImage = publicWidget.Widget.extend({
    selector: 'main',
    //template: "survey.survey_breadcrumb_template",
    events: {
        'click button.o_sharing_screen': '_onClickSharingScreen',
    },

    init: function (parent, options) {
        this._super.apply(this, arguments);
    	
    	this.mediaConstraints = {video:false,audio:true};
    },
    
    _onClickSharingScreen: function(){
    	let self = this;
    	navigator.mediaDevices.getDisplayMedia({video:true,audio:false}).then(function(stream) {
    		self.is_sharing_screen = true;
    		self.$('.o_sharing_screen').hide();
			stream.getTracks().forEach((track) =>self.pc.addTrack(track, stream));
			stream.getVideoTracks()[0].addEventListener('ended', () => {
				self.$('.o_sharing_screen').show();
				self.is_sharing_screen = false;
				let message = ['stop_sharing_screen',self.self_channel];
				self.send(message);
			  });
		}).catch(self.handleGetUserMediaError.bind(self));
    },
    
    start: function () {
    	let self = this;
    	let def = this._super.apply(this, arguments);

    	this.is_sharing_screen = false;
    	this.is_receiving_screen = false;
    	this.video = this.$('.background-video')[0];
    	this.audio = this.$('.background-audio')[0];
    	this.self_channel = this.$el.data('db')+',webrtc,'+this.$el.data('self');
    	this.remote_channel = this.$el.data('db')+',webrtc,'+this.$el.data('remote');

    	this.call('bus_service', 'addChannel', this.self_channel);
    	this.call('bus_service', 'onNotification', this, this._onNotification.bind(this));
    	this.$('.o_sharing_screen').hide();

    	this.createPeerConnection();
    	
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
    	//this.pc.onremovestream = this.handleRemoveTrackEvent.bind(this);
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
  	  			this.video.srcObject = null;
  	  		}
  	  		if (this.audio && this.audio.srcObject) {
	  			this.audio.srcObject.getTracks().forEach(track => track.stop());
	  		}
  	  		this.pc.close();
  	  		this.pc = null;
  	  		
  	  		this.$('.o_sharing_screen').hide();
  	  		this.$('.o_avatar').hide();
  	  		this.$('.o_webrtc_staus').show();
  	  		this.$('.o_webrtc_staus').text("disconnect!please close this page!");
  	  		window.close();
  	  	}
    },
    
    send: function(message){
    	let channel = this.remote_channel;
    	return this._rpc({route: '/longpolling/send', params: {channel,message}}, {shadow : true});
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
	    	case "disconnected":
	    		this.closeVideoCall();
	    		break;
    	}
	},
	
	handleRemoveTrackEvent:function(){
		this.is_receiving_screen = false;
		this.$('.o_sharing_screen').show();
		this.$('.o_avatar').show();
		this.$('.o_webrtc_staus').show();
		
		this.audio.srcObject = null;
	},
	
	handleTrackEvent: function(event) {
		
/*		event.track.onunmute = () => {
		    // don't set srcObject again if it is already set.
		    if (remoteView.srcObject) return;
		    remoteView.srcObject = streams[0];
		  };*/
		let self = this;
		if(event.streams[0].getAudioTracks().length){
			this.audio.srcObject = event.streams[0];
			var avatar_src = session.url('/web/image', {
	            model:'res.users',
	            field: 'image_128',
	            id: $('main').data('remote'),
	        });
	        this.$('.o_avatar').attr('src', avatar_src);
	        this.$('.o_webrtc_staus').text(this.$el.data('name'));
	        if(this.is_sharing_screen || this.is_receiving_screen)
	        	this.$('.o_sharing_screen').hide();
	        else
	        	this.$('.o_sharing_screen').show();
		}else{
			this.video.srcObject = event.streams[0];
			event.streams[0].getVideoTracks()[0].addEventListener('ended', self.handleRemoveTrackEvent.bind(self));
			
			this.is_receiving_screen = true;
			this.$('.o_sharing_screen').hide();
			this.$('.o_avatar').hide();
			this.$('.o_webrtc_staus').hide();
		}
		
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
	    		this.closeVideoCall();
	    		break;
	    	case "SecurityError":
	    	case "PermissionDeniedError":
	    		this.closeVideoCall();
	    		break;
	    	case "NotAllowedError":
	    		// Do nothing; this is the same as the user canceling the call.
	    		break;
	    	default:
	    		alert("Error opening your camera and/or microphone: " + e.message);
	    		this.closeVideoCall();
	    		break;
		}

		
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
		}).then(function() {
			return self.pc.createAnswer();
		}).then(function(answer) {
			return self.pc.setLocalDescription(answer);
		}).then(function() {
			let message = ['description',self.pc.localDescription];
			self.send(message);
		}).catch(self.handleGetUserMediaError.bind(self));
	},
	
	log_error: function(text) {
		  
	},
	
	reportError: function(errMessage) {
		var time = new Date();
		var str = "[" + time.toLocaleTimeString() + "] " + `Error ${errMessage.name}: ${errMessage.message}`;
		console.trace(str);
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
			    	  this.pc.setRemoteDescription(desc).catch(error=>{console.error(error)});
			    	  this.$('.o_webrtc_staus').text("connect is succeed");
			      } else {
			    	  console.log('Unsupported SDP type.');
			    	  self.$('.o_webrtc_staus').text('Unsupported SDP type.!');
			      }
			    }
		    }else if (notif[1][0] === 'candidate') {
		    	let candidate = notif[1][1]
			    if (candidate) {
			    	this.handleNewICECandidateMsg(candidate);
			    }
		    }else if (notif[1][0] === 'accept'){
		    	this.$('.o_webrtc_staus').text('The request is accepted!');
		    	navigator.mediaDevices.getUserMedia(this.mediaConstraints).then(function(stream) {
	    			stream.getTracks().forEach((track) =>self.pc.addTrack(track, stream));
	    		}).catch(self.handleGetUserMediaError.bind(this));
			}else if (notif[1][0] === 'cancel'){
				this.$('.o_webrtc_staus').text('The request is canceled!');
			}else if (notif[1][0] === 'stop_sharing_screen'){
	    		self.is_receiving_screen = false;
	    		self.$('.o_avatar').show();
	    		self.$('.o_webrtc_staus').show();
	    		self.$('.o_sharing_screen').show();
	    		
	    		self.video.srcObject=null;
			}
		}
	}    
    
});
});


