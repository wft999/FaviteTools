# -*- coding: utf-8 -*-
{
    'name': "p2p",

    'summary': """
        Short (1 phrase/line) summary of the module's purpose, used as
        subtitle on modules listing or apps.openerp.com""",

    'description': """
        Long description of module's purpose
    """,

    'author': "My Company",
    'website': "http://www.yourcompany.com",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/13.0/odoo/addons/base/data/ir_module_category_data.xml
    # for the full list
    'category': 'Services/P2p',
    'version': '0.1',

    # any module necessary for this one to work correctly
    'depends': ['base','mail','rating','web'],

    # always loaded
    'data': [
        'security/p2p_security.xml',
        'security/ir.model.access.csv',
        'views/course.xml',
        'views/lesson.xml',
        'views/learning.xml',
        'views/templates.xml',
        'views/res_users_views.xml',
        'data/p2p_course_category.xml'
    ],
    'qweb': [
        "static/src/xml/discuss.xml",
    ],
    # only loaded in demonstration mode
    'demo': [
        'demo/demo.xml',
    ],
    'installable': True,
    'auto_install': False,
    'application': True,
}
