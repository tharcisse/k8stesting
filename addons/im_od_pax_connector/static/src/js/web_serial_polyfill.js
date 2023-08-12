
odoo.define('im_od_pax_connector.webserial', function (require) {

var exports = {};
/*
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of
 * the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in
 * writing, software distributed under the License is
 * distributed on an "AS IS" BASIS, WITHOUT WARRANTIES
 * OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing
 * permissions and limitations under the License.
 */
'use strict';
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.serial = exports.SerialPort = exports.SerialPolyfillProtocol = void 0;
var SerialPolyfillProtocol;
(function (SerialPolyfillProtocol) {
    SerialPolyfillProtocol[SerialPolyfillProtocol["UsbCdcAcm"] = 0] = "UsbCdcAcm";
})(SerialPolyfillProtocol = exports.SerialPolyfillProtocol || (exports.SerialPolyfillProtocol = {}));
var kSetLineCoding = 0x20;
var kSetControlLineState = 0x22;
var kSendBreak = 0x23;
var kDefaultBufferSize = 255;
var kDefaultDataBits = 8;
var kDefaultParity = 'none';
var kDefaultStopBits = 1;
var kAcceptableDataBits = [16, 8, 7, 6, 5];
var kAcceptableStopBits = [1, 2];
var kAcceptableParity = ['none', 'even', 'odd'];
var kParityIndexMapping = ['none', 'odd', 'even'];
var kStopBitsIndexMapping = [1, 1.5, 2];
var kDefaultPolyfillOptions = {
    protocol: SerialPolyfillProtocol.UsbCdcAcm,
    usbControlInterfaceClass: 2,
    usbTransferInterfaceClass: 10
};
/**
 * Utility function to get the interface implementing a desired class.
 * @param {USBDevice} device The USB device.
 * @param {number} classCode The desired interface class.
 * @return {USBInterface} The first interface found that implements the desired
 * class.
 * @throws TypeError if no interface is found.
 */
function findInterface(device, classCode) {
    var configuration = device.configurations[0];
    for (var _i = 0, _a = configuration.interfaces; _i < _a.length; _i++) {
        var iface = _a[_i];
        var alternate = iface.alternates[0];
        if (alternate.interfaceClass === classCode) {
            return iface;
        }
    }
    throw new TypeError("Unable to find interface with class ".concat(classCode, "."));
}
/**
 * Utility function to get an endpoint with a particular direction.
 * @param {USBInterface} iface The interface to search.
 * @param {USBDirection} direction The desired transfer direction.
 * @return {USBEndpoint} The first endpoint with the desired transfer direction.
 * @throws TypeError if no endpoint is found.
 */
function findEndpoint(iface, direction) {
    var alternate = iface.alternates[0];
    for (var _i = 0, _a = alternate.endpoints; _i < _a.length; _i++) {
        var endpoint = _a[_i];
        if (endpoint.direction == direction) {
            return endpoint;
        }
    }
    throw new TypeError("Interface ".concat(iface.interfaceNumber, " does not have an ") +
        "".concat(direction, " endpoint."));
}
/**
 * Implementation of the underlying source API[1] which reads data from a USB
 * endpoint. This can be used to construct a ReadableStream.
 *
 * [1]: https://streams.spec.whatwg.org/#underlying-source-api
 */
var UsbEndpointUnderlyingSource = /** @class */ (function () {
    /**
     * Constructs a new UnderlyingSource that will pull data from the specified
     * endpoint on the given USB device.
     *
     * @param {USBDevice} device
     * @param {USBEndpoint} endpoint
     * @param {function} onError function to be called on error
     */
    function UsbEndpointUnderlyingSource(device, endpoint, onError) {
        this.device_ = device;
        this.endpoint_ = endpoint;
        this.onError_ = onError;
    }
    /**
     * Reads a chunk of data from the device.
     *
     * @param {ReadableStreamDefaultController} controller
     */
    UsbEndpointUnderlyingSource.prototype.pull = function (controller) {
        var _this = this;
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var chunkSize, d, result, chunk, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (controller.desiredSize) {
                            d = controller.desiredSize / this.endpoint_.packetSize;
                            chunkSize = Math.ceil(d) * this.endpoint_.packetSize;
                        }
                        else {
                            chunkSize = this.endpoint_.packetSize;
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.device_.transferIn(this.endpoint_.endpointNumber, chunkSize)];
                    case 2:
                        result = _b.sent();
                        if (result.status != 'ok') {
                            controller.error("USB error: ".concat(result.status));
                            this.onError_();
                        }
                        if ((_a = result.data) === null || _a === void 0 ? void 0 : _a.buffer) {
                            chunk = new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength);
                            controller.enqueue(chunk);
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _b.sent();
                        controller.error(error_1.toString());
                        this.onError_();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); })();
    };
    return UsbEndpointUnderlyingSource;
}());
/**
 * Implementation of the underlying sink API[2] which writes data to a USB
 * endpoint. This can be used to construct a WritableStream.
 *
 * [2]: https://streams.spec.whatwg.org/#underlying-sink-api
 */
