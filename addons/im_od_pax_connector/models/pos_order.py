from odoo import models,api


class PosOrder(models.Model):
    _inherit = 'pos.order'

    @api.model
    def _payment_fields(self, order, ui_paymentline):
        result = super()._payment_fields(order, ui_paymentline)
        for key, value in ui_paymentline.items():
            if not key in result:
                result[key] = value
        return result
