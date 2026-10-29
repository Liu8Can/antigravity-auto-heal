@echo off
chcp 65001 >nul
title Antigravity 智能启动器

:: 1. 配置代理环境变量 (可选，默认使用系统代理或指定端口)
if "%HTTP_PROXY%"=="" set "HTTP_PROXY=http://127.0.0.1:7897"
if "%HTTPS_PROXY%"=="" set "HTTPS_PROXY=http://127.0.0.1:7897"
if "%ALL_PROXY%"=="" set "ALL_PROXY=http://127.0.0.1:7897"

:: 2. 毫秒级自愈检测 (若检测到官方更新，静默修补后拉起)
node "%~dp0tool\auto-heal.js"

:: 3. 动态寻找主程序路径并启动 (兼容所有 Windows 用户环境)
set "APP_EXE=%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe"
if exist "%APP_EXE%" (
    start "" "%APP_EXE%" %*
) else (
    start "" "Antigravity.exe" %*
)
