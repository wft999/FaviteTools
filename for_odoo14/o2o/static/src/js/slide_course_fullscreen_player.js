odoo.define('o2o.fullscreen', function (require) {
'use strict';

var publicWidget = require('web.public.widget');
var core = require('web.core');
var config = require('web.config');
var QWeb = core.qweb;
var _t = core._t;
var session = require('web.session');

var PlayAUdioButton = publicWidget.Widget.extend({
    events: {
        "click .o_wslides_fs_audio": '_onClickPlayAudio'
    },
     
    init: function (el, slide) {
        var result = this._super.apply(this, arguments);
        this.slide = slide;
        this.synth = window.speechSynthesis;
        return result;
    },
    start: function (){
        var self = this;
        return this._super.apply(this, arguments).then(function() {
        	var voices = self.synth.getVoices();
        	self.voice = _.find(voices,v=>v.lang == 'zh-CN'); 
        });
    },
    
    speak: function(){
    	if (this.synth.speaking) {
            console.error('speechSynthesis.speaking');
            return;
        }
        if (this.slide.description !== '') {
	        var utterThis = new SpeechSynthesisUtterance(this.slide.description);
	        utterThis.onend = function (event) {
	            console.log('SpeechSynthesisUtterance.onend');
	        }
	        utterThis.onerror = function (event) {
	            console.error('SpeechSynthesisUtterance.onerror');
	        }
	        utterThis.voice = this.voice;
	        utterThis.pitch = 0.5;
	        utterThis.rate = 1;
	        this.synth.speak(utterThis);
        }
    },

    _onClickPlayAudio: function (ev) {
        ev.preventDefault();
        if(this.$('.o_wslides_fs_audio input')[0].checked){
        	this.$('.o_wslides_fs_audio input')[0].checked = false;
        	this.synth.cancel();
        }else{
        	this.$('.o_wslides_fs_audio input')[0].checked = true;
        	this.speak();
        }   
    },

    _onChangeSlide: function (currentSlide) {
        this.slide = currentSlide;
        
        if(this.$('.o_wslides_fs_audio input')[0].checked){
            this.speak();
        }

    }

});


var fullscreen = require('website_slides.fullscreen');
fullscreen.include({
	init: function (parent, slides, defaultSlideId, channelData){
		var result = this._super.apply(this, arguments);
		var currentSlide = this.get('slide');
		this.playAUdioButton = new PlayAUdioButton(this, currentSlide);
		
		return result;
    },
    attachTo: function (){
        var defs = [this._super.apply(this, arguments)];
        defs.push(this.playAUdioButton.attachTo(this.$('.o_wslides_slide_fs_header')));
        return $.when.apply($, defs);
    },
    _onChangeSlideRequest: function (ev){
    	this._super.apply(this, arguments);
    	var currentSlide = this.get('slide');
        this.playAUdioButton._onChangeSlide(currentSlide);
    },
});

});




