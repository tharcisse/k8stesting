{
    'name': 'ZCS SmartPos Printer',
    'version': '1.0',
    'description': '',
    'summary': '',
    'author': '',
    'website': '',
    'license': 'LGPL-3',
    'category': 'point_of_sale',
    'depends': [
        'point_of_sale'
    ],


    'auto_install': False,
    'application': False,
    'assets':  {
        'point_of_sale.assets': [
            'zcs_od_smartpos/static/src/css/print.css',
            'zcs_od_smartpos/static/src/js/Screen/OrderWidget.js',
            'zcs_od_smartpos/static/src/js/print.js',
            'zcs_od_smartpos/static/src/js/Screen/PaymentScreen.js'
        ],
        'web.assets_qweb': [
          'zcs_od_smartpos/static/src/xml/OrderWidget.xml'
        ],
    }
}