var UsbEndpointUnderlyingSink = /** @class */ (function () {
    /**
     * Constructs a new UnderlyingSink that will write data to the specified
     * endpoint on the given USB device.
     *
     * @param {USBDevice} device
     * @param {USBEndpoint} endpoint
     * @param {function} onError function to be called on error
     */
    function UsbEndpointUnderlyingSink(device, endpoint, onError) {
        this.device_ = device;
        this.endpoint_ = endpoint;
        this.onError_ = onError;
    }
    /**
     * Writes a chunk to the device.
     *
     * @param {Uint8Array} chunk
     * @param {WritableStreamDefaultController} controller
     */
    UsbEndpointUnderlyingSink.prototype.write = function (chunk, controller) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.device_.transferOut(this.endpoint_.endpointNumber, chunk)];
                    case 1:
                        result = _a.sent();
                        if (result.status != 'ok') {
                            controller.error(result.status);
                            this.onError_();
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _a.sent();
                        controller.error(error_2.toString());
                        this.onError_();
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return UsbEndpointUnderlyingSink;
}());
/** a class used to control serial devices over WebUSB */
var SerialPort = /** @class */ (function () {
    /**
     * constructor taking a WebUSB device that creates a SerialPort instance.
     * @param {USBDevice} device A device acquired from the WebUSB API
     * @param {SerialPolyfillOptions} polyfillOptions Optional options to
     * configure the polyfill.
     */
    function SerialPort(device, polyfillOptions) {
        this.polyfillOptions_ = __assign(__assign({}, kDefaultPolyfillOptions), polyfillOptions);
        this.outputSignals_ = {
            dataTerminalReady: false,
            requestToSend: false,
            "break": false
        };
        this.device_ = device;
        this.controlInterface_ = findInterface(this.device_, this.polyfillOptions_.usbControlInterfaceClass);
        this.transferInterface_ = findInterface(this.device_, this.polyfillOptions_.usbTransferInterfaceClass);
        this.inEndpoint_ = findEndpoint(this.transferInterface_, 'in');
        this.outEndpoint_ = findEndpoint(this.transferInterface_, 'out');
    }
    Object.defineProperty(SerialPort.prototype, "readable", {
        /**
         * Getter for the readable attribute. Constructs a new ReadableStream as
         * necessary.
         * @return {ReadableStream} the current readable stream
         */
        get: function () {
            var _this = this;
            var _a;
            if (!this.readable_ && this.device_.opened) {
                this.readable_ = new ReadableStream(new UsbEndpointUnderlyingSource(this.device_, this.inEndpoint_, function () {
                    _this.readable_ = null;
                }), new ByteLengthQueuingStrategy({
                    highWaterMark: (_a = this.serialOptions_.bufferSize) !== null && _a !== void 0 ? _a : kDefaultBufferSize
                }));
            }
            return this.readable_;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SerialPort.prototype, "writable", {
        /**
         * Getter for the writable attribute. Constructs a new WritableStream as
         * necessary.
         * @return {WritableStream} the current writable stream
         */
        get: function () {
            var _this = this;
            var _a;
            if (!this.writable_ && this.device_.opened) {
                this.writable_ = new WritableStream(new UsbEndpointUnderlyingSink(this.device_, this.outEndpoint_, function () {
                    _this.writable_ = null;
                }), new ByteLengthQueuingStrategy({
                    highWaterMark: (_a = this.serialOptions_.bufferSize) !== null && _a !== void 0 ? _a : kDefaultBufferSize
                }));
            }
            return this.writable_;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * a function that opens the device and claims all interfaces needed to
     * control and communicate to and from the serial device
     * @param {SerialOptions} options Object containing serial options
     * @return {Promise<void>} A promise that will resolve when device is ready
     * for communication
     */
    SerialPort.prototype.open = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.serialOptions_ = options;
                        this.validateOptions();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 10, , 13]);
                        return [4 /*yield*/, this.device_.open()];
                    case 2:
                        _a.sent();
                        if (!(this.device_.configuration === null)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.device_.selectConfiguration(1)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [4 /*yield*/, this.device_.claimInterface(this.controlInterface_.interfaceNumber)];
                    case 5:
                        _a.sent();
                        if (!(this.controlInterface_ !== this.transferInterface_)) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.device_.claimInterface(this.transferInterface_.interfaceNumber)];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [4 /*yield*/, this.setLineCoding()];
                    case 8:
                        _a.sent();
                        return [4 /*yield*/, this.setSignals({ dataTerminalReady: true })];
                    case 9:
                        _a.sent();
                        return [3 /*break*/, 13];
                    case 10:
                        error_3 = _a.sent();
                        if (!this.device_.opened) return [3 /*break*/, 12];
                        return [4 /*yield*/, this.device_.close()];
                    case 11:
                        _a.sent();
                        _a.label = 12;
                    case 12: throw new Error(alert("not"));
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Closes the port.
     *
     * @return {Promise<void>} A promise that will resolve when the port is
     * closed.
     */
    SerialPort.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            var promises;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        promises = [];
                        if (this.readable_) {
                            promises.push(this.readable_.cancel());
                        }
                        if (this.writable_) {
                            promises.push(this.writable_.abort());
                        }
                        return [4 /*yield*/, Promise.all(promises)];
                    case 1:
                        _a.sent();
                        this.readable_ = null;
                        this.writable_ = null;
                        if (!this.device_.opened) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.setSignals({ dataTerminalReady: false, requestToSend: false })];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.device_.close()];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * A function that returns properties of the device.
     * @return {SerialPortInfo} Device properties.
     */
    SerialPort.prototype.getInfo = function () {
        return {
            usbVendorId: this.device_.vendorId,
            usbProductId: this.device_.productId
        };
    };
    /**
     * A function used to change the serial settings of the device
     * @param {object} options the object which carries serial settings data
     * @return {Promise<void>} A promise that will resolve when the options are
     * set
     */
    SerialPort.prototype.reconfigure = function (options) {
        this.serialOptions_ = __assign(__assign({}, this.serialOptions_), options);
        this.validateOptions();
        return this.setLineCoding();
    };
    /**
     * Sets control signal state for the port.
     * @param {SerialOutputSignals} signals The signals to enable or disable.
     * @return {Promise<void>} a promise that is resolved when the signal state
     * has been changed.
     */
    SerialPort.prototype.setSignals = function (signals) {
        return __awaiter(this, void 0, void 0, function () {
            var value, value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.outputSignals_ = __assign(__assign({}, this.outputSignals_), signals);
                        if (!(signals.dataTerminalReady !== undefined ||
                            signals.requestToSend !== undefined)) return [3 /*break*/, 2];
                        value = (this.outputSignals_.dataTerminalReady ? 1 << 0 : 0) |
                            (this.outputSignals_.requestToSend ? 1 << 1 : 0);
                        return [4 /*yield*/, this.device_.controlTransferOut({
                                'requestType': 'class',
                                'recipient': 'interface',
                                'request': kSetControlLineState,
                                'value': value,
                                'index': this.controlInterface_.interfaceNumber
                            })];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!(signals["break"] !== undefined)) return [3 /*break*/, 4];
                        value = this.outputSignals_["break"] ? 0xFFFF : 0x0000;
                        return [4 /*yield*/, this.device_.controlTransferOut({
                                'requestType': 'class',
                                'recipient': 'interface',
                                'request': kSendBreak,
                                'value': value,
                                'index': this.controlInterface_.interfaceNumber
                            })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Checks the serial options for validity and throws an error if it is
     * not valid
     */
    SerialPort.prototype.validateOptions = function () {
        if (!this.isValidBaudRate(this.serialOptions_.baudRate)) {
            throw new RangeError('invalid Baud Rate ' + this.serialOptions_.baudRate);
        }
        if (!this.isValidDataBits(this.serialOptions_.dataBits)) {
            throw new RangeError('invalid dataBits ' + this.serialOptions_.dataBits);
        }
        if (!this.isValidStopBits(this.serialOptions_.stopBits)) {
            throw new RangeError('invalid stopBits ' + this.serialOptions_.stopBits);
        }
        if (!this.isValidParity(this.serialOptions_.parity)) {
            throw new RangeError('invalid parity ' + this.serialOptions_.parity);
        }
    };
    /**
     * Checks the baud rate for validity
     * @param {number} baudRate the baud rate to check
     * @return {boolean} A boolean that reflects whether the baud rate is valid
     */
    SerialPort.prototype.isValidBaudRate = function (baudRate) {
        return baudRate % 1 === 0;
    };
    /**
     * Checks the data bits for validity
     * @param {number} dataBits the data bits to check
     * @return {boolean} A boolean that reflects whether the data bits setting is
     * valid
     */
    SerialPort.prototype.isValidDataBits = function (dataBits) {
        if (typeof dataBits === 'undefined') {
            return true;
        }
        return kAcceptableDataBits.includes(dataBits);
    };
    /**
     * Checks the stop bits for validity
     * @param {number} stopBits the stop bits to check
     * @return {boolean} A boolean that reflects whether the stop bits setting is
     * valid
     */
    SerialPort.prototype.isValidStopBits = function (stopBits) {
        if (typeof stopBits === 'undefined') {
            return true;
        }
        return kAcceptableStopBits.includes(stopBits);
    };
    /**
     * Checks the parity for validity
     * @param {string} parity the parity to check
     * @return {boolean} A boolean that reflects whether the parity is valid
     */
    SerialPort.prototype.isValidParity = function (parity) {
        if (typeof parity === 'undefined') {
            return true;
        }
        return kAcceptableParity.includes(parity);
    };
    /**
     * sends the options alog the control interface to set them on the device
     * @return {Promise} a promise that will resolve when the options are set
     */
    SerialPort.prototype.setLineCoding = function () {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function () {
            var buffer, view, result;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        buffer = new ArrayBuffer(7);
                        view = new DataView(buffer);
                        view.setUint32(0, this.serialOptions_.baudRate, true);
                        view.setUint8(4, kStopBitsIndexMapping.indexOf((_a = this.serialOptions_.stopBits) !== null && _a !== void 0 ? _a : kDefaultStopBits));
                        view.setUint8(5, kParityIndexMapping.indexOf((_b = this.serialOptions_.parity) !== null && _b !== void 0 ? _b : kDefaultParity));
                        view.setUint8(6, (_c = this.serialOptions_.dataBits) !== null && _c !== void 0 ? _c : kDefaultDataBits);
                        return [4 /*yield*/, this.device_.controlTransferOut({
                                'requestType': 'class',
                                'recipient': 'interface',
                                'request': kSetLineCoding,
                                'value': 0x00,
                                'index': this.controlInterface_.interfaceNumber
                            }, buffer)];
                    case 1:
                        result = _d.sent();
                        if (result.status != 'ok') {
                            throw new DOMException('NetworkError', 'Failed to set line coding.');
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    return SerialPort;
}());
exports.SerialPort = SerialPort;
/** implementation of the global navigator.serial object */
var Serial = /** @class */ (function () {
    function Serial() {
    }
    /**
     * Requests permission to access a new port.
     *
     * @param {SerialPortRequestOptions} options
     * @param {SerialPolyfillOptions} polyfillOptions
     * @return {Promise<SerialPort>}
     */
    Serial.prototype.requestPort = function (options, polyfillOptions) {
        return __awaiter(this, void 0, void 0, function () {
            var usbFilters, _i, _a, filter, usbFilter, device, port;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        polyfillOptions = __assign(__assign({}, kDefaultPolyfillOptions), polyfillOptions);
                        usbFilters = [];
                        if (options && options.filters) {
                            for (_i = 0, _a = options.filters; _i < _a.length; _i++) {
                                filter = _a[_i];
                                usbFilter = {
                                    classCode: polyfillOptions.usbControlInterfaceClass
                                };
                                if (filter.usbVendorId !== undefined) {
                                    usbFilter.vendorId = filter.usbVendorId;
                                }
                                if (filter.usbProductId !== undefined) {
                                    usbFilter.productId = filter.usbProductId;
                                }
                                usbFilters.push(usbFilter);
                            }
                        }
                        if (usbFilters.length === 0) {
                            usbFilters.push({
                                classCode: polyfillOptions.usbControlInterfaceClass
                            });
                        }
                        return [4 /*yield*/, navigator.usb.requestDevice({ 'filters': usbFilters })];
                    case 1:
                        device = _b.sent();
                        port = new SerialPort(device, polyfillOptions);
                        return [2 /*return*/, port];
                }
            });
        });
    };
    /**
     * Get the set of currently available ports.
     *
     * @param {SerialPolyfillOptions} polyfillOptions Polyfill configuration that
     * should be applied to these ports.
     * @return {Promise<SerialPort[]>} a promise that is resolved with a list of
     * ports.
     */
    Serial.prototype.getPorts = function (polyfillOptions) {
        return __awaiter(this, void 0, void 0, function () {
            var devices, ports;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        polyfillOptions = __assign(__assign({}, kDefaultPolyfillOptions), polyfillOptions);
                        return [4 /*yield*/, navigator.usb.getDevices()];
                    case 1:
                        devices = _a.sent();
                        ports = [];
                        devices.forEach(function (device) {
                            try {
                                var port = new SerialPort(device, polyfillOptions);
                                ports.push(port);
                            }
                            catch (e) {
                                // Skip unrecognized port.
                            }
                        });
                        return [2 /*return*/, ports];
                }
            });
        });
    };
    return Serial;
}());
/* an object to be used for starting the serial workflow */
exports.serial = new Serial();
return exports;
});