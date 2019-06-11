# -*- coding: utf-8 -*-

from odoo import models, fields, api
from odoo.tools import pycompat,safe_eval,constraint_definition,drop_constraint,add_constraint
from odoo.exceptions import UserError, ValidationError
from suds import null
from numpy.f2py.auxfuncs import isinteger



class CommonModel(models.Model):
    _auto = True                # automatically create database backend
    _register = False           # not visible in ORM registry, meant to be python-inherited only
    _abstract = False           # not abstract
    _transient = False          # not transient

