// Antigravity 2.0+ Auto Localizer & Asar Compiler
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function log(msg) {
  const t = new Date().toLocaleTimeString();
  console.log(`[${t}] ${msg}`);
}

const ROOT_DIR = path.resolve(__dirname, '..');
const WORK_DIR = path.join(ROOT_DIR, 'build_work');
const UNPACKED_SOURCE = 'C:\\Users\\DanielSong\\AppData\\Local\\Programs\\antigravity\\resources\\app.asar.unpacked';

function autoFindInput() {
  const files = fs.readdirSync(ROOT_DIR);
  const unloc = files.filter(f => f.includes('未汉化') && f.endsWith('.asar'));
  if (unloc.length > 0) {
    return path.join(ROOT_DIR, unloc[unloc.length - 1]);
  }
  return path.join(ROOT_DIR, 'app2.27.0 未汉化.asar');
}

const inputAsar = process.argv[2] ? path.resolve(process.argv[2]) : autoFindInput();
const outputAsar = process.argv[3] ? path.resolve(process.argv[3]) : inputAsar.replace('未汉化', '已汉化');

log('==================================================');
log('  Antigravity 2.0+ 自动化汉化构建器');
log('==================================================');
log(`输入文件: ${inputAsar}`);
log(`输出目标: ${outputAsar}`);

if (!fs.existsSync(inputAsar)) {
  console.error(`[错误] 找不到输入文件: ${inputAsar}`);
  process.exit(1);
}

// 1. Prepare work dir
if (fs.existsSync(WORK_DIR)) {
  fs.rmSync(WORK_DIR, { recursive: true, force: true });
}
fs.mkdirSync(WORK_DIR, { recursive: true });

const extractDir = path.join(WORK_DIR, 'extracted');
const tempAsar = path.join(WORK_DIR, 'temp.asar');

// 2. Unpack
const inputDir = path.dirname(inputAsar);
const inputBase = path.basename(inputAsar);
const companionUnpacked = path.join(inputDir, `${inputBase}.unpacked`);
let createdTempCompanion = false;

if (!fs.existsSync(companionUnpacked) && fs.existsSync(UNPACKED_SOURCE)) {
  try {
    fs.symlinkSync(UNPACKED_SOURCE, companionUnpacked, 'junction');
    createdTempCompanion = true;
  } catch (_) {}
}

log('正在解包 app.asar...');
try {
  execSync(`npx --yes @electron/asar extract "${inputAsar}" "${extractDir}"`, {
    stdio: 'inherit',
    cwd: WORK_DIR
  });
  log('解包成功！');
} catch (err) {
  console.error('[错误] 解包失败: ' + err.message);
  process.exit(1);
} finally {
  if (createdTempCompanion && fs.existsSync(companionUnpacked)) {
    try { fs.unlinkSync(companionUnpacked); } catch (_) {}
  }
}

// 3. Read verified engine
const enginePath = path.join(__dirname, 'runtime', 'engine.js');
const engineCode = fs.readFileSync(enginePath, 'utf-8').trim();

// 4. Inject preload.js & wizardPreload.js
const preloadPath = path.join(extractDir, 'dist', 'preload.js');
let preloadContent = fs.readFileSync(preloadPath, 'utf-8');
if (!preloadContent.includes('// Antigravity 2.0 Chinese Localization Engine')) {
  preloadContent = preloadContent.trim() + '\n\n' + engineCode + '\n';
  fs.writeFileSync(preloadPath, preloadContent, 'utf-8');
}

const wizPreloadPath = path.join(extractDir, 'dist', 'ideInstall', 'wizardPreload.js');
if (fs.existsSync(wizPreloadPath)) {
  let wizContent = fs.readFileSync(wizPreloadPath, 'utf-8');
  if (!wizContent.includes('// Antigravity 2.0 Chinese Localization Engine')) {
    wizContent = wizContent.trim() + '\n\n' + engineCode + '\n';
    fs.writeFileSync(wizPreloadPath, wizContent, 'utf-8');
  }
}
log('已注入渲染进程 DOM 汉化引擎 (preload.js)');

// 5. Inject menu.js
const menuPath = path.join(extractDir, 'dist', 'menu.js');
if (fs.existsSync(menuPath)) {
  let menuContent = fs.readFileSync(menuPath, 'utf-8');
  if (!menuContent.includes('const menuTranslationMap')) {
    menuContent = menuContent.replace(
      'const submenuItem = appMenu.items.find((item) => item.label === submenuLabel);',
      'const submenuItem = appMenu.items.find((item) => item.label === submenuLabel || (submenuLabel === "File" && item.label === "文件"));'
    );
    menuContent = menuContent.replace(
      'electron_1.Menu.setApplicationMenu(menu);',
      'if (typeof translateMenu === "function") { menu.items.forEach(translateMenu); } electron_1.Menu.setApplicationMenu(menu);'
    );
    const menuHook = path.join(__dirname, 'runtime', 'main-hook.js');
    if (fs.existsSync(menuHook)) {
      menuContent += '\n' + fs.readFileSync(menuHook, 'utf-8');
    }
    fs.writeFileSync(menuPath, menuContent, 'utf-8');
  }
  log('已注入主进程原生菜单汉化 (menu.js)');
}

