odoo.define('web_demo.update_kanban', function (require) {
'use strict';

var core = require('web.core');
var local_storage = require('web.local_storage');
var Dialog = require('web.Dialog');
var KanbanRecord = require('web.KanbanRecord');
var tour = require('web_tour.tour');
var QWeb = core.qweb;
var _t = core._t;

tour.register =  function() {};
tour.play =  function(){    	
		var args = Array.prototype.slice.call(arguments);
        var last_arg = args[args.length - 1];
        var name = args[0];
        if (this.tours[name]) {
        	delete this.tours[name];
        }
        
        var options = args.length === 2 ? {} : args[1];
        var steps = last_arg instanceof Array ? last_arg : [last_arg];
        steps = _.map(steps, function(tip){
				tip.content += '<audio autoplay src="/web/content/' + tip.audio_attachment_id[0] + '?unique=1">Test</audio>';
				return tip;
			});
        
        var tour = {
            name: name,
            steps: steps,
            url: options.url,
            rainbowMan: options.rainbowMan === undefined ? true : !!options.rainbowMan,
            test: options.test,
            wait_for: options.wait_for || $.when(),
        };
        if (options.skip_enabled) {
            tour.skip_link = '<p><span class="o_skip_tour">' + _t('Skip tour') + '</span></p>';
            tour.skip_handler = function (tip) {
                this._deactivate_tip(tip);
                this._consume_tour(name);
            };
        }
        tour.ready = true;
        tour.current_step = 0;
        this.tours[name] = tour;
        
        local_storage.setItem('tour_' + name + '_step', 0);
        this._to_next_step(name, 0);
        this.update(name);
	};
	

KanbanRecord.include({
    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
	 

    /**
     * @override
     * @private
     */
    _openRecord: function () {
        if (this.modelName === 'web_demo.tour' && this.$(".o_tour_kanban_boxes a").length) {
            this.$('.o_tour_kanban_boxes a').first().click();
        } else {
            this._super.apply(this, arguments);
        }
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @override
     * @private
     */
    _onGlobalClick: function (ev) {
    	if (this.modelName === 'web_demo.tour' && $(ev.target).data('type') === 'play') {
			 ev.preventDefault();
			 
			 var self = this;
			 this._rpc({
				 model: 'web_demo.step',
				 method: 'search_read',
				 domain: [['tour_id', '=', this.id]],
				 fields: ['id','trigger','extra_trigger','content','position','width','run','audio_attachment_id'],
			 	})
			 	.then(function(tips){
			 		if(tips.length == 0)
			 			return;
			 		
			 		self._rpc({
                        model: "web_tour.tour",
                        method: 'reset',
                        args: [self.recordData.name],
                    }).then(function(){
    			 		tour.play(self.recordData.name, {skip_enabled: true,}, tips);
                    })
			 		
			 		
			 	});
	      } else {
	    	  this._super.apply(this, arguments);
	     }
	 },
});
});
