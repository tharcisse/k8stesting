

odoo.define('zcs_od_smartpos.PaymentScreen', function (require) {
    'use strict';

    const Registries = require('point_of_sale.Registries');
    const PaymentScreen = require('point_of_sale.PaymentScreen');

    const MyPaymentScreen = (PaymentScreen) =>
        class extends PaymentScreen {
           
            openCashbox() {
                if (ZCSOpenDrawer) {
                    ZCSOpenDrawer.postMessage();
                } else {
                    super.openCashbox()
                }
            }
        }
    Registries.Component.extend(PaymentScreen, MyPaymentScreen);
    return PaymentScreen;
});