// 6. Inject tray.js
const trayPath = path.join(extractDir, 'dist', 'tray.js');
if (fs.existsSync(trayPath)) {
  let trayContent = fs.readFileSync(trayPath, 'utf-8');
  if (!trayContent.includes('translatedActions')) {
    trayContent = trayContent.replace(
      'contextMenu = electron_1.Menu.buildFromTemplate(actions);',
      `const translatedActions = actions.map(action => {
        if (action.label === 'Quit Antigravity') return { ...action, label: '退出 Antigravity' };
        if (action.label === 'New Window') return { ...action, label: '新建窗口' };
        return action;
      });
      contextMenu = electron_1.Menu.buildFromTemplate(translatedActions);`
    );
    trayContent = trayContent.replace("' agent' +", "' 个智能体正在运行';");
    trayContent = trayContent.replace(
      "(count === 1 ? '' : 's') +\n                    ' running';",
      "if (count <= 0) countItem.label = '无正在运行的智能体';"
    );
    fs.writeFileSync(trayPath, trayContent, 'utf-8');
  }
  log('已注入系统托盘菜单汉化 (tray.js)');
}

// 7. Inject ipcHandlers.js, updater.js, main.js, webauthn.js
const ipcPath = path.join(extractDir, 'dist', 'ipcHandlers.js');
if (fs.existsSync(ipcPath)) {
  let ipc = fs.readFileSync(ipcPath, 'utf-8');
  ipc = ipc.replace("title: 'Open workspace'", "title: '打开工作区'");
  ipc = ipc.replace("title: 'Open workspaces'", "title: '打开工作区'");
  ipc = ipc.replace("message: 'Folder is on the Windows filesystem'", "message: '文件夹位于 Windows 文件系统'");
  fs.writeFileSync(ipcPath, ipc, 'utf-8');
}

const updaterPath = path.join(extractDir, 'dist', 'updater.js');
if (fs.existsSync(updaterPath)) {
  let upd = fs.readFileSync(updaterPath, 'utf-8');
  upd = upd.replace("title: 'Check for Updates'", "title: '检查更新'");
  upd = upd.replace("message: 'No updates available'", "message: '当前已是最新版本，暂无可用更新。'");
  upd = upd.replace("buttons: ['OK']", "buttons: ['确定']");
  fs.writeFileSync(updaterPath, upd, 'utf-8');
}

const mainPath = path.join(extractDir, 'dist', 'main.js');
if (fs.existsSync(mainPath)) {
  let main = fs.readFileSync(mainPath, 'utf-8');
  main = main.replace("title: 'Confirm Quit'", "title: '确认退出'");
  main = main.replace("message: 'Are you sure you want to quit?'", "message: '您确定要退出吗？'");
  main = main.replace("detail: 'There may be agents or background tasks running.'", "detail: '可能有智能体或后台任务正在运行。'");
  main = main.replace("buttons: ['Cancel', 'Quit']", "buttons: ['取消', '退出']");
  main = main.replace("label: 'New Window'", "label: '新建窗口'");
  fs.writeFileSync(mainPath, main, 'utf-8');
}

const webauthnPath = path.join(extractDir, 'dist', 'webauthn.js');
if (fs.existsSync(webauthnPath)) {
  let auth = fs.readFileSync(webauthnPath, 'utf-8');
  auth = auth.replace("title: 'Choose a Passkey'", "title: '选择通行密钥'");
  auth = auth.replace("detail: 'Select a passkey account to continue:'", "detail: '选择一个通行密钥账号以继续：'");
  auth = auth.replace("buttons: [...accountLabels, 'Cancel']", "buttons: [...accountLabels, '取消']");
  fs.writeFileSync(webauthnPath, auth, 'utf-8');
}

// 8. Syntax validation
const filesToCheck = [preloadPath, wizPreloadPath, menuPath, trayPath, ipcPath, updaterPath, mainPath, webauthnPath];
for (const f of filesToCheck) {
  if (fs.existsSync(f)) {
    execSync(`node --check "${f}"`);
  }
}
log('所有核心脚本语法校验通过 (node --check ALL GREEN)');

// 9. Pack
log('正在重新打包 app.asar...');
try {
  execSync(`npx --yes @electron/asar pack "${extractDir}" "${tempAsar}" --unpack-dir "**/chrome-devtools-mcp/**"`, {
    stdio: 'inherit',
    cwd: WORK_DIR
  });
  log('重新打包成功！');
} catch (err) {
  console.error('[错误] 打包失败: ' + err.message);
  process.exit(1);
}

if (fs.existsSync(outputAsar)) {
  fs.unlinkSync(outputAsar);
}
fs.copyFileSync(tempAsar, outputAsar);
fs.unlinkSync(tempAsar);
fs.rmSync(WORK_DIR, { recursive: true, force: true });

const stat = fs.statSync(outputAsar);
log(`🎉 汉化包构建完成！`);
log(`文件路径: ${outputAsar}`);
log(`文件大小: ${(stat.size / 1024 / 1024).toFixed(2)} MB (${stat.size} 字节)`);
