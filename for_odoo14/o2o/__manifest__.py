# -*- coding: utf-8 -*-
{
    'name': "o2o",

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
    'category': 'Website/eLearning',
    'version': '0.1',

    # any module necessary for this one to work correctly
    'depends': ['website_slides'],

    # always loaded
    'data': [
        'security/ir.model.access.csv',
        'views/templates.xml',
        'data/slide_data.xml',
        #'views/snippets.xml',
        'views/slide_slide_views.xml',
        #'views/website_slides_templates_lesson.xml',
        'views/website_slides_templates_lesson_fullscreen.xml'
    ],
    'qweb': [

    ],
    # only loaded in demonstration mode
    'demo': [

    ],
    'installable': True,
    'auto_install': False,
    'application': False,
}
