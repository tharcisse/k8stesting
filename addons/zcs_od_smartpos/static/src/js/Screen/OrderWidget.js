

odoo.define('zcs_od_smartpos.OrderWidget', function (require) {
    'use strict';

    const Registries = require('point_of_sale.Registries');
    const OrderWidget = require('point_of_sale.OrderWidget');

    const MyOrderWidget = (OrderWidget) =>
        class extends OrderWidget {
            async _updateSummary() {
                var self = this;
                const total = this.order ? this.order.get_total_with_tax() : 0;
                var total_print = this.env.pos.format_currency(total);
                super._updateSummary();
               
                    var $canevas = $('#amountcontainer');
                    if (!$canevas.length) return;
                   
                    $canevas.append('<div class="vertical-center"><p>' + total_print + "</p></div>");

                    const image_64 = await self.printToCanvas($canevas);
                    var message = JSON.stringify({ 'data': image_64, 'clear': true })
               
            }
            async printToCanvas(elt) {
                var self = this;

                var promise = new Promise(function (resolve, reject) {
                    html2canvas(elt, {
                        onparsed: function (queue) {
                            queue.stack.ctx.height = Math.ceil(elt.height());
                            queue.stack.ctx.width = Math.ceil(elt.width());
                        },
                        onclone: function(doc){
			    hiddenDiv = doc.getElementById('amountcontainer');
			    hiddenDiv.style.opacity = '1.0';
			},
                        onrendered: function (canvas) {
                            $('#amountcontainer').empty();
                            resolve(canvas.toDataURL('image/jpeg').replace('data:image/jpeg;base64,', ''));
                        },
                        letterRendering: false,
                    })
                });
                return promise;
            }
        }
    Registries.Component.extend(OrderWidget, MyOrderWidget);
    return OrderWidget;
});
