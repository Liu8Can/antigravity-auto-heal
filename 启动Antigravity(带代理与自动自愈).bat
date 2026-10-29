@echo off
chcp 65001 >nul
title Antigravity 智能启动器

:: 1. 配置代理环境变量 (与您原有的代理设置完全一致)
set "HTTP_PROXY=http://127.0.0.1:7897"
set "HTTPS_PROXY=http://127.0.0.1:7897"
set "ALL_PROXY=http://127.0.0.1:7897"

:: 2. 毫秒级自愈检测 (若检测到官方更新，静默修补后拉起)
node "%~dp0tool\auto-heal.js"

:: 3. 正常启动主程序
start "" "C:\Users\DanielSong\AppData\Local\Programs\antigravity\Antigravity.exe" %*
