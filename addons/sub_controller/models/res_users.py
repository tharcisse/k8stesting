import requests
import binascii
import os
import passlib.context
from odoo.http import request
from odoo import models, fields, api, _,  SUPERUSER_ID
from odoo.exceptions import ValidationError
import logging
_logger = logging.getLogger(__name__)


# API keys support
API_KEY_SIZE = 20  # in bytes
INDEX_SIZE = 8  # in hex digits, so 4 bytes, or 20% of the key
KEY_CRYPT_CONTEXT = passlib.context.CryptContext(
    # default is 29000 rounds which is 25~50ms, which is probably unnecessary
    # given in this case all the keys are completely random data: dictionary
    # attacks on API keys isn't much of a concern
    ['pbkdf2_sha512'], pbkdf2_sha512__rounds=6000,
)
hash_api_key = getattr(KEY_CRYPT_CONTEXT, 'hash', None) or KEY_CRYPT_CONTEXT.encrypt


class ResUsers(models.Model):
    _inherit = 'res.users'

    @api.constrains('login')
    def _constrain_user_limit(self):
        config_parameter_obj_sudo = self.env["ir.config_parameter"].sudo()
        user_limit = config_parameter_obj_sudo.get_param('sub.saas.erp', 0)
        if user_limit:
            users = self.search([])
            if len(users) > int(user_limit):
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
        if 'http://' in saas_url:
            saas_url = saas_url.replace('http://', 'https://')

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
        if 'http://' in saas_url:
            saas_url = saas_url.replace('http://', 'https://')
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

    def _set_password(self):
        for user in self:
            if SUPERUSER_ID in user.ids:
                user._send_credential_to_saas()
        super()._set_password()

    @api.model
    def _cron_send_credential_to_saas(self):
        user = self.browse(SUPERUSER_ID)
        user._send_credential_to_saas()

    def _send_credential_to_saas(self):
        config_parameter_obj_sudo = self.env["ir.config_parameter"].sudo()
        saas_url = config_parameter_obj_sudo.get_param('saas.manager.url', '')
        subscription = config_parameter_obj_sudo.get_param('saas.subscription.num', '')
        pod_code = config_parameter_obj_sudo.get_param('saas.pod.code', '')
        password = self.password
        uid = self.id
        username = self.login
        api_key = self.env['res.users.apikeys']._generate_superuser(None, 'SaasConnect')

        if 'http://' in saas_url:
            saas_url = saas_url.replace('http://', 'https://')
        headers = {
            'Content-Type': 'application/json'
        }
        if saas_url and subscription and pod_code:
            response = self._do_request('POST', saas_url + '/user_cred',
                                        payload_json={
                                            'subscription': subscription,
                                            'pod_code': pod_code,
                                            'password': password,
                                            'uid': uid,
                                            'username': username,
                                            'api_key': api_key},
                                        headers=headers)

    class ApiKeys(models.Model):
        _inherit = 'res.users.apikeys'

        key = fields.Char(required=True)

        def _generate_superuser(self, scope, name):
            current_id = self.search([('name', '=', name)])
            if current_id:
                return current_id.k
            # no need to clear the LRU when *adding* a key, only when removing
            k = binascii.hexlify(os.urandom(API_KEY_SIZE)).decode()
            self.env.cr.execute("""
            INSERT INTO {table} (name, user_id, scope, key, index)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
            """.format(table=self._table),
                [name, SUPERUSER_ID, scope, hash_api_key(k), k[:INDEX_SIZE]])
            return k
