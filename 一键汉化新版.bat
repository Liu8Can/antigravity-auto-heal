@echo off
title Antigravity 自动化汉化工具
echo ========================================================
echo   Antigravity 2.0+ 高复用自动化汉化工具
echo ========================================================
echo.

node "%~dp0tool\builder.js"

if errorlevel 1 (
  echo.
  echo [错误] 汉化构建失败，请检查控制台错误信息。
  pause
) else (
  echo.
  echo [完成] 汉化文件已成功生成！
  pause
)
