

odoo.define('zcs_od_smartpos.ReceiptScreen', function (require) {
    'use strict';
    const Registries = require('point_of_sale.Registries');
    const { Printer } = require('point_of_sale.Printer');
    const ReceiptScreen = require('point_of_sale.ReceiptScreen');

    const PrintReceiptScreen = (ReceiptScreen) =>
        class extends ReceiptScreen {

            async _printReceipt() {
                var self = this;
                if (ZCSPrintImage) {
                    const printer = new Printer(null, self.env.pos);
                    const image_64 = await printer.htmlToImg(this.orderReceipt.el.outerHTML);
                    console.log(image_64);
                    var message = JSON.stringify({ 'data': image_64, 'cutter': true });
                    return await ZCSPrintImage.postMessage(message);
                } else {
                    return super._printReceipt();
                }
            }

        }
    Registries.Component.extend(ReceiptScreen, PrintReceiptScreen);
    return PrintReceiptScreen;
});