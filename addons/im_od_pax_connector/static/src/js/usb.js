odoo.define('im_od_pax_connector.USBService', function (require) {
    "use strict";
    // @ts-check
    //const jsSHA = require("jssha");
    var core = require('web.core');
    var framework = require('web.framework');
    function SHA256(text) {
        var sha256 = new jsSHA('SHA-256', 'TEXT');
        sha256.update(text);
        var hash = sha256.getHash("HEX");
        return hash
    };


    function buf2hex(buffer) { // buffer is an ArrayBuffer
        return [...new Uint8Array(buffer)]
            .map(x => x.toString(16).padStart(2, '0'))
            .join(' ');
    }
    function hex_to_ascii(str1) {
        var hex = str1.toString();
        var str = '';
        for (var n = 0; n < hex.length; n += 2) {
            str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
        }
        return str;
    }
    const hexToBytes = (hex) => {
        var bytes = [];

        for (var c = 0; c < hex.length; c += 2) {
            bytes.push(parseInt(hex.substr(c, 2), 16));
        }

        return bytes;
    };
    function hexStringToArrayBuffer(hexString) {
        // remove the leading 0x
        hexString = hexString.replace(/^0x/, '');

        // ensure even number of characters
        if (hexString.length % 2 != 0) {
            console.log('WARNING: expecting an even number of characters in the hexString');
        }

        // check for some non-hex characters
        var bad = hexString.match(/[G-Z\s]/i);
        if (bad) {
            console.log('WARNING: found non-hex characters', bad);
        }

        // split the string into pairs of octets
        var pairs = hexString.match(/[\dA-F]{2}/gi);

        // convert the octets to integers
        var integers = pairs.map(function (s) {
            return parseInt(s, 16);
        });

        var array = new Uint8Array(integers);
        console.log(array);

        return array.buffer;
    }
    class USBService extends EventTarget {
        constructor(pid) {
            super(...arguments);
            if (pid == "A920") pid =

                this._DonglePaxUSBID = {
                    VID: 0x2FB8,
                    PID: (pid == "A920") ? 0x2116 : pid // 0x2116 for A920
                }
            this.currentDevice_serialNumber = undefined;
            this.usb_devices = new Map();
            this.textDecoder = new TextDecoder();
            this.textEncoder = new TextEncoder();
            this.inEndpointNumber = 1;
            this.outEinEndpointNumberdpoint = 1;
            this.hexBuffer = "";
            this.buffer_start = false;
            this.payment_method = undefined;
            this.ready = false;
            this.outPacketSize = 512;
            this.inPacketSize = 512;
            this.init_setup = {
                requestType: "vendor",
                recipient: "device",
                request: "",
                index: ""
            }
            this.write_setup = {
                requestType: "vendor",
                recipient: "device",
                request: "",
                index: ""
            }
            this.read_setup = {
                requestType: "vendor",
                recipient: "device",
                request: "",
                index: ""
            }
            //this.initialize();
        };

        async initialize() {
            // Auto-connect to all devices previously approved ('paired')
            const availableDevices = await navigator.usb.getDevices();
            availableDevices.forEach(device => {
                if (device.vendorId === this._DonglePaxUSBID.VID) {//&& device.productId === this._DonglePaxUSBID.PID) {
                    this.openUSBDevice(device);
                }
            });

            navigator.usb.addEventListener('connect', evt => this.openUSBDevice(evt.device));
            navigator.usb.addEventListener('disconnect', evt => this.closeUSBDevice(evt.device));
        };
        is_selected() {
            return (this.currentDevice_serialNumber) ? true : false;
        }
        read() {
            var device = this.usb_devices.get(this.currentDevice_serialNumber);
            return this.readFromDevice(device);
        }
        readFromDevice(device) {
            return device.transferIn(this.inEndpointNumber, this.inPacketSize).then(result => {
                const value = result.data;
                var val_hex = buf2hex(value);
                console.log("VALUE " + value);
                console.log("BUFFER: " + val_hex);
                if (this.data_type == "HEX") {
                    if (val_hex == "06") {
                        console.log('STARTING')
                    } else if (val_hex == "01") {
                        if (this.buffer_start == false) {
                            this.buffer_start == true
                        }
                    } else if (value.length <= 6) {
                        this.buffer_start == false;
                        if (this.payment_method) {
                            this.payment_method.payment_terminal.buffer_to_status(val_hex)
                        }
                    } else if (value.length > 6) {
                        this.buffer_start = false;
                        this.payment_method.payment_terminal.buffer_to_data(val_hex);
                    }
                } else {
                    var str_value = this.textDecoder.decode(value);
                    if (this.payment_method) {
                        if (value.length <= 6) {
                            this.payment_method.payment_terminal.buffer_to_status(str_value);
                        }
                        this.payment_method.payment_terminal.buffer_json(str_value);
                    }
                }
                this.readFromDevice(device);
            }, error => {
                console.log(error);
                if (this.payment_method) {
                    this.payment_method.payment_terminal.retry();
                }
                framework.unblockUI();
            });
        };

        async writeStrToUSBDevice(device, str) {
            //const data = this.textEncoder.encode(str);//new Uint16Array(this.textEncoder.encode(str));
            const data = hexStringToArrayBuffer(str);
            console.log(`TX_USB[${device.serialNumber}]:`, str);
            var result = await device.transferOut(this.outEndpointNumber, data);
            return result;
        };
        async closeUSBDevice(device) {
            this.usb_devices.delete(device.serialNumber);
            this.currentDevice_serialNumber = undefined;
            this.notify('usb-disconnected', { device: device.serialNumber })
            if (device.opened) {
                try {
                    await device.close();
                } catch (error) {
                    console.log(error);
                    if (this.payment_method) {
                        this.payment_method.payment_terminal.retry();
                    }
                    framework.unblockUI();
                }
            }

        };
        async openUSBDevice(device) {
            if (!device.opened) {
                try {
                    var interfaceNumber = 1;
                    await device.open();
                    await device.selectConfiguration(1);
                    await device.claimInterface(device.configuration.interfaces[interfaceNumber].interfaceNumber);
                    var in_endpoint = _.find(device.configuration.interfaces[interfaceNumber].alternate.endpoints, function (endpoint) {
                        return endpoint.direction == 'in' && endpoint.type === 'bulk';
                    });
                    var out_endpoint = _.find(device.configuration.interfaces[interfaceNumber].alternate.endpoints, function (endpoint) {
                        return endpoint.direction == 'out' && endpoint.type === 'bulk';
                    });
                    this.inEndpointNumber = in_endpoint.endpointNumber;
                    this.inPacketSize = in_endpoint.packetSize;
                    this.outEndpointNumber = out_endpoint.endpointNumber;
                    this.outPacketSize = out_endpoint.packetSize;
                } catch (e) {
                    console.log(e);
                    return;
                }
            }
            this.usb_devices.set(device.serialNumber, device);

            this.notify('usb-connected', { device: device.serialNumber })
            this.currentDevice_serialNumber = device.serialNumber;

            this.readFromDevice(device);
        };

        async scan() {
            const device = await navigator.usb.requestDevice({ filters: [{ vendorId: this._DonglePaxUSBID.VID/*, productId: this._DonglePaxUSBID.PID */ }] });
            if (device) {
                await this.openUSBDevice(device);
            }
        };


        notify(type, data) {
            this.dispatchEvent(new CustomEvent(type, { detail: data }));
        };

        _jsonDataToPax(data) {
            var out_data = data;
            out_data.checksum = SHA256(JSON.stringify(data.data));
            return out_data;
        };

        async checkStatus() {
            var device = this.usb_devices.get(this.currentDevice_serialNumber);
            var out_data = { dataType: 'active' };
            var response = await this.writeStrToUSBDevice(device, JSON.stringify(out_data));
            //this.readFromDevice(device);
            if (response.status == 'ok') return true;
            return false;
        };
        async offline() {
            var out_data = { dataType: 'offline' };
            var response = await this.writeStrToUSBDevice(this.usb_devices.get(this.currentDevice_serialNumber), JSON.stringify(out_data));
        };
        async transact(data, payment_method) {
            this.payment_method = payment_method;
            this.hexBuffer = "";
            this.buffer_start = false;
            var promised_data = await data;
            if (!this.currentDevice_serialNumber) {
                return;// Need to put a popup
            }
            if (payment_method.subtype == "mada") {
                this.data_type = 'HEX';
                this.writeStrToUSBDevice(this.usb_devices.get(this.currentDevice_serialNumber), promised_data);
                return;
            }
            this.data_type = 'STR';
            var out_data = this._jsonDataToPax(promised_data);

            this.writeStrToUSBDevice(this.usb_devices.get(this.currentDevice_serialNumber), JSON.stringify(out_data));
            return;
        }
    }
    return USBService;
});