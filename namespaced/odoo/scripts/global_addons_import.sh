#!/bin/bash
set -exo pipefail
mkdir -p /mnt/data
rm -fr /mnt/data/*
cd /mnt/data
# -u ${MAIN_GIT_TOKEN}:x-oauth-basic
curl -sSl ${MAIN_GIT}/tarball/${MAINT_REPO} | tar zxf - --strip-components=
cd addons
set -f
array=(${$ODOO_EXTRA_MODULES//:/ })
for i in ${!array[@]}
do
    if [ -d ${array[i]} ]
    then
        cp -R ${array[i]} /mnt/extra-addon
    fi
done
cd ../
rm -r addons