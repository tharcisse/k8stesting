odoo.define('im_od_pax_connector.PaymentScreen', function (require) {
    'use strict';
    const { useRef } = owl.hooks;
    const { parse } = require('web.field_utils');
    const PosComponent = require('point_of_sale.PosComponent');
    const { useErrorHandlers, useAsyncLockedMethod } = require('point_of_sale.custom_hooks');
    const NumberBuffer = require('point_of_sale.NumberBuffer');
    const { useListener } = require('web.custom_hooks');
    const Registries = require('point_of_sale.Registries');
    const { onChangeOrder } = require('point_of_sale.custom_hooks');
    const { isConnectionError } = require('point_of_sale.utils');
    const PaymentScreen = require('point_of_sale.PaymentScreen');
    var framework = require('web.framework');


    const myPaymentScreen = (PaymentScreen) =>
        class extends PaymentScreen {
            constructor() {
                super(...arguments);
                useListener('init_device', this._init_device);
                this.terminal_receipt = useRef('terminal_state');
            }

            get paxPaymentLines() {
                var lines = this.paymentLines.filter(x => x.payment_method.use_payment_terminal == 'pax');
                return lines;
            }
            async _init_device({ detail: line }) {
                /*
                var sent = await this.env.pos.init_knetSocket();
                const payment_method = line.payment_method;
                if (sent) {
                    framework.blockUI();
                    while (payment_method.wait_init) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    framework.unblockUI();
                }
                */
                this.render();
            }
            async selectPaymentLine(event) {
                const { cid } = event.detail;
                const line = this.paymentLines.find((line) => line.cid === cid);
               /* if (line.payment_method.use_payment_terminal === 'pax' && this.env.pos.ECRTerminal && !this.env.pos.ECRTerminal.is_selected()) {
                    await this.env.pos.ECRTerminal.scan();
                }*/
                return super.selectPaymentLine(event);
            }
            async _sendPaymentRequest({ detail: line }) {
                // Other payment lines can not be reversed anymore
                this.paymentLines.forEach(function (line) {
                    line.can_be_reversed = false;
                });

                const payment_terminal = line.payment_method.payment_terminal;
                if (line.payment_method.use_payment_terminal !== 'pax') {
                    return super._sendPaymentRequest({ detail: line })
                }
                line.set_payment_status('waiting');
                framework.blockUI();
                const isPaymentSuccessful = await payment_terminal.send_payment_request(line.cid);
                if (isPaymentSuccessful && line.get_payment_status() == 'done') {
                    line.can_be_reversed = payment_terminal.supports_reversals;
                } else if (isPaymentSuccessful && line.get_payment_status() !== 'done') {
                    var thiswait = true;
                    while (thiswait) {
                        if (['retry', 'done', 'cancel'].includes(line.get_payment_status())) thiswait = false;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    if (line.get_payment_status() == 'done') {
                        line.can_be_reversed = payment_terminal.supports_reversals;
                    }
                } else {
                    line.set_payment_status('retry');
                }
                this.to_print = true;
                framework.unblockUI();
                this.render();
                /*
                MAKEUP
                if (line.get_payment_status() != 'done') {
                    if (line.termreceipt) {
                        this._printReceipt();
                    } else {
                        await this.showPopup('ErrorPopup', {
                            title: this.env._t('Cant connect'),
                            body: (line.errorDescription)?line.errorDescription:this.env._t(
                                'Payment device is either off or not configured'
                            ),
                        });
                    }
                } else {
                    this.lockedValidateOrder(false);
                }
                */
                /*
                if (line.payment_method.use_payment_terminal === 'pax' && this.env.pos.ECRTerminal && !this.env.pos.ECRTerminal.is_selected()) {
                    await this.env.pos.ECRTerminal.scan();
                }
                return super._sendPaymentRequest({ detail: line });
                */
            }
            async _sendPaymentReverse({ detail: line }) {
                const payment_terminal = line.payment_method.payment_terminal;
                if (line.payment_method.use_payment_terminal !== 'pax') {
                    return super._sendPaymentRequest({ detail: line })
                }
                line.set_payment_status('waiting');
                framework.blockUI();
                const isReversalSuccessful = await payment_terminal.sendPaymentReverse({ detail: line });
                if (isReversalSuccessful && line.get_payment_status() !== 'reversed') {
                    var thiswait = true;
                    while (thiswait) {
                        if (['retry', 'done', 'cancel'].includes(line.get_payment_status())) thiswait = false;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } 
                framework.unblockUI();
                this.render();
               

                /*
                if (line.payment_method.use_payment_terminal === 'pax' && this.env.pos.ECRTerminal && !this.env.pos.ECRTerminal.is_selected()) {
                    await this.env.pos.ECRTerminal.scan();
                }
                return super._sendPaymentReverse({ detail: line });
                */
            }
            async _sendPaymentCancel({ detail: line }) {
                const payment_terminal = line.payment_method.payment_terminal;
                if (line.payment_method.use_payment_terminal !== 'pax') {
                    return super._sendPaymentCancel({ detail: line })
                }
                line.set_payment_status('waiting');
                framework.blockUI();
                const isReversalSuccessful = await payment_terminal.sendPaymentCancel({ detail: line });
                if (isReversalSuccessful && line.get_payment_status() !== 'cancel') {
                    var thiswait = true;
                    while (thiswait) {
                        if (['retry', 'done', 'cancel'].includes(line.get_payment_status())) thiswait = false;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } 
                framework.unblockUI();
                this.render();
               
                /*
                if (line.payment_method.use_payment_terminal === 'pax' && this.env.pos.ECRTerminal && !this.env.pos.ECRTerminal.is_selected()) {
                    await this.env.pos.ECRTerminal.scan();
                }
                return payment_terminal._sendPaymentCancel({ detail: line });
                */
            }
        };
    Registries.Component.extend(PaymentScreen, myPaymentScreen);
    return PaymentScreen;
});