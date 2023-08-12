from odoo import models, api, fields


class CustomOrderLine(models.Model):
    _name = 'pos.custom.order.line'
    _description = 'POS Custom Order Line'
    _rec_name = 'full_product_name'
    full_product_name = fields.Char()
    qty = fields.Integer()
    order_id = fields.Many2one('pos.custom.order', 'order')
    order_status = fields.Selection(string="Order Status",
                                    selection=[("draft", "Draft"),
                                               ("waiting", "Cooking"),
                                               ("ready", "Ready"),
                                               ("cancel", "Cancel")],
                                    default='draft',
                                    help='To know the status of order')


class CustomOrder(models.Model):
    _name = 'pos.custom.order'
    _description = 'POS Custom order'

    name = fields.Char()
    lines = fields.One2many('pos.custom.order.line', 'order_id', "lines")
    config_id = fields.Many2one('pos.config', required=1)
    order_status = fields.Selection(string="Order Status",
                                    selection=[("draft", "Draft"),
                                               ("waiting", "Cooking"),
                                               ("ready", "Ready"),
                                               ("cancel", "Cancel")],
                                    default='draft',
                                    help='To know the status of order')
    date = fields.Date(default=fields.Date.today())
    type = fields.Char('Type', default='custom')
    user_id = fields.Many2one('res.users', default=lambda self: self.env.user)

    # @api.model
    def create_from_kitchen(self, order):
        if order:
            lines = []
            for line in order['lines']:
                if line['name'] and line['qty']:
                    lines.append((0, 0, {'full_product_name': line['name'],
                                        'qty': int(line['qty'])}))

            return self.create(
                {
                    'name': order['name'],
                    'lines': lines,
                    'config_id': order["shop_id"]
                }
            )

    def get_details(self, shop_id):
        pos = self.env["pos.custom.order"].search(
            [('config_id', '=', shop_id), ('date', '=', fields.Date.today())], order="date")
        if not pos:
            pos = self.env["pos.custom.order"].search(
                [('config_id', '=', shop_id)], order="date")
        pos_datas = pos.read()
        pos_datas_lines = pos.lines.read()
        for pd in pos_datas:
            pd["id"] = f'custom_{pd["id"]}'
            lns = []
            for ln in pd["lines"]:
                lns.append("custom_"+str(ln))
            pd["lines"] = lns
        for line in pos_datas_lines:
            line["id"] = f'custom_{line["id"]}'
        values = {"orders": pos_datas, "order_lines": pos_datas_lines}
        return values
