odoo.define('im_od_pax_connector.payment', function (require) {
    "use strict";

    const { Gui } = require('point_of_sale.Gui');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var PaymentInterface = require('point_of_sale.PaymentInterface');
    var framework = require('web.framework');
    var _t = core._t;

    const MAGNETIC_DATA = "010003FF0114E9"
    const TERMINAL_PROPERTY_CODE = "09FF0106DF0D03"
    const SET_TERMINAL_SETTINGS_CODE = "09FF0106DF0D03"
    const GET_TERMINAL_SETTINGS_CODE = "010003FF0106FB"
    const MERCHANT_INFO_CODE = "010003FF010AF7"
    const CHECK_STATUS_SYNC = "010003FF0104F9"
    const CHECK_KEYPAD_STATUS = "010003FF0107FA"
    const TEST_CONNECTION = "010003FF0104F9"
    const RESEND_LAST_REQUEST_CODE = "010003FF010BF6"
    const CANCEL_REQUEST = "010002373207"
    const RECONCILIATION_CODE = "FF0109DF610A3"
    const RECONCILIATION_MASK = "FFFFFFFFFFFFFFFFFF"
    const TERMINAL_ID_REQUEST = "010003FF0107FA"
    const AUTHORIZATION_CODE = "FF010CDF0406"
    const PRINTSETTING_CODE = "DF610A3"
    const TRANSACTION_MASK = "FFFFFFFFFFFFFFFFFFDF81"
    const DATA_START = "0100"
    const PURCHASE_CODE = "FF0100DF0406"
    const PURCHASE_WITH_CASHBACK_CODE = "FF0100DF0406"
    const PURCHASE_WITH_SUBSCRIPTION_CODE = "FF0100DF0406"
    const SUBSCRIPTION_CODE = "DF86"
    const CASHBACK_CODE = "DF3606"
    const CASH_ADVANCE_CODE = "FF010EDF0406"
    const REVERSAL_CODE = "FF0103DF81"
    const REFUND_CODE = "FF0102DF0406"
    const REFUND_WITH_CARD_NUM_CODE = "FF0102DF0406"
    const REFUND_RRN_CODE = "DF25"
    const REFUND_DATE_CODE = "DF24"
    const CARD_NUM_CODE = "DF02"
    const ADVICE_TRANSACTION_CODE = "FF010DDF0406"
    const AUTH_CODE = "DF38"

    function hex_to_ascii(str1) {
        var hex = str1.toString();
        var str = '';
        for (var n = 0; n < hex.length; n += 2) {
            str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
        }
        return str;
    }
    function hex_to_ascii_extended(str1) {
        let hex = str1.replaceAll(" ", "");
        let str = "";
        for (var i = 0; i < hex.length; i += 4) {
            str += String.fromCharCode(Number("0x" + hex.substr(i, 4)));
        }
        return str;
    }
    function ascii_to_hexa(str) {
        var arr1 = [];
        for (var n = 0, l = str.length; n < l; n++) {
            var hex = Number(str.charCodeAt(n)).toString(16);
            arr1.push(hex);
        }
        return arr1.join('');
    }
    function calculateLRC(str) {
        var bytes = [];
        var lrc = 0;
        for (var i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i));
        }
        for (var i = 0; i < str.length; i++) {
            lrc ^= bytes[i];
        }
        return String.fromCharCode(lrc);
    }

    function SHA256(text) {
        var sha256 = new jsSHA('SHA-256', 'TEXT');
        sha256.update(text);
        var hash = sha256.getHash("HEX");
        return hash
    };

    function jsonDataToPax(data) {
        var out_data = data;
        out_data.checksum = SHA256(JSON.stringify(data.data));
        return out_data;
    };

    function convertToSerial(trans_code, ...kwargs) {
        var result = "";
        var data_str = "";

        var app_id = (kwargs && kwargs[0].app_id) ? kwargs[0].app_id : "11";
        var print_settings = (kwargs && kwargs[0].print_settings) ? kwargs[0].print_settings : '1';
        var amount = (kwargs && kwargs[0].amount) ? kwargs[0].amount.toString(16).padStart(12, "0") : "0".padStart(12, "0");
        var cash_back = (kwargs && kwargs[0].cash_back) ? kwargs[0].cash_back.toString(16).padStart(12, "0") : "0".padStart(12, "0");
        var subscription = ascii_to_hexa((kwargs && kwargs[0].subscription) ? kwargs[0].subscription : "");

        if (
            [MAGNETIC_DATA,
                GET_TERMINAL_SETTINGS_CODE,
                MERCHANT_INFO_CODE,
                RESEND_LAST_REQUEST_CODE,
                CHECK_KEYPAD_STATUS,
                TEST_CONNECTION,
                CANCEL_REQUEST,
                TERMINAL_ID_REQUEST,
                CHECK_STATUS_SYNC].includes(trans_code)
        ) {
            result = trans_code;
        }

        else {
            if (trans_code == SET_TERMINAL_SETTINGS_CODE) {
                if (kwargs && kwargs[0].menu && kwargs[0].printer && kwargs[0].speed) {
                    speed = kwargs[0].speed;
                    end_code = "5";
                    main_cmd = trans_code + "3" + kwargs[0].menu + "3" + kwargs[0].printer + 3 + end_code;
                    let encoded_length = (main_cmd.length / 2).toString(16).padStart(2, "0")
                    end_encoded = ascii_to_hexa(hex_to_ascii(calculateLRC("00" + encoded_length + main_cmd).trim())).padStart(2, "0");
                    result = DATA_START + main_cmd + end_encoded;
                }
            }
            else {
                let ecr_num = (kwargs && kwargs[0].ecr_num) ? kwargs[0].ecr_num : '';
                let ecr_num_length_str = (kwargs && kwargs[0].ecr_num) ? (kwargs[0].ecr_num.length).toString(16).padStart(2, "0") : "0".padStart(2, "0");
                let ecr_num_hex = ascii_to_hexa(ecr_num);

                let rrn = (kwargs && kwargs[0].rrn) ? kwargs[0].rrn : '';
                let rrn_length_str = (kwargs && kwargs[0].rrn) ? (kwargs[0].rrn.length).toString(16).padStart(2, "0") : "0".padStart(2, "0");
                let rrn_hex = ascii_to_hexa(rrn);

                let trans_date = (kwargs && kwargs[0].trans_date) ? kwargs[0].trans_date : '';
                let trans_date_length_str = (kwargs && kwargs[0].trans_date) ? (kwargs[0].trans_date.length).toString(16).padStart(2, "0") : "0".padStart(2, "0");
                let trans_date_hex = ascii_to_hexa(trans_date);

                let card_num = (kwargs && kwargs[0].card_num) ? kwargs[0].card_num : '';
                let card_num_length_str = (kwargs && kwargs[0].card_num) ? (kwargs[0].card_num.length).toString(16).padStart(2, "0") : "0".padStart(2, "0");
                let card_num_hex = ascii_to_hexa(card_num);

                let auth_code = (kwargs && kwargs[0].auth_code) ? kwargs[0].auth_code : '';
                let auth_code_length_str = (kwargs && kwargs[0].auth_code) ? (kwargs[0].auth_code.length).toString(16).padStart(2, "0") : "0".padStart(2, "0");
                let auth_code_hex = ascii_to_hexa(auth_code);

                switch (trans_code) {
                    case RECONCILIATION_CODE:
                        data_str = trans_code + print_settings + RECONCILIATION_MASK;
                        break;
                    case AUTHORIZATION_CODE:
                        data_str = trans_code + amount + PRINTSETTING_CODE + print_settings + TRANSACTION_MASK + ecr_num_length_str + ecr_num_hex + app_id;
                        break;
                    case PURCHASE_CODE:
                        data_str = trans_code + amount + PRINTSETTING_CODE + print_settings + TRANSACTION_MASK + ecr_num_length_str + ecr_num_hex + app_id;
                        break;
                    case CASH_ADVANCE_CODE:
                        data_str = trans_code + amount + PRINTSETTING_CODE + print_settings + TRANSACTION_MASK + ecr_num_length_str + ecr_num_hex + app_id;
                        break;
                    case PURCHASE_WITH_CASHBACK_CODE:
                        data_str = trans_code + amount + CASHBACK_CODE + cash_back + PRINTSETTING_CODE +
                            print_settings + TRANSACTION_MASK + ecr_num_length_str + ecr_num_hex + app_id;
                        break;
                    case PURCHASE_WITH_SUBSCRIPTION_CODE:
                        data_str = trans_code + amount + SUBSCRIPTION_CODE + subscription + PRINTSETTING_CODE +
                            print_settings + TRANSACTION_MASK + ecr_num_length_str + ecr_num_hex + app_id;
                        break;
                    case REVERSAL_CODE:
                        data_str = trans_code + ecr_num_length_str + ecr_num_hex + app_id;
                        break;
                    case REFUND_CODE:
                        data_str = trans_code + amount + REFUND_RRN_CODE + rrn_length_str + rrn_hex + REFUND_DATE_CODE + trans_date_length_str +
                            trans_date_hex + PRINTSETTING_CODE + print_settings + TRANSACTION_MASK + ecr_num_length_str + ecr_num_hex + app_id
                        break;
                    case REFUND_WITH_CARD_NUM_CODE:
                        data_str = trans_code + amount + REFUND_RRN_CODE + rrn_length_str + rrn_hex + CARD_NUM_CODE + card_num_length_str +
                            card_num_hex + PRINTSETTING_CODE + print_settings + TRANSACTION_MASK + ecr_num_length_str + ecr_num_hex + app_id
                        break;
                    case ADVICE_TRANSACTION_CODE:
                        data_str = trans_code + amount + AUTH_CODE + auth_code_length_str + auth_code_hex +
                            PRINTSETTING_CODE + print_settings + TRANSACTION_MASK + ecr_num_length_str + ecr_num_hex + app_id

                }

                if (data_str && data_str.length) {
                    let encoded_length = (data_str.length / 2).toString(16).padStart(2, "0")
                    let hexaLRC = ascii_to_hexa(calculateLRC(hex_to_ascii("00" + encoded_length + data_str).trim())).padStart(2, "0")
                    result = DATA_START + encoded_length + data_str + hexaLRC
                }
            }
        }
        return result
    }


    var PaymentPax = PaymentInterface.extend({
        send_payment_cancel: function (order, cid) {
            this._super.apply(this, arguments);
            return this._send_pax_Transaction('void');
        },

        /**
         * @override
         */
        send_payment_request: function (cid) {
            this._super.apply(this, arguments);
            if (this.pos.get_order().selected_paymentline.amount < 0) {
                this._show_error(_t('Cannot process transactions with negative amount.'));
                return Promise.resolve();
            }
            this.pos.get_order().selected_paymentline.set_payment_status('waitingCard');
            return this._send_pax_Transaction('sale');
        },

        _pending_pax_line: function () {
            return this.pos.get_order().paymentlines.find(
                paymentLine => paymentLine.payment_method.use_payment_terminal === 'pax' && (!paymentLine.is_done()));
        },
        _send_pax_Transaction: async function (transactionType) {
            var self = this;
            if (this.payment_method.connection_mode == 'websocket') {
                if (!self.pos.paxSocket || [WebSocket.CLOSED, WebSocket.CLOSING].includes(this.pos.paxSocket.readyState)) {
                    this.pos._initSocket(this.payment_method);
                }
            }

            switch (transactionType) {
                case 'sale':
                    if (this.payment_method.connection_mode == 'websocket') {
                        //                        var data = JSON.stringify(jsonDataToPax(this._paxBuildSaleData()))
                        var build_data = await this._paxBuildSaleData();
                        //var encoded_data = jsonDataToPax(build_data);
                        //var data = JSON.stringify(encoded_data)
                        //return this.pos.sendSocket(data);
                        //return build_data;
                        //await checkConnection();
                        return this.pos.sendSocket(JSON.stringify(build_data));
                    }
                    return this.pos.ECRTerminal.transact(this._paxBuildSaleData(), self.payment_method).then(function (result) {
                        if (!result) {
                            self._pending_pax_line().set_payment_status('waiting');
                            return Promise.resolve(true);
                        }

                        return self._pax_handle_response(result);
                    });
                case 'void':
                    if (this.payment_method.connection_mode == 'websocket') {
                        var build_data = await this._paxBuildCanceldData();
                        var encoded_data = jsonDataToPax(build_data);
                        var data = JSON.stringify(encoded_data)
                        return this.pos.sendSocket(data);
                    }
                    return this.pos.ECRTerminal.transact(this._paxBuildCanceldData(), self.payment_method).then((result) => {
                        if (!result) {
                            self._pending_pax_line().set_payment_status('waiting');
                            return Promise.resolve(true);
                        }
                        return self._pax_handle_response(result);
                    });
                case 'refund':
                    if (this.payment_method.connection_mode == 'websocket') {
                        var build_data = await this._paxBuildRefundData();
                        var encoded_data = jsonDataToPax(build_data);
                        var data = JSON.stringify(encoded_data)
                        return this.pos.sendSocket(data);
                    }
                    return this.pos.ECRTerminal.transact(this._paxBuildRefundData(), self.payment_method).then((result) => {
                        if (!result) {
                            self._pending_pax_line().set_payment_status('waiting');
                            return Promise.resolve(true);
                        }
                        return self._pax_handle_response(result);
                    });
                default:
                    return Promise.resolve();
            }
        },

        _paxBuildSaleData: async function () {
            const order = this.pos.get_order();
            const line = order.selected_paymentline;
            var data = {
                amt: (Math.round(line.amount * 100)).toString(),
                //tipAmt: (line.tipAmount) ? (Math.round(line.tipAmount * 100)).toString() : "0",
                detail: this.payment_method.show_details,
                ecrRef: order.uid,
                print: this.payment_method.print,
            }
            switch (this.payment_method.subtype) {
                case 'mada':
                    return convertToSerial(PURCHASE_CODE, { amount: data.amt, ecr_num: data.ecrRef, print_settings: (data && data.print) ? "1" : "0" });
                default:
                    var output = {
                        data: data,
                        dataType: 'sale'
                    }
                    return output;
            }

        },
        _paxBuildRefundData: async function () {
            const order = this.pos.get_order();
            const line = order.selected_paymentline;
            var data = {
                traceNo: line.trace,
                detail: this.payment_method.show_details,
                ecrRef: order.number,
                print: this.payment_method.print
            }

            switch (this.payment_method.subtype) {
                case 'mada':
                    return convertToSerial(REFUND_CODE, { amount: data.amt, ecr_num: data.ecrRef, print_settings: (data && data.print) ? "1" : "0" });
                default:
                    var output = {
                        data: data,
                        dataType: 'refund'
                    }
                    return output;
            }
        },
        _paxBuildCanceldData: async function () {
            const order = this.pos.get_order();
            const line = order.selected_paymentline;
            var data = {
                traceNo: line.trace,
                detail: this.payment_method.show_details,
                ecrRef: order.number,
                print: this.payment_method.print
            }
            switch (this.payment_method.subtype) {
                case 'mada':
                    return convertToSerial(CANCEL_REQUEST, { amount: data.amt, ecr_num: data.ecrRef, print_settings: (data && data.print) ? "1" : "0" });
                default:
                    var output = {
                        data: data,
                        dataType: 'void'
                    }
                    return output;
            }
        },
        buffer_json: function (buffer) {
            var self = this;
            //self._pending_pax_line().set_payment_status('done');
            const pax_pending_line=self._pending_pax_line();
            var status = '';
            var dataType = (buffer && buffer.dataType) ? buffer.dataType : undefined;
            if (buffer && buffer.data && buffer.data.status) {
                status = buffer.data.status;
            }
            console.log("DATATYPE:" + dataType + "STATUS: " + status);
            switch (dataType) {
                case "sale":
                    switch (status) {
                        case "A":
                            pax_pending_line.set_payment_status('done');
                            pax_pending_line.set_payment_direct_pax_data(buffer.data);

                            break;
                        case "R":
                            pax_pending_line.set_payment_status('retry');
                            break;
                        case 'P':
                            pax_pending_line.set_payment_status('waitingCard');
                            break;
                        default:
                            pass
                    }
                    break;
                case "void":
                    switch (status) {
                        case "A":
                            pax_pending_line.set_payment_status('retry');
                        default:
                            pass
                    }
                    break;
                case "refund":
                    switch (status) {
                        case "A":
                            pax_pending_line.set_payment_status('reversed');
                        default:
                            pass
                    }
                    break;
                default:
                    pass
            }
            if (this.payment_method.connection_mode == 'websocket') {
                if (!self.pos.paxSocket || [WebSocket.CLOSED, WebSocket.CLOSING].includes(this.pos.paxSocket.readyState)) {
                    return
                }
            }
            self.pos.sent_status = { dataType: "ack" };
            self.pos.sendSocket(JSON.stringify(self.pos.sent_status));
        },
        buffer_to_status: function (buffer) {
            var self = this;
            var line = self._pending_pax_line();
            var message = "";
            let split = buffer.split(" ", -1);
            if (split.length <= 6) {
                switch (split[split.length - 2]) {
                    case "07":
                        message = "Busy";
                        line.set_payment_status('retry');
                        break;
                    case "77":
                        message = "Max Amount Limit Exceeded";
                        line.set_payment_status('cancel');
                        break;
                    case "71":
                        message = "Network is down";
                        line.set_payment_status('retry');
                        break;
                    case "4B":
                        message = "Re-Connect";
                        line.set_payment_status('retry');
                        break;
                    case "49":
                        message = "Network Down Connect Cable";
                        line.set_payment_status('retry');
                        break;
                    case "50":
                        message = "Remove Card";
                        break;
                    case "57":
                        message = "RETRY LIMIT EXCEEDED";
                        line.set_payment_status('cancel');
                        break;
                    case "44":
                        message = "WRONG PIN";
                        break;
                    case "4D":
                        message = "Connection Made";
                        break;
                    case "7A":
                        message = "Sending Request";
                        break;
                    case "79":
                        message = "Waiting Response";
                        break;
                    case "52":
                        message = "Transaction Cancelled";
                        line.set_payment_status('cancel');
                        break;
                    case "53":
                        message = "Card Removed";
                        break;
                    case "75":
                        message = "Terminal TMS not loaded";
                        line.set_payment_status('retry');
                        break;
                    case "43":
                        message = "Pin Entry";
                        break;
                    case "70":
                        message = "Card Read Error";
                        break;
                    case "42":
                        message = "No Active Application Found";
                        line.set_payment_status('retry');
                        break;
                    case "65":
                        message = "Blocked Card";
                        break;
                    case "66":
                        message = "Data Error";
                        line.set_payment_status('retry');
                        break;
                    case "61":
                        message = "De-SAF Failed";
                        break;
                    case "62":
                        message = "No Business ";
                        break;
                    case "63":
                        message = "Communication Failur";
                        line.set_payment_status('retry');
                        break;
                    case "55":
                        message = "Card Scheme Not Supported";
                        break;
                    case "6D":
                        message = "Insert Card only Use Smart Card Reader";
                        break;
                    case "56":
                        message = "Maximum SAF limit reached";
                        line.set_payment_status('cancel');
                        break;
                    case "4F":
                        message = "Paper Out";
                        break;
                    case "51":
                        message = "Connection Closed";
                        break;
                    case "39":
                        message = "Idle Screen";
                        line.set_payment_status('retry');
                        break;
                    case "46":
                        message = "Connecting";
                        break;
                    case "4A":
                        message = "Insert SIM";
                        break;
                    case "47":
                        message = "Cancelled or Timeout";
                        line.set_payment_status('cancel');
                        break;
                    case "41":
                        message = "Swipe or Insert";
                        break;
                    case "45":
                        message = "Pin Quit";
                        break;
                    case "12":
                        message = "Terminal Verified";
                    default:
                        message = "Unknown Response";
                }

            }
            if (message && message.length) {
                $(".oe_throbber_message").html(message);
                if (!$("#custom_throbber_event_message").length) {
                    if ($(".oe_throbber_message").length) {
                        $(".oe_throbber_message").first().after("<div id= \"custom_throbber_event_message \" class= \"oe_throbber_custom_message \" style= \"color:yellow \"></div>");
                    }
                }
                if ($("#custom_throbber_event_message").length) {
                    $("#custom_throbber_event_message").html(message);
                }
            }
        },
        retry: function () {
            var self = this;
            var line = self._pending_pax_line();
            line.set_payment_status('retry');
            console.log('RETRYING');
        },
        buffer_to_data: function (buffer) {
            var self = this;
            var line = self._pending_pax_line();

            let data_buffer = buffer.trim().substring(buffer.indexOf("df"), buffer.length)
            let message_array = data_buffer.trim().split("df");
            let message = {};
            for (var i = 0; i < message_array.length; i++) {

                let current_message = message_array[i].replaceAll(" ", "")
                if (current_message.length <= 2) continue
                switch (current_message.substring(0, 2).toUpperCase()) {
                    case "02":
                        message.card_number = hex_to_ascii(current_message.substring(4, current_message.length));
                        break;
                    case "04":
                        message.amount = parseInt(current_message.substring(4, current_message.length)) / 100;
                        break;
                    case "0B":
                        message.trace = hex_to_ascii(current_message.substring(4, current_message.length));
                        break;
                    case "0C":
                        message.trans_date = hex_to_ascii(current_message.substring(4, current_message.length));
                        break;
                    case "0E":
                        message.card_expiry = hex_to_ascii(current_message.substring(4, current_message.length));
                        break;
                    case "25":
                        message.rrn = hex_to_ascii(current_message.substring(4, current_message.length));
                        break;
                    case "26":
                        message.auth_response = hex_to_ascii(current_message.substring(4, current_message.length));
                        break;
                    case "27":
                        message.response_code = hex_to_ascii(current_message.substring(4, current_message.length));
                        break;
                    case "29":
                        message.terminal_id = hex_to_ascii(current_message.substring(4, current_message.length));
                        break;
                    case "2A":
                        message.merchant_id = hex_to_ascii(current_message.substring(4, current_message.length));
                        break;
                    case "36":
                        message.add_amount = parseInt(current_message.substring(4, current_message.length)) / 100;
                        break;
                    case "82":
                        message.card_type = hex_to_ascii(current_message.substring(4, current_message.length));
                        break;
                    case "81":
                        message.ecr_num = hex_to_ascii(current_message.substring(4, current_message.length));
                        break;
                    case "28":
                        message.status_message = hex_to_ascii(current_message.substring(4, current_message.length));
                        break;
                    case "91":
                        message.merchant_details = hex_to_ascii(current_message.substring(4, current_message.length));
                        break;
                }
            }
            this._pax_handle_response(message);

        },
        _pax_handle_response: function (response) {
            var self = this;
            if (!response) { return }
            var line = self._pending_pax_line();

            if (response && response.status_message && response.status_message.includes("DECLINED")) {
                line.set_payment_status('retry');
                return;
            }

            line.set_pax_payment_data(response)
            if (response && response.status_message && response.status_message.includes("APPROVED")) {
                line.set_payment_status('done');
                line.set_payment_pax_data(response);
                return;
            }
            line.set_payment_status('cancel');
            return;
        },
    });
    return PaymentPax;
});