
from odoo.exceptions import UserError
codes = {


}

MAGNETIC_DATA = "010003FF0114E9"
TERMINAL_PROPERTY_CODE = "09FF0106DF0D03"
SET_TERMINAL_SETTINGS_CODE = "09FF0106DF0D03"
GET_TERMINAL_SETTINGS_CODE = "010003FF0106FB"
MERCHANT_INFO_CODE = "010003FF010AF7"
CHECK_STATUS_SYNC = "010003FF0104F9"
CHECK_KEYPAD_STATUS = "010003FF0107FA"
TEST_CONNECTION = "010003FF0104F9"
RESEND_LAST_REQUEST_CODE = "010003FF010BF6"
CANCEL_REQUEST = "010002373207"
RECONCILIATION_CODE = "FF0109DF610A3"
RECONCILIATION_MASK = "FFFFFFFFFFFFFFFFFF"
TERMINAL_ID_REQUEST = "010003FF0107FA"
AUTHORIZATION_CODE = "FF010CDF0406"
PRINTSETTING_CODE = "DF610A3"
TRANSACTION_MASK = "FFFFFFFFFFFFFFFFFFDF81"
DATA_START = "0100"
PURCHASE_CODE = "FF0100DF0406"
PURCHASE_WITH_CASHBACK_CODE = "FF0100DF0406"
PURCHASE_WITH_SUBSCRIPTION_CODE = "FF0100DF0406"
SUBSCRIPTION_CODE = "DF86"
CASHBACK_CODE = "DF3606"
CASH_ADVANCE_CODE = "FF010EDF0406"
REVERSAL_CODE = "FF0103DF81"
REFUND_CODE = "FF0102DF0406"
REFUND_WITH_CARD_NUM_CODE = "FF0102DF0406"
REFUND_RRN_CODE = "DF25"
REFUND_DATE_CODE = "DF24"
CARD_NUM_CODE = "DF02"
ADVICE_TRANSACTION_CODE = "FF010DDF0406"
AUTH_CODE = "DF38"


def calcLRC(input):

    lrc = ord(input[0])

    for i in range(1, len(input)):
        lrc ^= ord(input[i])
    return lrc


def convertToSerial(trans_code, **kwargs):
    result = ""
    data_str = ""

    app_id = kwargs.get('app_id', '11')
    print_settings = kwargs.get('print_settings', '1')
    amount = str(kwargs.get('amount', '0')).zfill(12)
    cash_back = str(kwargs.get('cash_back', '0')).zfill(12)
    subscription = "".join([f'{ord(c):x}' for c in kwargs.get('subscription', '')])
    if trans_code in [MAGNETIC_DATA,
                      GET_TERMINAL_SETTINGS_CODE,
                      MERCHANT_INFO_CODE,
                      RESEND_LAST_REQUEST_CODE,
                      CHECK_KEYPAD_STATUS,
                      TEST_CONNECTION,
                      CANCEL_REQUEST,
                      TERMINAL_ID_REQUEST,
                      CHECK_STATUS_SYNC]:
        result = trans_code
    elif trans_code == SET_TERMINAL_SETTINGS_CODE:
        if kwargs.get('menu') and kwargs.get('printer') and kwargs.get('speed'):
            speed = kwargs.get('speed')
            end_code = "5"
            main_cmd = trans_code + "3"+kwargs.get('menu')+"3"+kwargs.get('printer')+3+end_code
            end_encoded = ""  # To be imporoved
            result = DATA_START + main_cmd+end_encoded
        else:
            raise UserError('Menu,printer and speed parameter are mandatory')
    else:
        ecr_num = kwargs.get('ecr_num', '')
        ecr_num_length_str = str(ecr_num.length).zfill(2)
        ecr_num_hex = "".join([f'{ord(c):x}' for c in ecr_num])
        rrn = kwargs.get('rrn', '')
        rrn_length_str = str(rrn.length).zfill(2)
        rrn_hex = "".join([f'{ord(c):x}' for c in rrn])
        trans_date = kwargs.get('trans_date', '')
        trans_date_length_str = str(trans_date.length).zfill(2)
        trans_date_hex = "".join([f'{ord(c):x}' for c in trans_date])

        card_num = kwargs.get('card_num', '')
        card_num_length_str = str(card_num.length).zfill(2)
        card_num_hex = "".join([f'{ord(c):x}' for c in card_num])
        auth_code = kwargs.get('auth_code', '')
        auth_code_length_str = str(auth_code.length).zfill(2)
        auth_code_hex = "".join([f'{ord(c):x}' for c in auth_code])

        if trans_code == RECONCILIATION_CODE:
            data_str = trans_code + print_settings + RECONCILIATION_MASK
        elif trans_code == AUTHORIZATION_CODE:
            data_str = trans_code + amount + PRINTSETTING_CODE + print_settings + TRANSACTION_MASK + ecr_num_length_str + ecr_num_hex + app_id
        elif trans_code == PURCHASE_CODE:
            data_str = trans_code + amount + PRINTSETTING_CODE + print_settings + TRANSACTION_MASK + ecr_num_length_str + ecr_num_hex + app_id
        elif trans_code == CASH_ADVANCE_CODE:
            data_str = trans_code + amount + PRINTSETTING_CODE + print_settings + TRANSACTION_MASK + ecr_num_length_str + ecr_num_hex + app_id
        elif trans_code == PURCHASE_WITH_CASHBACK_CODE:
            data_str = trans_code + amount + CASHBACK_CODE + cash_back + PRINTSETTING_CODE + \
                print_settings + TRANSACTION_MASK + ecr_num_length_str + ecr_num_hex + app_id
        elif trans_code == PURCHASE_WITH_SUBSCRIPTION_CODE:
            data_str = trans_code + amount + SUBSCRIPTION_CODE + subscription + PRINTSETTING_CODE + \
                print_settings + TRANSACTION_MASK + ecr_num_length_str + ecr_num_hex + app_id
        elif trans_code == REVERSAL_CODE:
            data_str = trans_code + ecr_num_length_str + ecr_num_hex + app_id
        elif trans_code == REFUND_CODE:
            data_str = trans_code + amount + REFUND_RRN_CODE + rrn_length_str + rrn_hex + REFUND_DATE_CODE + trans_date_length_str + \
                trans_date_hex + PRINTSETTING_CODE + print_settings + TRANSACTION_MASK + ecr_num_length_str + ecr_num_hex + app_id
        elif trans_code == REFUND_WITH_CARD_NUM_CODE:
            data_str = trans_code + amount + REFUND_RRN_CODE + rrn_length_str + rrn_hex + CARD_NUM_CODE + card_num_length_str + \
                card_num_hex + PRINTSETTING_CODE + print_settings + TRANSACTION_MASK + ecr_num_length_str + ecr_num_hex + app_id
        elif trans_code == ADVICE_TRANSACTION_CODE:
            data_str = trans_code + amount + AUTH_CODE + auth_code_length_str + auth_code_hex + \
                PRINTSETTING_CODE + print_settings + TRANSACTION_MASK + ecr_num_length_str + ecr_num_hex + app_id

        if data_str:
            encoded_length = str(len(data_str)/2).zfill(2)
            result = DATA_START + encoded_length+data_str+str(calcLRC("00" + encoded_length + data_str)).trim()

    return result
