#!/bin/bash
FILE=/mnt/extra-addons/requirements.txt
if test -f "$FILE"; then
    pip3 install -r /mnt/extra-addons/requirements.txt
    service odoo restart
fi