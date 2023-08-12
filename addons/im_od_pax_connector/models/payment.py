from odoo import models, fields,api


class Payment(models.Model):
    _inherit = 'pos.payment'

    pax_terminalid = fields.Char()
    card_number = fields.Char()
    entry_mode = fields.Char()
    merchantid = fields.Char()
    signature_required = fields.Boolean()
    payment_log = fields.Text()
    use_payment_terminal = fields.Char(compute="_compute_payment_terminal",
                                       store=True)
    @api.depends('payment_method_id')
    def _compute_payment_terminal(self):
        for rec in self:
            value = ''
            if rec.payment_method_id and rec.payment_method_id.use_payment_terminal:
                value = rec.payment_method_id.use_payment_terminal
            rec.use_payment_terminal = value

    def _export_for_ui(self, payment):
        result = super()._export_for_ui(payment)
        result.update(
            pax_terminalid=payment.pax_terminalid,
            card_number=payment.card_number,
            entry_mode=payment.entry_mode,
            merchantid=payment.merchantid,
            signature_required=payment.signature_required
        )
        return result
