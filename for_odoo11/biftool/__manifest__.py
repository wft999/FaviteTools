# -*- coding: utf-8 -*-
{
    'name': "biftool",

    'summary': """
        Short (1 phrase/line) summary of the module's purpose, used as
        subtitle on modules listing or apps.openerp.com""",

    'description': """
        Long description of module's purpose
    """,

    'author': "Favite INC",
    'website': "http://www.favite.com",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/master/odoo/addons/base/module/module_data.xml
    # for the full list
    'category': 'Favite Tools',
    'version': '1.0',

    # any module necessary for this one to work correctly
    'depends': ['web','padtool'],

    # always loaded
    'data': [
        'security/bif_security.xml',
        'security/ir.model.access.csv',
        
        'data/camera_para.xml',
        'data/region_para.xml',
        'data/mark_para.xml',
        'data/gsp_para.xml',
        'data/subpanel_para.xml',
        'data/common_para.xml',
        'data/config_para.xml',
        'data/auops_check_para.xml',
        'data/cellneighbor_check_para.xml',
        
        'views/templates.xml',
        'views/views.xml',
        'views/res_config_settings_views.xml',
        'wizard/bif_publish_wizard_views.xml',
    ],
    # only loaded in demonstration mode
    'demo': [
        'demo/demo.xml',
    ],
    'qweb': [
        "static/src/xml/bif_import.xml",
    ],
    'installable': True,
    'auto_install': False,
    'application': True,
}