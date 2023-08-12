odoo.define('im_od_pax_connector.USBButton', function (require) {
    'use strict';
    const WebSerial = require('im_od_pax_connector.webserial')
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const { posbus } = require('point_of_sale.utils');

    class USBButton extends PosComponent {
        mounted() {
            let button = document.getElementById('pax_usb_selector');
            button.addEventListener('click', async () => {
                var self = this;
                let device;
                try {
                    if (navigator.serial) {
                        device = await navigator.serial.requestPort({
                            filters: [{
                                usbVendorId: self.env.pos.ECRTerminal._DonglePaxUSBID.VID//0x413C //0x2FB8
                            }]
                        });
                    } else if (navigator.usb) {
                        device = await WebSerial.serial.requestPort({
                            filters: [{
                                usbVendorId: self.env.pos.ECRTerminal._DonglePaxUSBID.VID//0x413C //0x2FB8
                            }]
                        });
                    }

                } catch (err) {
                    console.log(err);
                }
                if (device) {
                    self.env.pos.ECRTerminal.openSerialDevice(device, true);
                    /*
                    if(navigator.serial){
                        self.env.pos.ECRTerminal.openSerialDevice(device, true);
                    }else if (navigator.usb){
                        self.env.pos.ECRTerminal.openUSBDevice(device, true);
                    }
                    */

                }
            });
        };
        /*
        async onClick(ev) {
            const order = this.env.pos.get_order();
            const line = order.selected_paymentline;
            if (line.payment_method.use_payment_terminal === 'pax' && this.env.pos.ECRTerminal && !this.env.pos.ECRTerminal.is_selected()) {
                await this.env.pos.ECRTerminal.scan();
            }
        }
        */
        get status() {
            if (this.env && this.env.pos && this.env.pos.ECRTerminal && this.env.pos.ECRTerminal.is_selected()) {
                return true;
            }
            return false;
        }
    }
    USBButton.template = 'USBButton';

    Registries.Component.add(USBButton);

    return USBButton;
});