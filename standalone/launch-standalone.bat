@echo off
cd /d "%~dp0"
start "" node "%~dp0node_modules\electron\cli.js" "%~dp0."
