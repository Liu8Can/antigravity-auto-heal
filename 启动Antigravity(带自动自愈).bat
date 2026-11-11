@echo off
chcp 65001 >nul
title Antigravity 智能启动器

:: ==============================================================================
:: 1. 智能代理自动识别机制 (零配置自适应)
:: 优先读取 Windows 系统代理注册表。若用户运行了任何代理软件（Clash/v2ray/Verge等）
:: 并开启了系统代理，脚本将自动提取其真实端口（如 7890 / 10809 / 任意自定义端口），自适应接入；
:: 若未开启代理或处于直连网络，则绝不强加任何代理设置，保持纯净直连。
:: 也支持手动指定 CUSTOM_PROXY (若需要手动锁定特定端口，可取消下方注释)
:: ==============================================================================
:: set "CUSTOM_PROXY=http://127.0.0.1:您的代理端口号"

:: 注意：以下刻意写成逐行的单行 if，不使用 ( ) 代码块，也不使用 goto。
:: - cmd 在解析整个 ( ) 块时会一次性展开 %VAR%：旧写法在块内赋值 DETECTED_PROXY 又在同一块内读取，
::   读到的永远是空值，自动识别实际上从未生效；
:: - UTF-8 (chcp 65001) 批处理中 goto 跳转标签存在已知的多字节定位错误，因此也不用标签。
set "PROXY_ENABLED="
set "DETECTED_PROXY="
set "PROXY_URL="
for /f "tokens=3" %%i in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyEnable 2^>nul') do set "PROXY_ENABLED=%%i"
if "%PROXY_ENABLED%"=="0x1" for /f "tokens=3" %%j in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyServer 2^>nul') do set "DETECTED_PROXY=%%j"
:: ProxyServer 可能是 "http=127.0.0.1:7890;https=..." 的分协议写法：取第一段，并去掉 "协议=" 与 "http://" 前缀
if not "%DETECTED_PROXY%"=="" for /f "tokens=1 delims=;" %%k in ("%DETECTED_PROXY%") do set "DETECTED_PROXY=%%k"
if not "%DETECTED_PROXY%"=="" for /f "tokens=2 delims==" %%k in ("%DETECTED_PROXY%") do set "DETECTED_PROXY=%%k"
if not "%DETECTED_PROXY%"=="" set "DETECTED_PROXY=%DETECTED_PROXY:http://=%"
if not "%DETECTED_PROXY%"=="" set "PROXY_URL=http://%DETECTED_PROXY%"
if not "%CUSTOM_PROXY%"=="" set "PROXY_URL=%CUSTOM_PROXY%"

if not "%PROXY_URL%"=="" set "HTTP_PROXY=%PROXY_URL%"
if not "%PROXY_URL%"=="" set "HTTPS_PROXY=%PROXY_URL%"
if not "%PROXY_URL%"=="" set "ALL_PROXY=%PROXY_URL%"
if not "%PROXY_URL%"=="" echo [代理感知] 已接入代理: %PROXY_URL%
if "%PROXY_URL%"=="" echo [网络环境] 未检测到开启的系统代理，使用原生直连模式。

:: 2. 自愈检测 (官方更新或汉化引擎有更新时，自动清理残留托盘进程并静默修补；未安装 Node.js 时跳过)
where node >nul 2>nul && node "%~dp0tool\auto-heal.js" --from-launcher

:: 3. 动态寻找主程序路径并启动 (兼容所有 Windows 用户环境)
set "APP_EXE=%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe"
if exist "%APP_EXE%" (
    start "" "%APP_EXE%" %*
) else (
    start "" "Antigravity.exe" %*
)
