odoo.define('p2p/static/src/discuss.js', function (require) {
'use strict';

var Widget = require('web.Widget');
const AbstractAction = require('web.AbstractAction');
const { action_registry, qweb } = require('web.core');
var session = require('web.session');
var web_client = require('web.web_client');

const DiscussWidget = AbstractAction.extend({
    template: 'p2p.Discuss',
    hasControlPanel: true,
    // loadControlPanel: true,
    // withSearchBar: true,
    // searchMenuTypes: ['filter', 'favorite'],
    events: {
        'click .o_call': '_onClickCall',
        'click .o_accept': '_onClickAccept'
    },
    /**
	 * @override {web.AbstractAction}
	 * @param {web.ActionManager}
	 *            parent
	 * @param {Object}
	 *            action
	 * @param {Object}
	 *            [action.context]
	 * @param {string}
	 *            [action.context.active_id]
	 * @param {Object}
	 *            [action.params]
	 * @param {string}
	 *            [action.params.default_active_id]
	 * @param {Object}
	 *            [options={}]
	 */
    init(parent, action, options={}) {
        this._super(...arguments);

        // render buttons in control panel
/*
 * this.$buttons = $(qweb.render('p2p.Discuss.DiscussControlButtons'));
 * this.$buttons.find('button').css({ display: 'inline-block' });
 * this.$buttons.on('click', '.o_call', ev => this._onClickCall(ev));
 * this.$buttons.on('click', '.o_accept', ev => this._onClickAccept(ev));
 */

        // control panel attributes
        this.action = action;
        this.actionManager = parent;
        this.options = options;
    },
    

    
    createPeerConnection() {
    	  this.pc = new RTCPeerConnection({
    	      iceServers: [     // Information about ICE servers - Use your own!
    	        {
    	          urls: "stun:stun.stunprotocol.org"
    	        }
    	      ]
    	  });

    	  this.pc.onicecandidate = this.handleICECandidateEvent.bind(this);
    	  this.pc.ontrack = this.handleTrackEvent.bind(this);
    	  this.pc.onnegotiationneeded = this.handleNegotiationNeededEvent.bind(this);
    	  this.pc.onremovetrack = this.handleRemoveTrackEvent.bind(this);
    	  this.pc.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent.bind(this);
    	  this.pc.onicegatheringstatechange = this.handleICEGatheringStateChangeEvent.bind(this);
    	  this.pc.onsignalingstatechange = this.handleSignalingStateChangeEvent.bind(this);
    	},
    	
    	closeVideoCall() {
    		  var remoteVideo = self.$('#remote')[0];
    		  var localVideo = self.$('#self')[0];

    		  if (this.pc) {
    			  this.pc.ontrack = null;
    			  this.pc.onremovetrack = null;
    			  this.pc.onremovestream = null;
    			  this.pc.onicecandidate = null;
    			  this.pc.oniceconnectionstatechange = null;
    			  this.pc.onsignalingstatechange = null;
    			  this.pc.onicegatheringstatechange = null;
    			  this.pc.onnegotiationneeded = null;

    		    if (remoteVideo && remoteVideo.srcObject) {
    		      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
    		    }

    		    if (localVideo && localVideo.srcObject) {
    		      localVideo.srcObject.getTracks().forEach(track => track.stop());
    		    }

    		    this.pc.close();
    		    this.pc = null;
    		  }

    		},
    
    start() {
    	
        this.remote = session.uid == 2?6:2;
    	this.self_channel = session.db+',webrtc,'+session.uid;
    	this.remote_channel = session.db+',webrtc,'+this.remote;
    	this.mediaConstraints = {video: true};
    	
    	this.call('bus_service', 'onNotification', this, this._onNotification);
    	this.call('bus_service', 'addChannel', this.self_channel);
    	
    	this.createPeerConnection();
        
        let self = this;
        this._super(...arguments).then(()=>{
        	self.$('button').css({ display: 'inline-block' });
        });
    },
    /**
	 * @override {web.AbstractAction}
	 */
    destroy() {
    	this.closeVideoCall();
        if (this.$buttons) {
            this.$buttons.off().remove();
        }
        this._super(...arguments);
        web_client.webrtc = null;
    },
    
    send(message){
    	let channel = this.remote_channel;
    	return this._rpc({route: '/longpolling/send', params: {channel,message}}, {shadow : true, timeout: 60000});
    	/*
		 * this._rpc({ model: 'bus.bus', method: 'sendone', args: [channel,
		 * message] })
		 */
    },
    
    

    // --------------------------------------------------------------------------
    // Private
    // --------------------------------------------------------------------------



    // --------------------------------------------------------------------------
    // Handlers
    // --------------------------------------------------------------------------
    handleSignalingStateChangeEvent(event) {
  	  switch(this.pc.signalingState) {
  	    case "closed":
  	      closeVideoCall();
  	      break;
  	  }
  	},
  	
  	handleICEGatheringStateChangeEvent(event) {
  		  // Our sample just logs information to console here,
  		  // but you can do whatever you need.
  		},
  
  handleICEConnectionStateChangeEvent(event) {
  	  switch(this.pc.iceConnectionState) {
  	    case "closed":
  	    case "failed":
  	      this.closeVideoCall();
  	      break;
  	  }
  	},

  handleRemoveTrackEvent(event) {
  	  var stream = this.$('#remote')[0].srcObject;
  	  var trackList = stream.getTracks();
  	 
  	  if (trackList.length == 0) {
  	    this.closeVideoCall();
  	  }
  	},
  handleTrackEvent(event) {
  	let self = this;
  	this.$('#remote')[0].srcObject = event.streams[0];
  },
  
  handleICECandidateEvent(e){
 	 if (!e || !e.candidate) return;
      if (e.candidate) {
     	 let message = ['candidate',e.candidate];
     	 this.send(message);
      }
	},
    handleNegotiationNeededEvent() {
		let self = this;
		this.pc.createOffer().then(function(offer) {
		    return self.pc.setLocalDescription(offer);
		  })
		  .then(function() {
			  	let message = ['description',self.pc.localDescription];
      			self.send(message);
		  })
		  .catch(this.reportError);
	},
	
	log_error(text) {
		  
		},
	
	reportError(errMessage) {
		  var time = new Date();
		  console.trace("[" + time.toLocaleTimeString() + "] " + `Error ${errMessage.name}: ${errMessage.message}`);
		},
	
	handleGetUserMediaError(e) {
		  switch(e.name) {
		    case "NotFoundError":
		      alert("Unable to open your call because no camera and/or microphone" +
		            "were found.");
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
	
    _onClickCall() {
		let self = this;
        
		navigator.mediaDevices.getUserMedia(this.mediaConstraints)
		.then(function(stream) {
			stream.getTracks().forEach((track) =>self.pc.addTrack(track, stream));
			self.$('#self')[0].srcObject = stream;

		})
		.catch(this.handleGetUserMediaError);
		
    },
    _onClickAccept() {

    },
    
    handleNewICECandidateMsg(candidate) {
    	 // var candidate = new RTCIceCandidate(msg.candidate);

    	  this.pc.addIceCandidate(candidate)
    	    .catch(this.reportError);
    	},
    
    handleVideoOfferMsg(desc) {
    	let self = this;
    	  this.pc.setRemoteDescription(desc).then(function () {
    	    return navigator.mediaDevices.getUserMedia(self.mediaConstraints);
    	  })
    	  .then(function(stream) {
    		  stream.getTracks().forEach((track) => self.pc.addTrack(track, stream));
  	        	self.$('#self')[0].srcObject = stream;
    	  })
    	  .then(function() {
    	    return self.pc.createAnswer();
    	  })
    	  .then(function(answer) {
    	    return self.pc.setLocalDescription(answer);
    	  })
    	  .then(function() {
    		  let message = ['description',self.pc.localDescription];
      		self.send(message);
    	  })
    	  .catch(self.handleGetUserMediaError);
    	},
    
    _onNotification(notifications) {
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
        		this._displayAcceptNotification();
        	}else if (notif[1][0] === 'refuse'){
        		this._displayRefuseNotification();
        	}
        }
    }    

});

action_registry.add('p2p.discuss', DiscussWidget);

return DiscussWidget;

});
