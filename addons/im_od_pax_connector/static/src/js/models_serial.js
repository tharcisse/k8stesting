odoo.define('im_od_pax_connector.models', function (require) {

    var models = require('point_of_sale.models');
    const SerialService = require('im_od_pax_connector.SerialService')
    const WebSerial = require('im_od_pax_connector.webserial')
    const USBService = require('im_od_pax_connector.USBService')
    var Paymentpax = require('im_od_pax_connector.payment');
    const { Gui } = require('point_of_sale.Gui');
    models.register_payment_method('pax', Paymentpax);
    models.load_fields('pos.payment.method', ['print', 'show_details', 'pax_device_brand', 'subtype', 'connection_mode', 'odoows_connector_url']);
    var core = require('web.core');
    var _t = core._t;
    const _super_PosModel = models.PosModel.prototype;


    models.PosModel = models.PosModel.extend({
        after_load_server_data: async function () {
            var self = this;
            return _super_PosModel.after_load_server_data.apply(this, arguments).then(async function () {
                const pax_payment_method = _.find(self.payment_methods, function (payment_method) {
                    return payment_method.use_payment_terminal === 'pax' && self.config.payment_method_ids.includes(payment_method.id) && payment_method.connection_mode === 'websocket';
                })
                if (!pax_payment_method) {
                    return await self.init_paxSerialSocket();
                }
                return await self.init_paxSocket();

            });
        },
        _initPaxSerialSocket: async function (payment_method) {
            var self = this;
            try {
                if (!self.ECRTerminal) {
                    /*
                    if (navigator.serial) {
                        self.ECRTerminal = new SerialService(payment_method.pax_device_brand);
                    } else if (navigator.usb) {
                        self.ECRTerminal = new USBService(payment_method.pax_device_brand);
                    }
                    if (self.ECRTerminal) {
                        await self.ECRTerminal.initialize();
                    }
*/
                    self.ECRTerminal = new SerialService(payment_method.pax_device_brand);
                    if (self.ECRTerminal) {
                        await self.ECRTerminal.initialize();
                    }
                    //await self.ECRTerminal.scan();
                }
            } catch (e) {
                self.ECRTerminal = undefined;
            }

            return true;
        },
        sendSocket: async function (data, retries = 0) {
            var self = this;
            const MAX_RETRIES = 3;
            try {
                self.paxSocket.send(data);

                await new Promise(resolve => setTimeout(resolve, 1000));
                if (retries < MAX_RETRIES) {
                    if (!self.sent_status || !self.sent_status.dataType == 'ack') {
                        return self.sendSocket(data, retries + 1);
                    } else {
                        self.sent_status = {};
                    }
                } else {
                    self.sent_status = {};
                    return false;
                }
                return true;

            }
            catch (error) {
                if (retries < MAX_RETRIES && error.name === "InvalidStateError") {
                    await self.waitForSocketConnection();
                    return self.sendSocket(data, retries + 1);
                } else {
                    console.log(error);
                    return false;
                }
            }
        },

        waitForSocketConnection: function () {
            var self = this;
            return new Promise((resolve, reject) => {
                self.connection_resolvers.push({ resolve, reject });
            });
        },


        _initSocket: function (payment_method) {
            var self = this;
            self.connection_resolvers = [];
            self.sent_status = {};
            try {
                self.paxSocket = new WebSocket(payment_method.odoows_connector_url);
                self.paxSocket.onerror = function (event) {
                    console.log('WEBSOCKET ERROR' + event.data);
                    Gui.showPopup('ErrorPopup', {
                        title: _t('WEBSOCKET'),
                        body: event.data
                    });
                }
                self.paxSocket.onopen = function () {
                    self.connection_resolvers.forEach(r => r.resolve());
                    console.log('Websocket Opened')
                };
                self.paxSocket.onmessage = async (event) => {
                    var data_text = event.data;
                    if (event.data instanceof Blob) {
                        data_text = await new Response(data_text).text();
                    }
                    console.log("INCOMING :" + data_text);
                    var obj = undefined;
                    try {
                        obj = JSON.parse(data_text);
                    } catch (e) {
                        obj = undefined;
                        console.log(e);
                        console.log('Cannot parse OBJ');
                    }
                    try {
                        console.log('OBJ-> :' + obj);
                        if (obj && obj.error || (obj && obj.message && obj.message.error)) {
                            var error = (obj.error) ? obj.error : obj.message.error;
                            console.log(error)
                            const pax_payment_method = _.find(self.payment_methods, function (payment_method) {
                                return payment_method.use_payment_terminal === 'pax' && self.config.payment_method_ids.includes(payment_method.id) && payment_method.connection_mode === 'websocket';
                            })
                            if (pax_payment_method) {
                                pax_payment_method.wait_init = false;
                            }
                            Gui.showPopup('ErrorPopup', {
                                title: _t('WEBSOCKET'),
                                body: error
                            });
                        } else if (obj && obj.dataType !== 'ack') {
                            const pax_payment_method = _.find(self.payment_methods, function (payment_method) {
                                return payment_method.use_payment_terminal === 'pax' && self.config.payment_method_ids.includes(payment_method.id) && payment_method.connection_mode === 'websocket';
                            })
                            if (pax_payment_method) {
                                pax_payment_method.payment_terminal.buffer_json(obj);
                            }
                        } else if (obj && obj.dataType == 'ack') {
                            self.sent_status = obj;
                        }
                    }
                    catch (e) {
                        console.log(e);
                    }
                };
                self.paxSocket.onclose = function () {

                }
            } catch (e) {
                self.paxSocket = undefined;
                console.log('FAILED TO START Websocket ' + e);
                return false
            }
            return true;
        },
        init_paxSocket: function () {
            var self = this;
            const pax_payment_method = _.find(self.payment_methods, function (payment_method) {
                return payment_method.use_payment_terminal === 'pax' && self.config.payment_method_ids.includes(payment_method.id) && payment_method.connection_mode === 'websocket';
            })
            if (!pax_payment_method) return Promise.resolve();
            return self._initSocket(pax_payment_method);

        },
        isJsonString: function (str) {
            try {
                JSON.parse(str);
            } catch (e) {
                return false;
            }
            return true;
        },
        ab2str: function (buf) {
            return String.fromCharCode.apply(null, new Uint16Array(buf));
        },

        str2ab: function (str) {
            var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
            var bufView = new Uint16Array(buf);
            for (var i = 0, strLen = str.length; i < strLen; i++) {
                bufView[i] = str.charCodeAt(i);
            }
            return buf;
        },
        strToUtf8Bytes: function (str) {
            const utf8 = [];
            for (let ii = 0; ii < str.length; ii++) {
                let charCode = str.charCodeAt(ii);
                if (charCode < 0x80) utf8.push(charCode);
                else if (charCode < 0x800) {
                    utf8.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
                } else if (charCode < 0xd800 || charCode >= 0xe000) {
                    utf8.push(0xe0 | (charCode >> 12), 0x80 | ((charCode >> 6) & 0x3f), 0x80 | (charCode & 0x3f));
                } else {
                    ii++;
                    // Surrogate pair:
                    // UTF-16 encodes 0x10000-0x10FFFF by subtracting 0x10000 and
                    // splitting the 20 bits of 0x0-0xFFFFF into two halves
                    charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (str.charCodeAt(ii) & 0x3ff));
                    utf8.push(
                        0xf0 | (charCode >> 18),
                        0x80 | ((charCode >> 12) & 0x3f),
                        0x80 | ((charCode >> 6) & 0x3f),
                        0x80 | (charCode & 0x3f),
                    );
                }
            }
            return utf8;
        },
        init_paxSerialSocket: function () {
            var self = this;
            const pax_payment_method = _.find(self.payment_methods, function (payment_method) {
                return payment_method.use_payment_terminal === 'pax' && self.config.payment_method_ids.includes(payment_method.id);
            })
            if (!pax_payment_method) return Promise.resolve();
            return self._initPaxSerialSocket(pax_payment_method);

        },

    });
    const superPaymentline = models.Paymentline.prototype;
    models.Paymentline = models.Paymentline.extend({
        initialize: function (attr, options) {
            superPaymentline.initialize.call(this, attr, options);
            this.pax_terminalid = this.pax_terminalid || null;

        },
        export_as_JSON: function () {
            const json = superPaymentline.export_as_JSON.call(this);
            json.pax_terminalid = this.pax_terminalid;
            json.card_number = this.card_number;
            json.entry_mode = this.entry_mode;
            json.merchantid = this.merchantid;
            json.signature_required = this.signature_required;
            json.amount = this.amount;
            json.payment_log = this.payment_log;

            return json;
        },
        init_from_JSON: function (json) {
            superPaymentline.init_from_JSON.apply(this, arguments);
            for (key in json) {
                this[key] = json[key];
            }
        },
        export_for_printing: function () {
            const result = superPaymentline.export_for_printing.call(this);
            result.payment_method = this.payment_method;
            result.termprint = this.termreceipt;

            return result;
        },
        setTerminalServiceId: function (id) {
            this.pax_terminalid = id;
        },

        set_payment_pax_data: function (data) {
            for (key in data) {
                this[key] = data[key];
            }
        },
        set_payment_direct_pax_data: function (data) {
            var entrymode = {
                "S": "Normal Swipe",
                "C": "Chip Insert",
                "F": "Fallback Swipe",
                "T": "Contactless Tap",
                "M": "Manual Input"
            }
            //this.trace = data.aid;
            this.pax_terminalid = data.terminalId;
            this.card_number = data.pan;
            this.entry_mode = (data.entryMode) ? entrymode[data.entryMode] : undefined;
            this.card_type = data.cardType;
            this.merchantid = data.merchantID;
            this.signature_required = (data.noSign == "Y") ? false : true;
            this.amount = parseInt(data.amt) / 100;
            this.payment_log = JSON.stringify(data);
            this.transaction_id = data.referenceNo;
            this.cardholder_name = data.cardHolderName;
            //this.payment_status = data.status;
        }
    });
});