/** @odoo-module **/

import ProductScreen from 'point_of_sale.ProductScreen';
import Registries from 'point_of_sale.Registries';
const rpc = require('web.rpc');
const { Gui } = require('point_of_sale.Gui');
var core = require('web.core');
var _t = core._t;
//Extending the ProductScreen for adding validation for kitchen orders
export const KitchenProductScreen = (ProductScreen) =>
    class extends ProductScreen {
        setup() {
            super.setup();
        }
    };
Registries.Component.extend(ProductScreen, KitchenProductScreen);
