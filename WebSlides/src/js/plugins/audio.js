import {Events as SlideEvents} from '../modules/slide';

/**
 * Video plugin. Video plugin that allows to autoplay videos once the slide gets
 * active.
 */
export default class Mp3 {
  /**
	 * @param {WebSlides}
	 *            wsInstance The WebSlides instance.
	 * @constructor
	 */
  constructor(wsInstance) {
    /**
	 * @type {WebSlides}
	 * @private
	 */
    this.ws_ = wsInstance;

    
    wsInstance.slides.forEach(slide => {
    	slide.el.addEventListener(SlideEvents.ENABLE, Mp3.onSectionEnabled);
    	slide.el.addEventListener(SlideEvents.DISABLE, Mp3.onSectionDisabled);
	});
 }
  

  /**
	 * On Section enable hook. Will play the video.
	 * 
	 * @param {CustomEvent}
	 *            event
	 */
  static onSectionEnabled(event) {
    if (typeof(Audio) !== 'undefined') {
        if (!event.detail.slide.audio) {
      	  event.detail.slide.audio = new Audio();
      	  event.detail.slide.audio.src = 'static/audio/'.concat(event.detail.slide.i+1, '.mp3');
        }
        event.detail.slide.audio.currentTime = 0;
        event.detail.slide.audio.play();
    }
  }

  
  /**
	 * On Section enable hook. Will pause the video.
	 * 
	 * @param {CustomEvent}
	 *            event
	 */
  static onSectionDisabled(event) {
	  event.detail.slide.audio && event.detail.slide.audio.pause();
  }
}
