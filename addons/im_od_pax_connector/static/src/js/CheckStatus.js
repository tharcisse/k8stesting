odoo.define('im_od_pax_connector.CheckStatus', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const { posbus } = require('point_of_sale.utils');

    class CheckStatus extends PosComponent {
        
        
        async onClick(ev) {
            const order = this.env.pos.get_order();
            const line = order.selected_paymentline;
            if (line.payment_method.use_payment_terminal === 'pax' && this.env.pos.ECRTerminal && !this.env.pos.ECRTerminal.is_selected()) {
                await this.env.pos.ECRTerminal.scan();
            }
        }
        
        get status() {
            if (this.env && this.env.pos && this.env.pos.ECRTerminal && this.env.pos.ECRTerminal.is_selected()) {
                return true;
            }
            return false;
        }
    }
    CheckStatus.template = 'CheckStatus';

    Registries.Component.add(CheckStatus);

    return CheckStatus;
});