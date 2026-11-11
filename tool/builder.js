// Antigravity 2.0+ Auto Localizer & Asar Compiler (manual offline build)
// Usage: node tool/builder.js [input.asar] [output.asar]
// Shares the exact injection + syntax-gate logic with auto-heal.js via lib/patcher.js.
'use strict';

const fs = require('fs');
const path = require('path');
const patcher = require('./lib/patcher');

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

const ROOT_DIR = path.resolve(__dirname, '..');

function autoFindInput() {
  const unloc = fs.readdirSync(ROOT_DIR).filter(f => f.includes('未汉化') && f.endsWith('.asar')).sort();
  if (unloc.length > 0) return path.join(ROOT_DIR, unloc[unloc.length - 1]);
  // Fall back to the pristine backup kept next to the installed app.
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
  return path.join(localAppData, 'Programs', 'antigravity', 'resources', 'app.asar.bak');
}

const inputAsar = process.argv[2] ? path.resolve(process.argv[2]) : autoFindInput();
let outputAsar = process.argv[3] ? path.resolve(process.argv[3]) : inputAsar.replace('未汉化', '已汉化');
if (outputAsar === inputAsar) outputAsar = path.join(ROOT_DIR, 'app 已汉化.asar');

log('==================================================');
log('  Antigravity 2.0+ 自动化汉化构建器');
log('==================================================');
log(`输入文件: ${inputAsar}`);
log(`输出目标: ${outputAsar}`);

if (!fs.existsSync(inputAsar)) {
  console.error(`[错误] 找不到输入文件: ${inputAsar}`);
  process.exit(1);
}

try {
  const t0 = Date.now();
  const { buffer, stamp, report } = patcher.buildLocalized(inputAsar);
  for (const line of report) log('已注入 ' + line);
  log('所有核心脚本语法校验通过');
  patcher.writeFileAtomic(outputAsar, buffer);
  log(`🎉 汉化包构建完成！(Antigravity ${stamp.appVersion || '?'}, 用时 ${Date.now() - t0} ms)`);
  log(`文件路径: ${outputAsar}`);
  log(`文件大小: ${(buffer.length / 1024 / 1024).toFixed(2)} MB (${buffer.length} 字节)`);
} catch (err) {
  console.error('[错误] 构建失败: ' + err.message);
  process.exit(1);
}
