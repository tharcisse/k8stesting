odoo.define('im_od_pax_connector.TerminalStatusPrint', function (require) {
    'use strict';
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    class TerminalStatusPrint extends PosComponent {
        constructor() {
            super(...arguments);
        }
        get termprint() {
            if (!this.props || !this.props.line) return {};
            return this.props.line.termreceipt;
        }
        get printarray() {
            var rec_array = []

            for (key in this.termprint) {
                rec_array.push([key, this.termprint[key]]);
            }
            return rec_array;
        }
    }
    TerminalStatusPrint.template = 'TerminalStatusPrint';
    Registries.Component.add(TerminalStatusPrint);
    return TerminalStatusPrint;
});