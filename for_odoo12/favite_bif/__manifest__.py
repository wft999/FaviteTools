# -*- coding: utf-8 -*-
{
    'name': "favite_bif",

    'summary': """
        Short (1 phrase/line) summary of the module's purpose, used as
        subtitle on modules listing or apps.openerp.com""",

    'description': """
        Long description of module's purpose
    """,

    'author': "My Company",
    'website': "http://www.yourcompany.com",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/12.0/odoo/addons/base/data/ir_module_category_data.xml
    # for the full list
    'category': 'Uncategorized',
    'version': '0.1',

    # any module necessary for this one to work correctly
    'depends': ['base','favite_gmd'],

    # always loaded
    'data': [
        'security/ir.model.access.csv',
#         'views/panel.xml',
        'views/pad.xml',
        'views/gsp.xml',
        'views/bif.xml',
        'views/subbif.xml',
        'views/templates.xml',
        
        'data/bif.xml',
        'data/gsp.xml',
        'data/pad.xml',
        'data/subbif.xml',

    ],
    # only loaded in demonstration mode
    'demo': [
        'demo/demo.xml',
    ],
    'qweb': [
        "static/src/xml/info.xml",
    ],

    'installable': True,
    'auto_install': False,
    'application': True,
    
#     'post_load':'start_watchdog'
}