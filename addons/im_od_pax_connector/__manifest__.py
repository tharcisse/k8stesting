{
    'name': 'Universal Odoo Pax Connector',
    'version': '15.0.0.1.0',
    'description': 'Universal Odoo Pax Connector',
    'summary': 'Universal Odoo Pax Connector',
    'author': 'Imanis',
    'website': '',
    'license': 'LGPL-3',

    'depends': [
        'point_of_sale'
    ],
    'data': [
        'views/payment_method_views.xml',
        "views/payment_views.xml"
    ],

    'auto_install': False,
    'application': False,
    'assets': {
        'point_of_sale.assets': [
            
            'im_od_pax_connector/static/src/lib/sha.js',
            'im_od_pax_connector/static/src/lib/webserial.js',
            #'im_od_pax_connector/static/src/js/webecr.js',
           
            'im_od_pax_connector/static/src/js/serial.js',
            'im_od_pax_connector/static/src/js/usb.js',
            'im_od_pax_connector/static/src/js/models_serial.js',
            'im_od_pax_connector/static/src/js/pax_payment.js',
            'im_od_pax_connector/static/src/js/USBButton.js',
            'im_od_pax_connector/static/src/js/TerminalPrint.js',
            'im_od_pax_connector/static/src/js/Screen/PaymentScreen.js',

        ],
        'web.assets_qweb': [
            'im_od_pax_connector/static/src/xml/USBButton.xml',
            'im_od_pax_connector/static/src/xml/Chrome.xml',
            'im_od_pax_connector/static/src/xml/PaymentScreen.xml',
            #'im_od_pax_connector/static/src/xml/ElectronicPaymentScreen.xml',
            'im_od_pax_connector/static/src/xml/TerminalStatusPrint.xml',
        ],
    }
}
