from odoo import models, fields, api


class PosPaymentMethod(models.Model):
    _inherit = 'pos.payment.method'

    def _get_payment_terminal_selection(self):
        return super()._get_payment_terminal_selection() + [
            ('pax', 'PAX DEVICE')
        ]
    pax_device_brand = fields.Selection([('A920', 'A920'), ('A920PRO', 'A920pro')], string="PAX DEVICE", default='A920')
    show_details = fields.Selection([('Y', 'YES'), ('N', 'NO')], default='Y')
    print = fields.Boolean('Print on device', default=True)
    subtype = fields.Selection([('mada', 'MADA'), ('other', 'OTHER')], default='other')
    connection_mode = fields.Selection([('websocket', 'Websocket'), ('direct', 'Direct')], default='direct')
    odoows_connector_url = fields.Char("Proxy url")
