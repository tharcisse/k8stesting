#!/bin/bash
set -exo pipefail
rm -fr /mnt/data/*
cd /mnt/data
mkdir -f custom
cd custom
# -u ${MAIN_GIT_TOKEN}:x-oauth-basic
curl -sSl ${MAIN_GIT}/tarball/${MAINT_REPO} | tar zxf - --strip-components=1
cp -R * /mnt/extra-addons
cd ../
rm -r custom
