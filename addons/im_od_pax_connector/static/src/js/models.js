odoo.define('im_od_pax_connector.models', function (require) {

    var models = require('point_of_sale.models');
    const USBService  = require('im_od_pax_connector.USBService')
    var Paymentpax = require('im_od_pax_connector.payment');
    const { Gui } = require('point_of_sale.Gui');
    models.register_payment_method('pax', Paymentpax);
    models.load_fields('pos.payment.method', ['print', 'show_details', 'pax_device_brand','subtype']);
    var core = require('web.core');
    var _t = core._t;
    const _super_PosModel = models.PosModel.prototype;


    models.PosModel = models.PosModel.extend({
        after_load_server_data: async function () {
            var self = this;
            return _super_PosModel.after_load_server_data.apply(this, arguments).then(async function () {
                return await self.init_paxusbSocket();
            });
        },
        _initPaxUSBSocket: async function (payment_method) {
            var self = this;
            try {
                if (!self.ECRTerminal) {
                    self.ECRTerminal = new USBService(payment_method.pax_device_brand);
                    await self.ECRTerminal.initialize();
                    //await self.ECRTerminal.scan();
                }
            } catch (e) {
                self.ECRTerminal = undefined;
            }
            
            return true;
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
        init_paxusbSocket: function () {
            var self = this;
            const pax_payment_method = _.find(self.payment_methods, function (payment_method) {
                return payment_method.use_payment_terminal === 'pax' && self.config.payment_method_ids.includes(payment_method.id);
            })
            if (!pax_payment_method) return Promise.resolve();
            return self._initPaxUSBSocket(pax_payment_method);

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
            json.pax_sequence = this.pax_sequence;
            json.card_number = this.card_number;
            json.entry_mode = this.entry_mode;
            json.auth_code = this.auth_code;
            json.card_name = this.card_name;
            json.merchantid = this.merchantid;
            json.signature_required = this.signature_required;
            json.amount_paid = this.amount_paid;
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
        }
    });
});