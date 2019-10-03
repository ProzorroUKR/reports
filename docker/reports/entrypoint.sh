#!/bin/bash

sleep 10
init -c etc/reports.yaml
# production
# gunicorn --bind 0.0.0.0:8000 --worker-class gevent reports.interface:app
# development
python reports/interface.py