odoo.define('favite_common.import', function (require) {
"use strict";

var ControlPanelMixin = require('web.ControlPanelMixin');
var core = require('web.core');
var session = require('web.session');
var time = require('web.time');
var Widget = require('web.Widget');
var AbstractAction = require('web.AbstractAction');
var QWeb = core.qweb;
var _t = core._t;
var _lt = core._lt;
var StateMachine = window.StateMachine;

/**
 * Safari does not deal well at all with raw JSON data being
 * returned. As a result, we're going to cheat by using a
 * pseudo-jsonp: instead of getting JSON data in the iframe, we're
 * getting a ``script`` tag which consists of a function call and
 * the returned data (the json dump).
 *
 * The function is an auto-generated name bound to ``window``,
 * which calls back into the callback provided here.
 *
 * @param {Object} form the form element (DOM or jQuery) to use in the call
 * @param {Object} attributes jquery.form attributes object
 * @param {Function} callback function to call with the returned data
 */
function jsonp(form, attributes, callback) {
    attributes = attributes || {};
    var options = {jsonp: _.uniqueId('import_callback_')};
    window[options.jsonp] = function () {
        delete window[options.jsonp];
        callback.apply(null, arguments);
    };
    if ('data' in attributes) {
        _.extend(attributes.data, options);
    } else {
        _.extend(attributes, {data: options});
    }
    _.extend(attributes, {
        dataType: 'script',
    });
    $(form).ajaxSubmit(attributes);
}

var fileSuffixMap = {
		'favite_recipe.recipe':'.rcp',
		'favite_recipe.judge':'.jdg',
		'favite_recipe.filter':'.flt',
		'favite_recipe.mura':'.mra',
		'favite_recipe.decode':'.dco',
		
		'favite_gmd.gmd':'.gmd',
		'favite_bif.bif':'.bif',
		'favite_bif.pad':'.pad',
		'favite_bif.frame':'.frm',
		'favite_bif.mark':'.mrk',
		'favite_bif.measure':'.msr',
		'favite_bif.fixpoint':'.fxp',
		'favite_bif.lut':'.lut',
}

var DataImport = AbstractAction.extend(ControlPanelMixin, {
    template: 'faviteImportView',
    events: {
        'change .oe_import_file': 'loaded_file',
        'click .o_import_import': 'import',
    },
    init: function (parent, action) {
        this._super.apply(this, arguments);
        this.action_manager = parent;
        this.res_model = action.params.model;
        this.parent_context = action.params.context || {};
        // import object id
        this.id = null;
        this.session = session;
        action.display_name = _t('Import a File'); // Displayed in the breadcrumbs
        this.do_not_change_match = false;
        this.file_suffix = fileSuffixMap[this.res_model]
    },
    start: function () {
        var self = this;
        
        this._super();
        self.$('input[name=model_name]').val(this.res_model);
        self.renderButtons();
        var status = {
            //breadcrumbs: self.action_manager.get_breadcrumbs(),
            cp_content: {$buttons: self.$buttons},
        };
        self.update_control_panel(status);
        
    },

    renderButtons: function() {
        var self = this;
        this.$buttons = $(QWeb.render("faviteImportView.buttons", this));
        this.$buttons.filter('.o_import_import').on('click', this.import.bind(this));
        this.$buttons.filter('.o_import_cancel').on('click', function(e) {
            e.preventDefault();
            self.exit();
        });
    },

    //- File & settings change section
    onfile_loaded: function () {
        var file = this.$('.oe_import_file')[0].files[0];
        this.$('.oe_import_file_show').val(file !== undefined && file.name || '');
        this.$buttons.filter('.o_import_button').prop('disabled', false);
        this.$el.removeClass('oe_import_with_file');
    },
    
    handleResult:function(result){
    	if(result.success){
    		this['import_succeeded']();
    	}else{
    		this['import_failed'](result.message);
    	}
    },

    onimporting: function () {
    	this.$buttons.filter('.o_import_button').prop('disabled', true);
        jsonp(this.$el, {
            url: '/favite/import_file'
        }, this.proxy('handleResult'));
    },
    onimported: function () {
        this.exit();
    },
    exit: function () {
    	this.trigger_up('history_back');
/*        this.do_action({
            type: 'ir.actions.client',
            tag: 'history_back'
        });*/
    },
    onresults: function (event, from, to, message) {
        this.$el.addClass('oe_import_error');
        this.$el.addClass('oe_import_with_file');
        this.$('.oe_import_error_report').html(
            QWeb.render('faviteImportView.error', {
            	message
            }));
    },
});
core.action_registry.add('favite_common.import', DataImport);

// FSM-ize DataImport
StateMachine.create({
    target: DataImport.prototype,
    events: [
        { name: 'loaded_file',from: ['none', 'file_loaded', 'results','imported'],to: 'file_loaded' },
        { name: 'import', from: ['file_loaded'], to: 'importing' },
        { name: 'import_succeeded', from: 'importing', to: 'imported'},
        { name: 'import_failed', from: 'importing', to: 'results' }
    ]
});

return {
    DataImport: DataImport,
};

});
