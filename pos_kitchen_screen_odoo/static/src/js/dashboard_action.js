odoo.define('pos_kitchen_screen_odoo.dashboard_action', function (require) {
    "use strict";
    var AbstractAction = require('web.AbstractAction');
    var core = require('web.core');
    document.write(
        unescape("%3Cscript src='https://cdn.jsdelivr.net/npm/chart.js' type='text/javascript'%3E%3C/script%3E"));
    const {
        loadAssets
    } = require("@web/core/assets");
    var QWeb = core.qweb;
    var rpc = require('web.rpc');

    //extending abstract actions for the dashboard
    var KitchenCustomDashBoard = AbstractAction.extend({
        template: 'KitchenCustomDashBoard',
        events: {
            'click .cancel_order': 'cancel_order',
            'click .accept_order': 'accept_order',
            'click .accept_order_line': 'accept_order_line',
            'click .done_order': 'done_order',
            'click .new_order': 'new_order',
            'click .ready_stage': 'ready_stage',
            'click .waiting_stage': 'waiting_stage',
            'click .draft_stage': 'draft_stage',
            'click .new_stage': 'new_stage',
            'click .add_line': 'new_line',
            'click .delete_line': 'delete_line',
        },

        //set up the dashboard template and fetch the data every 2 seconds from the backend for the dashboard
        init: function (parent, context) {
            var self = this;
            this._super(parent, context);
            setInterval(function () {
                self.fetch_data();
            }, 1000);
            this.dashboards_templates = ['KitchenOrder'];
            this.shop_id = context.context.default_lead_id;
        },
        //returning the fetched data
        willStart: async function () {
            var self = this;
            await this._super();
            return self.fetch_data();
        },
        //rendering the dashboard every 2 seconds
        start: function () {
            var self = this;
            this.set("title", 'Dashboard');
            self.stages = 'draft';
            return this._super().then(function () {
                self.render_dashboards();
                self.dashboard_render_started = true;
                setInterval(function () {
                    self.render_dashboards();
                }, 1000);
            });
        },
        stop_dash_render: function () {
            var self = this;
            if (self.dashboard_render_started) {
                self.dashboard_render_started = false;
            }
        },
        start_dash_render: function () {
            var self = this;
            if (!self.dashboard_render_started) {
                self.dashboard_render_started = true;
            }
        },


        //Used to render the dashboard
        render_dashboards: function () {
            var self = this;
            if (self.dashboard_render_started) {
                _.each(this.dashboards_templates, function (template) {
                    self.$('.o_pj_dashboard').html(QWeb.render(template, {
                        widget: self
                    }));
                });
            }
            if (self.stages == 'new') {
                self.stop_dash_render();
            }
        },
        // fetch pos order details
        fetch_data: function () {
            var self = this;
            var def1 = self._rpc({
                model: 'pos.order',
                method: 'get_details',
                args: [
                    [], self.shop_id, []
                ],
            }).then(function (result) {
                self.total_room = result['orders'];
                self.lines = result['order_lines'];
            });
            return $.when(def1);
        },
        // cancel the order from the kitchen
        cancel_order: function (e) {
            var input_id = this.$("#" + e.target.id).val();

            rpc.query({
                model: 'pos.order',
                method: 'order_progress_cancel',
                args: [
                    [], input_id
                ]
            })
        },
        // accept the order from the kitchen
        accept_order: function (e) {
            var input_id = this.$("#" + e.target.id).val();
            ScrollReveal().reveal("#" + e.target.id, {
                delay: 1000,
                duration: 2000,
                opacity: 0,
                distance: "50%",
                origin: "top",
                reset: true,
                interval: 600,
            });
            rpc.query({
                model: 'pos.order',
                method: 'order_progress_draft',
                args: [
                    [], input_id
                ]
            })
        },
        delete_line: function (e) {
            var id = e.target.id.replace("new_order_line_", "");
            this.$('.new_order_line')[parseInt(id) - 1].remove();
            var next = 0;
            for (var i = 0; i < this.$('.new_order_line').length; i++) {
                next++;
                this.$('.delete_line')[i].id = "new_order_line_" + next
            }
            if (!this.$('.new_order_line').length) {
                this.$("#order_line_header").remove();
            }
        },
        new_line: function (e) {
            var lth = this.$('.new_order_line').length;
            var next = lth + 1;
            var line_mess = "";
            line_mess = ` <tr class="new_order_line new_added_order_line">
                            <td>
                                <input class="kitchenInput new_order_line_name" type="text"
                                    />
                            </td>
                            <td>
                                <input class="kitchenInput new_order_line_qty" type="number"
                                    />
                            </td>
                            <td>
                            <button class="delete_line"
                                type="button" id="new_order_line_`
            line_mess += next;
            line_mess += `"><i class="fa fa-trash-o" ></i>
                            </button>
                        </td>
                            
                        </tr>`
            if (this.$('.new_order_line').length) {

                var $last_line = this.$('.new_order_line').last();

                $last_line.after(line_mess);
            } else if (this.$("#order_line_header").length) {
                this.$("#order_line_header").after(line_mess);
            } else if (this.$("#order_number_line").length) {
                var new_order_mess = ` <tr id="order_line_header">
                <td>
                    <span class="label text-center">Description</span>
                </td>
                <td>
                    <span class="label text-center">Qty</span>
                </td>
            </tr>`
                this.$("#order_number_line").after(new_order_mess + line_mess);
            }


        },
        new_order: function (e) {
            var self = this;
            var order = {}
            order.name = this.$('#new_order_number').val()
            order.lines = []
            order.shop_id = self.shop_id;
            for (var i = 0; i < this.$('.new_order_line_name').length; i++) {
                order.lines.push(
                    {
                        'name': this.$('.new_order_line_name')[i].value,
                        'qty': this.$('.new_order_line_qty')[i].value,
                    })
            }
            if (!order.name || !order.name.length) {
                alert("Order Number is mandatory");
                return false;
            }
            rpc.query({
                model: 'pos.custom.order',
                method: 'create_from_kitchen',
                args: [
                    [], order
                ]
            })
            self.stages = 'draft';
            self.reset_order_creator();
            self.start_dash_render();
        },
        reset_order_creator: function () {
            this.$('.new_added_order_line').remove();
            this.$("#order_line_header").remove();
            this.$('#new_order_number').val("")
        },
        //set the stage is ready to see the completed stage orders
        ready_stage: function (e) {
            var self = this;
            self.stages = 'ready';
            self.start_dash_render();
        },
        //set the stage is waiting to see the ready stage orders
        waiting_stage: function (e) {
            var self = this;
            self.stages = 'waiting';
            self.start_dash_render();
        },
        //set the stage is draft to see the cooking stage orders
        draft_stage: function (e) {
            var self = this;
            self.stages = 'draft';
            self.start_dash_render();
        },
        new_stage: function (e) {
            var self = this;
            self.stages = 'new';

        },
        // change the status of the order from the kitchen
        done_order: function (e) {
            var input_id = this.$("#" + e.target.id).val();
            rpc.query({
                model: 'pos.order',
                method: 'order_progress_change',
                args: [
                    [], input_id
                ]
            });
        },

        // change the status of the product from the kitchen
        accept_order_line: function (e) {
            var input_id = this.$("#" + e.target.id).val();
            rpc.query({
                model: 'pos.order.line',
                method: 'order_progress_change',
                args: [
                    [], input_id
                ]
            })
        },

    });
    core.action_registry.add('kitchen_custom_dashboard_tags', KitchenCustomDashBoard);
    return KitchenCustomDashBoard;
});