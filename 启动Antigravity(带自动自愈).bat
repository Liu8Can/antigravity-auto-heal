@echo off
chcp 65001 >nul
title Antigravity 智能启动器

:: ==============================================================================
:: 1. 智能代理自动识别机制 (零配置自适应)
:: 优先读取 Windows 系统代理注册表。若用户运行了任何代理软件（Clash/v2ray/Verge等）
:: 并开启了系统代理，脚本将自动提取其真实端口（如 7890 / 7897 / 10809），自适应接入；
:: 若未开启代理或处于直连网络，则绝不强加任何代理设置，保持纯净直连。
:: 也支持手动指定 CUSTOM_PROXY (若需要手动锁定特定端口，可取消下方注释)
:: ==============================================================================
:: set "CUSTOM_PROXY=http://127.0.0.1:7897"

if not "%CUSTOM_PROXY%"=="" (
    set "HTTP_PROXY=%CUSTOM_PROXY%"
    set "HTTPS_PROXY=%CUSTOM_PROXY%"
    set "ALL_PROXY=%CUSTOM_PROXY%"
    echo [代理模式] 已加载用户手动指定的代理: %CUSTOM_PROXY%
) else (
    set "DETECTED_PROXY="
    for /f "tokens=3" %%i in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyEnable 2^>nul') do (
        if "%%i"=="0x1" (
            for /f "tokens=3" %%j in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyServer 2^>nul') do (
                set "DETECTED_PROXY=%%j"
            )
        )
    )

    if not "%DETECTED_PROXY%"=="" (
        set "HTTP_PROXY=http://%DETECTED_PROXY%"
        set "HTTPS_PROXY=http://%DETECTED_PROXY%"
        set "ALL_PROXY=http://%DETECTED_PROXY%"
        echo [代理感知] 自动识别并接入正在运行的系统代理: http://%DETECTED_PROXY%
    ) else (
        echo [网络环境] 未检测到开启的系统代理，使用原生直连模式。
    )
)

:: 2. 毫秒级自愈检测 (若检测到官方更新，静默修补后拉起)
node "%~dp0tool\auto-heal.js"

:: 3. 动态寻找主程序路径并启动 (兼容所有 Windows 用户环境)
set "APP_EXE=%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe"
if exist "%APP_EXE%" (
    start "" "%APP_EXE%" %*
) else (
    start "" "Antigravity.exe" %*
)
