@echo off
chcp 65001 >nul
title Antigravity 智能启动器

:: ==============================================================================
:: 【网络代理配置】(可选)
:: 如果您需要为 Antigravity 单独指定本地代理端口，请删除下方 set 前面的 ":: "
:: 并将 7897 修改为您实际使用的代理客户端端口 (例如 Clash 常见为 7890)
:: ==============================================================================
:: set "HTTP_PROXY=http://127.0.0.1:7897"
:: set "HTTPS_PROXY=http://127.0.0.1:7897"
:: set "ALL_PROXY=http://127.0.0.1:7897"

:: 1. 毫秒级自愈检测 (若检测到官方更新，静默修补后拉起)
node "%~dp0tool\auto-heal.js"

:: 2. 动态寻找主程序路径并启动 (兼容所有 Windows 用户环境)
set "APP_EXE=%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe"
if exist "%APP_EXE%" (
    start "" "%APP_EXE%" %*
) else (
    start "" "Antigravity.exe" %*
)
