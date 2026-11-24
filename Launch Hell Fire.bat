@echo off
title Hell Fire Browser
cd /d "%~dp0standalone"
start "" "%~dp0standalone\node_modules\electron\dist\electron.exe" .
exit
