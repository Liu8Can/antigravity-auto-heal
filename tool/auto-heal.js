// Antigravity Silent Auto-Healing Daemon
// Inspects the installed app.asar; if the official updater replaced it (or the local engine/dictionary
// changed since the last build), rebuilds the localized archive from the pristine backup, in-process.
// In background, spawns harvester.py to discover and translate new words.
//
// Flags:
//   --from-launcher   invoked by the .bat launcher right before starting the app
//   --force           rebuild even if the installed build is up to date
//   --replace-live    overwrite app.asar even while Antigravity is running (not recommended)
//   --status          print the detected state and exit without changing anything
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const patcher = require('./lib/patcher');

const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
const RES_DIR = path.join(localAppData, 'Programs', 'antigravity', 'resources');
const ASAR_PATH = process.env.ANTIGRAVITY_ASAR || path.join(RES_DIR, 'app.asar');
const ASAR_BAK = process.env.ANTIGRAVITY_ASAR_BAK || path.join(path.dirname(ASAR_PATH), 'app.asar.bak');
const DATA_DIR = path.join(process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming'), 'Antigravity', 'i18n');
const UNTRANSLATED_FILE = path.join(DATA_DIR, 'untranslated.json');
const TOOL_DIR = __dirname;
const HARVESTER_PY = path.join(TOOL_DIR, 'harvester.py');
const STAGED_ASAR = path.join(TOOL_DIR, 'staged.asar');
const LEGACY_MARKER_FILE = path.join(TOOL_DIR, '.new_words_ready');

const TAG = '[自动汉化自愈]';
const args = new Set(process.argv.slice(2));

function tasklistHas(imageName) {
  try {
    const out = execSync(`tasklist /FI "IMAGENAME eq ${imageName}" /NH`, { stdio: 'pipe', windowsHide: true }).toString();
    return out.toLowerCase().includes(imageName.toLowerCase());
  } catch (_) {
    return false;
  }
}

const isAntigravityRunning = () => tasklistHas('Antigravity.exe');
// language_server.exe only lives while a window is open; a lone Antigravity.exe is the tray ghost.
const isWindowOpen = () => tasklistHas('language_server.exe');

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function killAntigravity() {
  try {
    execSync('taskkill /F /IM Antigravity.exe /T', { stdio: 'ignore', windowsHide: true });
  } catch (_) {}
  // Wait (max ~2s) for the process to exit and release its handle on app.asar.
  for (let i = 0; i < 20 && isAntigravityRunning(); i++) sleep(100);
  sleep(150);
}

function spawnHarvester() {
  try {
    const child = spawn('python', [HARVESTER_PY], { detached: true, stdio: 'ignore', windowsHide: true });
    child.on('error', () => {});
    child.unref();
  } catch (_) {}
}

function removeQuietly(file) {
  try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch (_) {}
}

function appVersionOf(asarPath) {
  try {
    const { files } = require('./lib/asar').peek(asarPath, ['package.json']);
    return JSON.parse(files['package.json'].toString('utf-8')).version || '';
  } catch (_) {
    return '';
  }
}

function heal() {
  const cur = patcher.inspect(ASAR_PATH);
  const toolHash = patcher.currentToolHash();

  if (args.has('--status')) {
    console.log(JSON.stringify({
      asar: ASAR_PATH, installed: cur, backup: patcher.inspect(ASAR_BAK), staged: patcher.inspect(STAGED_ASAR),
      toolHash, upToDate: cur.state === 'localized' && cur.stamp.tool === toolHash,
      running: isAntigravityRunning(), windowOpen: isWindowOpen()
    }, null, 2));
    return;
  }

  if (cur.state === 'missing') return;
  if (cur.state === 'invalid') {
    console.error(`${TAG} 无法解析 app.asar (${cur.error})，已跳过。`);
    return;
  }

  removeQuietly(LEGACY_MARKER_FILE);
  const force = args.has('--force');
  const fromLauncher = args.has('--from-launcher');

  // Fast path: installed build is localized with the current engine + dictionary.
  if (cur.state === 'localized' && cur.stamp.tool === toolHash && !force) {
    removeQuietly(STAGED_ASAR);
    if (fs.existsSync(UNTRANSLATED_FILE)) spawnHarvester();
    return;
  }

  // Defence rule 1: the pristine official archive is the only source we ever inject into.
  if (cur.state === 'pristine') {
    console.log(`${TAG} 检测到官方刚刚推送了新版本更新，正在刷新纯净母本...`);
    try {
      fs.copyFileSync(ASAR_PATH, ASAR_BAK);
    } catch (e) {
      console.error(`${TAG} 无法备份官方原版 (${e.message})，为安全起见中止。`);
      return;
    }
  } else {
    console.log(`${TAG} 汉化引擎或词典已更新，正在基于官方原版备份重新构建...`);
  }

  const bak = patcher.inspect(ASAR_BAK);
  if (bak.state !== 'pristine') {
    console.error(`${TAG} 找不到可用的官方原版备份 app.asar.bak (状态: ${bak.state})，无法重建。` +
      '请等待下次官方更新，或重新安装 Antigravity 后再运行。');
    return;
  }
  const bakId = patcher.sourceIdOf(ASAR_BAK);
  // The backup must belong to the installed version, otherwise we would downgrade the app.
  if (cur.state === 'localized' && cur.stamp.source && cur.stamp.source !== bakId) {
    console.error(`${TAG} 备份 app.asar.bak 与当前安装的版本不一致，已跳过重建以免降级。`);
    return;
  }
  if (cur.state === 'legacy') {
    const a = appVersionOf(ASAR_PATH);
    const b = appVersionOf(ASAR_BAK);
    if (a && b && a !== b) {
      console.error(`${TAG} 备份版本 (${b}) 与当前安装版本 (${a}) 不一致，已跳过重建以免降级。`);
      return;
    }
  }

  // Reuse a previously staged build when it matches both the current tool and the current source.
  let buffer = null;
  let fromStaged = false;
  const staged = patcher.inspect(STAGED_ASAR);
  if (!force && staged.state === 'localized' && staged.stamp.tool === toolHash && staged.stamp.source === bakId) {
    try {
      buffer = fs.readFileSync(STAGED_ASAR);
      fromStaged = true;
    } catch (_) {}
  }
  if (!buffer) {
    try {
      const t0 = Date.now();
      const built = patcher.buildLocalized(ASAR_BAK);
      buffer = built.buffer;
      console.log(`${TAG} 已完成注入与语法校验 (${built.report.length} 个文件, ${Date.now() - t0} ms, Antigravity ${built.stamp.appVersion || '?'})。`);
    } catch (e) {
      // Defence rule 2/3: any failure (including the syntax gate) leaves the installed app untouched.
      console.error(`${TAG} 构建失败，未改动主程序: ${e.message}`);
      return;
    }
  }

  // Safe replacement:
  // - only the tray ghost is left (window closed), or the launcher is starting a not-yet-localized build:
  //   terminate leftovers and write app.asar directly;
  // - a live window is open: never swap the archive under a running process (in-memory ASAR offsets
  //   would be corrupted) — stage the build and apply it on the next launch.
  if (isAntigravityRunning()) {
    if (!isWindowOpen() || (fromLauncher && cur.state === 'pristine')) killAntigravity();
  }

  const stage = (why) => {
    if (!fromStaged) {
      try { fs.writeFileSync(STAGED_ASAR, buffer); } catch (_) {}
    }
    console.log(`${TAG} ${why}，已生成预构建包 staged.asar，将在关闭 Antigravity 后下次启动时自动替换生效。`);
  };

  if (isAntigravityRunning() && !args.has('--replace-live')) {
    stage('检测到 Antigravity 窗口正在运行');
    return;
  }

  try {
    patcher.writeFileAtomic(ASAR_PATH, buffer);
  } catch (e) {
    if (e.code === 'EBUSY' || e.code === 'EPERM' || e.code === 'EACCES') {
      stage('app.asar 正被占用');
      return;
    }
    console.error(`${TAG} 写入 app.asar 失败: ${e.message}`);
    return;
  }
  removeQuietly(STAGED_ASAR);
  console.log(`${TAG} 汉化已就地生效${fromStaged ? ' (来自预构建包)' : ''}。`);

  // Harvest new strings in the background (never blocks startup).
  spawnHarvester();
}

try {
  heal();
} catch (e) {
  // The launcher must always go on to start the app, whatever happens here.
  console.error(`${TAG} 发生未预期的异常，已跳过: ${e && e.message}`);
}
