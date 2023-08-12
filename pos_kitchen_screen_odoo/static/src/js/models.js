odoo.define('pos_kitchen_screen_odoo.models', function (require) {

    var models = require('point_of_sale.models');
    const { Gui } = require('point_of_sale.Gui');
    
    var core = require('web.core');
    var _t = core._t;
    
    const superOrder = models.Order.prototype;
    models.Order = models.Order.extend({
        initialize: function (attr, options) {
            superOrder.initialize.call(this, attr, options);
        },
        export_as_JSON: function () {
            const json = superOrder.export_as_JSON.call(this);
            json.order_status = this.order_status;
            return json;
        },
        init_from_JSON: function (json) {
            superOrder.init_from_JSON.apply(this, arguments);
            this.order_status=json.order_status;
        },
        export_for_printing: function () {
            const result = superOrder.export_for_printing.call(this);
            result.order_status = this.order_status;
            return result;
        },
    });
});