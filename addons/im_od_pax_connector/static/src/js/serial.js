odoo.define('im_od_pax_connector.SerialService', function (require) {
    "use strict";
    // @ts-check
    //const jsSHA = require("jssha");
    //const webserial=require('im_od_pax_connector.webserial')
    const WebSerial = require('im_od_pax_connector.webserial')
    var core = require('web.core');

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
    class SerialService extends EventTarget {
        constructor(pid) {
            super(...arguments);

            this._DonglePaxUSBID = {
                VID: 0x2FB8,
                PID: (pid == "A920") ? 0x2116 : pid // 0x2116 for A920
            }
            this.currentDevice_serialNumber = undefined;
            this.serial_ports = new Map();
            this.textDecoder = new TextDecoder();
            this.textEncoder = new TextEncoder();
            this.inEndpointNumber = 1;
            this.outEinEndpointNumberdpoint = 1;
            this.hexBuffer = "";
            this.buffer_start = false;
            this.payment_method = undefined;
            this.ready = false;
            //this.initialize();
        };
        get is_ready() {
            return this.ready;
        }
        async test_cable() {
            if (!this.currentDevice_serialNumber) {
                this.ready = false;
            } else {
                this.writeStrToSerialDevice(this.currentDevice_serialNumber, "010003FF0114E9");
            }
        }
        async initialize() {
            // Auto-connect to all devices previously approved ('paired')
            var index = 0;
            const availableDevices = (navigator.serial) ? await navigator.serial.getPorts() : await WebSerial.serial.getPorts();
            //const availableDevices = await webserial.serial.getPorts();
            if (availableDevices && availableDevices.length == 1) {
                index = 1;
            }
            if (availableDevices && availableDevices.length) {
                availableDevices.forEach(device => {
                    if (index == 1) {
                        if (this._DonglePaxUSBID.PID) {
                            if (device.getInfo().usbVendorId === this._DonglePaxUSBID.VID && device.getInfo().usbProductId === this._DonglePaxUSBID.PID) {
                                this.openSerialDevice(device);
                            }
                        }
                        else if (device.getInfo().usbVendorId === this._DonglePaxUSBID.VID) {//&& device.productId === this._DonglePaxUSBID.PID) {
                            this.openSerialDevice(device);
                        }
                    }
                    index += 1;
                });

            }


            //webserial.serial.addEventListener('connect', evt => this.openSerialDevice(evt.target));
            //webserial.serial.addEventListener('disconnect', evt => this.closeSerialDevice(evt.target));
        };
        is_selected() {
            return (this.currentDevice_serialNumber) ? true : false;
        }
        read() {
            var device = this.serial_ports.get(this.currentDevice_serialNumber);
            return this.readFromDevice(device);
        }
        async readFromDevice(port) {
            while (port.readable) {
                const reader = port.readable.getReader();
                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) {
                            break;
                        }
                        if (this.data_type == 'HEX') {
                            var val_hex = buf2hex(value);
                            console.log("BUFFER: " + val_hex);
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
                                //this.buffer += val_hex;
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

                    }
                } catch (error) {
                    console.log(error)
                } finally {
                    reader.releaseLock();
                }
            }
        };

        async writeStrToSerialDevice(device, str) {
            //const data = this.textEncoder.encode(hex_to_ascii(str));//new Uint16Array(this.textEncoder.encode(str));
            const data = hexStringToArrayBuffer(str);
            console.log(`TX_USB[${device.getInfo().usbVendorId}]:`, str);
            const writer = device.writable.getWriter();
            await writer.write(data);
            writer.releaseLock();

        };
        async closeSerialDevice(device) {
            this.serial_ports.delete(device.getInfo().usbVendorId);
            this.currentDevice_serialNumber = undefined;
            await device.close();
        };
        async ForgetSerialDevice(device) {
            this.serial_ports.delete(device.getInfo().usbVendorId);
            this.currentDevice_serialNumber = undefined;
            await device.forget();
        };
        async openSerialDevice(device, check) {
            this.serial_ports.set(device.getInfo().usbVendorId, device);
            this.currentDevice_serialNumber = device.getInfo().usbVendorId;
            var serialonfo = {
                baudRate: 38400,
                dataBits: 8,
                stopBits: 1,
                bufferSize: 8192,
            }

            await device.open(serialonfo);
            if (check) {
                this.writeStrToSerialDevice(device, "010003FF0114E9");// Magnetic Data
            }

            this.readFromDevice(device);

        };

        async scan() {
            const device = (navigator.serial) ? await navigator.serial.requestDevice({ filters: [{ usbVendorId: this._DonglePaxUSBID.VID/*, usbProductId: this._DonglePaxUSBID.PID */ }] }) : await WebSerial.serial.requestDevice({ filters: [{ usbVendorId: this._DonglePaxUSBID.VID/*, usbProductId: this._DonglePaxUSBID.PID */ }] });
            //const device = await webserial.serial.requestDevice({ filters: [{ usbVendorId: this._DonglePaxUSBID.VID/*, usbProductId: this._DonglePaxUSBID.PID */ }] });
            if (device) {
                await this.openSerialDevice(device);
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
            var device = this.serial_ports.get(this.currentDevice_serialNumber);
            var out_data = { dataType: 'active' };
            var response = await this.writeStrToSerialDevice(device, JSON.stringify(out_data));
            //this.readFromDevice(device);
            if (response.status == 'ok') return true;
            return false;
        };
        async offline() {
            var out_data = { dataType: 'offline' };
            var response = await this.writeStrToSerialDevice(this.serial_ports.get(this.currentDevice_serialNumber), JSON.stringify(out_data));
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
                return this.writeStrToSerialDevice(this.serial_ports.get(this.currentDevice_serialNumber), promised_data);
            }
            var out_data = this._jsonDataToPax(promised_data);
            this.data_type = 'STR';
            return this.writeStrToSerialDevice(this.serial_ports.get(this.currentDevice_serialNumber), JSON.stringify(out_data));
        }
    }
    return SerialService;
});