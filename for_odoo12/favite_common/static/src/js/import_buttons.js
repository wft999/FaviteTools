odoo.define('favite_common.import_buttons', function (require) {
"use strict";

var KanbanController = require('web.KanbanController');
var KanbanView = require('web.KanbanView');
var ListController = require('web.ListController');
var ListView = require('web.ListView');


// Mixins that enable the 'Import' feature
var ImportViewMixin = {
    /**
     * @override
     */
    init: function (viewInfo, params) {
    	this.controllerParams.faviteImportEnabled = 'favite_import_enabled' in params ? params.import_enabled : false;
//    	this.controllerParams.importPadEnabled = 'import_pad_enabled' in params ? params.import_pad_enabled : false;
//    	this.controllerParams.importBifEnabled = 'import_bif_enabled' in params ? params.import_bif_enabled : false;

    },
};

var ImportControllerMixin = {
    /**
     * @override
     */
    init: function (parent, model, renderer, params) {
    	this.faviteImportEnabled = params.faviteImportEnabled;
//        this.importPadEnabled = params.importPadEnabled;
//        this.importBifEnabled = params.importBifEnabled;
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Adds an event listener on the import button.
     *
     * @private
     */
    _bindImport: function () {
        if (!this.$buttons) {
            return;
        }
        var self = this;
        this.$buttons.on('click', '.o_button_import', function () {
            var state = self.model.get(self.handle, {raw: true});
            self.do_action({
                type: 'ir.actions.client',
                tag: 'favite_common.import',
                params: {
                    model: self.modelName,
                    context: state.getContext(),
                }
            }, {
                on_reverse_breadcrumb: self.reload.bind(self),
            });
        });
    }
};

// Activate 'Import' feature on List views
ListView.include({
    init: function () {
        this._super.apply(this, arguments);
        ImportViewMixin.init.apply(this, arguments);
    },
});

ListController.include({
    init: function () {
        this._super.apply(this, arguments);
        ImportControllerMixin.init.apply(this, arguments);
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Extends the renderButtons function of ListView by adding an event listener
     * on the import button.
     *
     * @override
     */
    renderButtons: function () {
        this._super.apply(this, arguments); // Sets this.$buttons
        ImportControllerMixin._bindImport.call(this);
    }
});

// Activate 'Import' feature on Kanban views
KanbanView.include({
    init: function () {
        this._super.apply(this, arguments);
        ImportViewMixin.init.apply(this, arguments);
    },
});

KanbanController.include({
    init: function () {
        this._super.apply(this, arguments);
        ImportControllerMixin.init.apply(this, arguments);
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Extends the renderButtons function of ListView by adding an event listener
     * on the import button.
     *
     * @override
     */
    renderButtons: function () {
        this._super.apply(this, arguments); // Sets this.$buttons
        ImportControllerMixin._bindImport.call(this);
    }
});

});
