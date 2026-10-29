# Antigravity 自动化汉化工具 PowerShell 脚本
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Antigravity 2.0+ 高复用自动化汉化工具 (PowerShell版)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$toolScript = Join-Path $PSScriptRoot "tool" "builder.js"
node $toolScript

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[完成] 汉化文件已成功生成！" -ForegroundColor Green
} else {
    Write-Host "`n[错误] 汉化构建失败，请检查错误输出！" -ForegroundColor Red
}
Write-Host "`n按任意键退出..."
[Console]::ReadKey($true) | Out-Null
