// Shared localization patcher: pristine app.asar -> localized app.asar buffer.
// Single source of truth for both auto-heal.js (silent self-healing) and builder.js (manual build),
// which previously carried two hand-synchronised copies of the same injection logic.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { Asar, peek, findEntry } = require('./asar');

const RUNTIME_DIR = path.join(__dirname, '..', 'runtime');
const ENGINE_PATH = path.join(RUNTIME_DIR, 'engine.js');
const MAIN_HOOK_PATH = path.join(RUNTIME_DIR, 'main-hook.js');

const ENGINE_MARKER = '// Antigravity 2.0 Chinese Localization Engine';
const STAMP_FILE = 'i18n-stamp.json';
const PATCHER_REV = 1; // bump when the injection logic below changes

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Fingerprint of everything that determines the localized output besides the pristine archive.
// When engine.js / main-hook.js / this patcher change, installed builds are detected as stale.
function currentToolHash() {
  const h = crypto.createHash('sha256');
  h.update(String(PATCHER_REV));
  h.update(fs.readFileSync(ENGINE_PATH));
  h.update(fs.readFileSync(MAIN_HOOK_PATH));
  h.update(fs.readFileSync(__filename));
  return h.digest('hex').slice(0, 16);
}

// Cheap state probe (reads only the archive header + two small files).
//   { state: 'missing' }
//   { state: 'pristine' }                       official, untouched
//   { state: 'localized', stamp }               built by this patcher
//   { state: 'legacy' }                         localized by an older version (no stamp)
//   { state: 'invalid', error }
function inspect(asarPath) {
  if (!fs.existsSync(asarPath)) return { state: 'missing' };
  try {
    const { header, files } = peek(asarPath, [STAMP_FILE]);
    if (files[STAMP_FILE]) {
      try {
        return { state: 'localized', stamp: JSON.parse(files[STAMP_FILE].toString('utf-8')) };
      } catch (_) {
        return { state: 'legacy' };
      }
    }
    const preload = findEntry(header, 'dist/preload.js');
    if (preload && preload.size > 50000) {
      // Older builds had no stamp; confirm by looking for the engine marker instead of trusting size alone.
      const { files: f2 } = peek(asarPath, ['dist/preload.js']);
      if (f2['dist/preload.js'] && f2['dist/preload.js'].includes(ENGINE_MARKER)) return { state: 'legacy' };
    }
    return { state: 'pristine' };
  } catch (e) {
    return { state: 'invalid', error: e.message };
  }
}

function sourceIdOf(asarPath) {
  return sha256(fs.readFileSync(asarPath)).slice(0, 16);
}

// Compile-only syntax gate, equivalent to `node --check` for CommonJS files but in-process (no spawn).
function assertValidJs(relPath, code) {
  const body = code.charCodeAt(0) === 0x23 && code.charCodeAt(1) === 0x21 ? '//' + code : code; // hashbang
  try {
    new vm.Script('(function (exports, require, module, __filename, __dirname) {' + body + '\n})', { filename: relPath });
  } catch (e) {
    const err = new Error('语法门禁拦截到错误 (' + relPath + '): ' + e.message);
    err.syntaxGate = true;
    throw err;
  }
}

// [file, [[search, replacement], ...]] literal replacements for main-process dialog strings.
// These are belt-and-braces: main-hook.js also translates the same strings at runtime via dialog hooks.
const LITERAL_PATCHES = [
  ['dist/ipcHandlers.js', [
    ["title: 'Open workspace'", "title: '打开工作区'"],
    ["title: 'Open workspaces'", "title: '打开工作区'"],
    ["title: 'Select Download Folder'", "title: '选择下载文件夹'"],
    ["message: 'Folder is on the Windows filesystem'", "message: '文件夹位于 Windows 文件系统'"]
  ]],
  ['dist/updater.js', [
    ["title: 'Check for Updates'", "title: '检查更新'"],
    ["message: 'No updates available'", "message: '当前已是最新版本，暂无可用更新。'"],
    ["buttons: ['OK']", "buttons: ['确定']"]
  ]],
  ['dist/main.js', [
    ["title: 'Confirm Quit'", "title: '确认退出'"],
    ["message: 'Are you sure you want to quit?'", "message: '您确定要退出吗？'"],
    ["detail: 'There may be agents or background tasks running.'", "detail: '可能有智能体或后台任务正在运行。'"],
    ["buttons: ['Cancel', 'Quit']", "buttons: ['取消', '退出']"],
    ["label: 'New Window'", "label: '新建窗口'"],
    ["detail: 'Antigravity opened on Windows instead.'", "detail: 'Antigravity 已改为在 Windows 本地打开。'"]
  ]],
  ['dist/webauthn.js', [
    ["title: 'Choose a Passkey'", "title: '选择通行密钥'"],
    ["detail: 'Select a passkey account to continue:'", "detail: '选择一个通行密钥账号以继续：'"],
    ["buttons: [...accountLabels, 'Cancel']", "buttons: [...accountLabels, '取消']"]
  ]],
  ['dist/deviceChooser.js', [
    ["title: 'Connect a device'", "title: '连接设备'"],
    ["'Select a device:'", "'请选择一个设备：'"],
    ["'No compatible devices found.'", "'未找到兼容的设备。'"],
    ["buttons: [...snapshot.map(({ label }) => label), 'Cancel']", "buttons: [...snapshot.map(({ label }) => label), '取消']"]
  ]],
  ['dist/webviewPopupSecurity.js', [
    ["label: 'Connection info…'", "label: '连接信息…'"],
    ["title: 'Connection info'", "title: '连接信息'"],
    ["buttons: ['OK']", "buttons: ['确定']"]
  ]]
];

