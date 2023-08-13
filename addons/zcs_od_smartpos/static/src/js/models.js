odoo.define('zcs_od_smartpos.models', function (require) {
    'use strict';

    var models = require('point_of_sale.models');
    const { Printer } = require('point_of_sale.Printer');
    var core = require('web.core');
    var _t = core._t;
    const _super_PosModel = models.PosModel.prototype;


    models.PosModel = models.PosModel.extend({
        send_current_order_to_customer_facing_display: function () {
            var self = this;
            this.render_html_for_customer_facing_display().then(async function (rendered_html) {
                if (self.env.pos.customer_display) {
                    var $renderedHtml = $('<div>').html(rendered_html);
                    $(self.env.pos.customer_display.document.body).html($renderedHtml.find('.pos-customer_facing_display'));
                    var orderlines = $(self.env.pos.customer_display.document.body).find('.pos_orderlines_list');
                    orderlines.scrollTop(orderlines.prop("scrollHeight"));
                } else if (self.env.pos.proxy.posbox_supports_display) {
                    self.proxy.update_customer_facing_display(rendered_html);
                }
                if (ZCSCustomerDisplay) {

                    var $renderedHtmls = $('<div>').html(`
                    <div id="capture" style="padding: 10px;width:200px;height:100px background: #f5da55">
                    <h1 style="color: #000; ">EasyERPS!</h1>
                </div>`);

                    const image_64 = await self.printToCanvas($renderedHtmls);
                    var message = JSON.stringify({ 'data': image_64, 'clear': true })
                    ZCSCustomerDisplay.postMessage(message);
                }
            });
        },
        printToCanvas: function (img) {
            var self = this;
            
            var promise = new Promise(function (resolve, reject) {
                var elt = img;
                html2canvas(elt.find('#capture'), {
                    onparsed: function (queue) {
                        queue.stack.ctx.height = Math.ceil(elt.outerHeight() + elt.offset().top);
                        queue.stack.ctx.width = Math.ceil(elt.outerWidth() + 2 * elt.offset().left);
                    },
                    onrendered: function (canvas) {
                        $('#capture').empty();
                        resolve(canvas.toDataURL('image/jpeg').replace('data:image/jpeg;base64,', ''));
                    },
                    letterRendering: self.htmlToImgLetterRendering(),
                })
            });
            return promise;
        }
    });

});