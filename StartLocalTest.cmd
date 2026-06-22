@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0StartLocalTest.ps1" %*
