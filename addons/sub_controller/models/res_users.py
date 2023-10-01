import requests
from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
import logging
_logger = logging.getLogger(__name__)


class ResUsers(models.Model):
    _inherit = 'res.users'

    @api.constrains('login')
    def _constrain_user_limit(self):
        config_parameter_obj_sudo = self.env["ir.config_parameter"].sudo()
        user_limit = config_parameter_obj_sudo.get_param('sub.saas.erp', 0)
        if user_limit:
            users = self.search([])
            if len(users) >= int(user_limit):
                raise ValidationError(_('You have reached user limit in your subscription'))

    @api.model
    def _do_request(self, method, endpoint_url, payload=None, headers=None, **kwargs):
        try:
            cookies = kwargs.get('cookies', None)
            payload_json = kwargs.get('payload_json', None)
            files = kwargs.get('files', None)
            response = requests.request(method,
                                        endpoint_url,
                                        data=payload,
                                        json=payload_json,
                                        headers=headers,
                                        timeout=60,
                                        cookies=cookies,
                                        files=files)
            response.raise_for_status()
        except requests.exceptions.ConnectionError:
            _logger.exception("unable to reach endpoint at %s", endpoint_url)
            raise ValidationError(
                "API: " +
                _("Could not establish the connection to the API."))
        except requests.exceptions.HTTPError as error:
            raise ValidationError(" Error " + str(response.status_code) +
                                  str(response.text.replace("\\/", "/").encode().decode('unicode-escape')))
        return response

    @api.model
    def retreive_access_rights(self):
        config_parameter_obj_sudo = self.env["ir.config_parameter"].sudo()
        saas_url = config_parameter_obj_sudo.get_param('saas.manager.url', '')
        subscription = config_parameter_obj_sudo.get_param('saas.subscription.num', '')
        pod_code = config_parameter_obj_sudo.get_param('saas.pod.code')
        headers = {
            'Content-Type': 'application/json'
        }
        if saas_url and subscription:
            response = self._do_request('GET', saas_url + '/access_rights',
                                        payload_json={'subscription': subscription, 'pod_code': pod_code},
                                        headers=headers)

    @api.model
    def update_user_count(self):
        config_parameter_obj_sudo = self.env["ir.config_parameter"].sudo()
        saas_url = config_parameter_obj_sudo.get_param('saas.manager.url', '')
        subscription = config_parameter_obj_sudo.get_param('saas.subscription.num', '')
        pod_code = config_parameter_obj_sudo.get_param('saas.pod.code', '')
        headers = {
            'Content-Type': 'application/json'
        }
        if saas_url and subscription and pod_code:
            response = self._do_request('GET', saas_url + '/user_count',
                                        payload_json={'subscription': subscription, 'pod_code': pod_code},
                                        headers=headers)
            response = response.json()
            user = response.get('user_count', 0)
            expiry_date = response.get('expiry_date', fields.Date.to_string(fields.Date.today()))
            is_trial = response.get('is_trial', False)
            _logger.info(f'UPDATED VALUES {response}')
            config_parameter_obj_sudo.set_param('sub.saas.erp', int(user))
            config_parameter_obj_sudo.set_param('saas.subscription.enddate', expiry_date)
            config_parameter_obj_sudo.set_param('saas.subscription.trial', is_trial)