// Builds the localized archive in memory. Throws on any failure (nothing is written by this function).
// Returns { buffer, stamp, report } where report lists what was injected, for logging.
function buildLocalized(sourceAsarPath) {
  const state = inspect(sourceAsarPath);
  if (state.state !== 'pristine') {
    throw new Error('源文件不是官方原版 asar (状态: ' + state.state + ')，拒绝在已修改的包上二次注入: ' + sourceAsarPath);
  }

  const sourceBuf = fs.readFileSync(sourceAsarPath);
  const asar = new Asar(sourceBuf);
  const engineCode = fs.readFileSync(ENGINE_PATH, 'utf-8').trim();
  const hookCode = fs.readFileSync(MAIN_HOOK_PATH, 'utf-8');
  const touched = new Map(); // relPath -> code
  const report = [];

  const get = (rel) => (touched.has(rel) ? touched.get(rel) : asar.readText(rel));

  // 1. Renderer engine -> preload scripts
  if (!asar.has('dist/preload.js')) throw new Error('未找到 dist/preload.js，官方包结构已变化');
  for (const rel of ['dist/preload.js', 'dist/ideInstall/wizardPreload.js']) {
    const code = get(rel);
    if (code === null) continue;
    if (!code.includes(ENGINE_MARKER)) {
      touched.set(rel, code.trim() + '\n\n' + engineCode + '\n');
      report.push(rel + ': 渲染进程汉化引擎');
    }
  }

  // 2. Main-process hook -> menu.js
  {
    const rel = 'dist/menu.js';
    let code = get(rel);
    if (code !== null && !code.includes('const menuTranslationMap')) {
      code = code.replace(
        'const submenuItem = appMenu.items.find((item) => item.label === submenuLabel);',
        'const submenuItem = appMenu.items.find((item) => item.label === submenuLabel || (submenuLabel === "File" && item.label === "文件"));'
      );
      code = code.replace(
        'electron_1.Menu.setApplicationMenu(menu);',
        'if (typeof translateMenu === "function") { menu.items.forEach(translateMenu); } electron_1.Menu.setApplicationMenu(menu);'
      );
      touched.set(rel, code.trim() + '\n\n' + hookCode + '\n');
      report.push(rel + ': 主进程菜单/弹窗 Hook');
    } else if (code === null) {
      report.push('⚠ 未找到 dist/menu.js，主进程 Hook 未注入');
    }
  }

  // 3. Tray menu
  {
    const rel = 'dist/tray.js';
    let code = get(rel);
    if (code !== null && !code.includes('translatedActions')) {
      const patched = code
        .replace(
          'contextMenu = electron_1.Menu.buildFromTemplate(actions);',
          `const translatedActions = actions.map(action => {
            if (action.label === 'Quit Antigravity') return { ...action, label: '退出 Antigravity' };
            if (action.label === 'New Window') return { ...action, label: '新建窗口' };
            return action;
          });
          contextMenu = electron_1.Menu.buildFromTemplate(translatedActions);`
        )
        .replace("' agent' +", "' 个智能体正在运行';")
        .replace("(count === 1 ? '' : 's') +\n                    ' running';", "if (count <= 0) countItem.label = '无正在运行的智能体';");
      if (patched !== code) {
        touched.set(rel, patched);
        report.push(rel + ': 托盘菜单');
      }
    }
  }

  // 4. Literal dialog strings
  for (const [rel, pairs] of LITERAL_PATCHES) {
    const code = get(rel);
    if (code === null) continue;
    let out = code;
    let hits = 0;
    for (const [from, to] of pairs) {
      const next = out.replace(from, () => to);
      if (next !== out) hits++;
      out = next;
    }
    if (hits > 0) {
      touched.set(rel, out);
      report.push(rel + ': ' + hits + '/' + pairs.length + ' 处弹窗文案');
    }
  }

  // 5. Syntax gate: nothing gets written if any touched file fails to compile.
  for (const [rel, code] of touched) {
    assertValidJs(rel, code);
    asar.write(rel, code);
  }

  // 6. Build stamp
  const stamp = {
    tool: currentToolHash(),
    source: sha256(sourceBuf).slice(0, 16),
    builtAt: new Date().toISOString()
  };
  try {
    const pkg = JSON.parse(asar.readText('package.json') || '{}');
    if (pkg.version) stamp.appVersion = pkg.version;
  } catch (_) {}
  asar.write(STAMP_FILE, JSON.stringify(stamp));

  return { buffer: asar.toBuffer(), stamp, report };
}

// Atomic-ish write: temp file in the same directory, then rename over the target.
function writeFileAtomic(target, buffer) {
  const tmp = target + '.i18n-tmp';
  fs.writeFileSync(tmp, buffer);
  try {
    fs.renameSync(tmp, target);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch (_) {}
    throw e;
  }
}

module.exports = { inspect, buildLocalized, currentToolHash, sourceIdOf, writeFileAtomic, STAMP_FILE };
