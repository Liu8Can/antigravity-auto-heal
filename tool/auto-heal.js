// Antigravity Silent Auto-Healing Daemon
// Inspects installed app.asar; if official updater replaced it, silently patches in-place.
// In background, spawns harvester.py to discover and translate new words.
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const ASAR_PATH = 'C:\\Users\\DanielSong\\AppData\\Local\\Programs\\antigravity\\resources\\app.asar';
const ASAR_BAK = 'C:\\Users\\DanielSong\\AppData\\Local\\Programs\\antigravity\\resources\\app.asar.bak';
const UNPACKED_SOURCE = 'C:\\Users\\DanielSong\\AppData\\Local\\Programs\\antigravity\\resources\\app.asar.unpacked';
const TOOL_DIR = __dirname;
const ENGINE_PATH = path.join(TOOL_DIR, 'runtime', 'engine.js');
const MAIN_HOOK_PATH = path.join(TOOL_DIR, 'runtime', 'main-hook.js');
const HARVESTER_PY = path.join(TOOL_DIR, 'harvester.py');
const MARKER_FILE = path.join(TOOL_DIR, '.new_words_ready');

function isLocalized(asarPath) {
  if (!fs.existsSync(asarPath)) return false;
  try {
    const fd = fs.openSync(asarPath, 'r');
    const headerBuf = Buffer.alloc(16);
    fs.readSync(fd, headerBuf, 0, 16, 0);
    const jsonLen = headerBuf.readUInt32LE(12);
    if (jsonLen <= 0 || jsonLen > 10 * 1024 * 1024) {
      fs.closeSync(fd);
      return false;
    }
    const jsonBuf = Buffer.alloc(jsonLen);
    fs.readSync(fd, jsonBuf, 0, jsonLen, 16);
    fs.closeSync(fd);

    const header = JSON.parse(jsonBuf.toString('utf-8'));
    const preloadNode = header?.files?.dist?.files?.['preload.js'];
    if (preloadNode && preloadNode.size > 50000) {
      return true; // Already localized
    }
  } catch (e) {
    return false;
  }
  return false;
}

function patchInPlace() {
  const workDir = path.join(TOOL_DIR, 'heal_work');
  if (fs.existsSync(workDir)) {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
  fs.mkdirSync(workDir, { recursive: true });

  const extractDir = path.join(workDir, 'extracted');
  const tempAsar = path.join(workDir, 'temp.asar');

  // 防御规则 1：优先以官方原生备份 app.asar.bak 为解包基准源，彻底杜绝在已注入文件上二次追加代码
  const sourceAsar = fs.existsSync(ASAR_BAK) ? ASAR_BAK : ASAR_PATH;
  const companionUnpacked = `${sourceAsar}.unpacked`;
  let createdCompanion = false;

  if (!fs.existsSync(companionUnpacked) && fs.existsSync(UNPACKED_SOURCE)) {
    try {
      fs.symlinkSync(UNPACKED_SOURCE, companionUnpacked, 'junction');
      createdCompanion = true;
    } catch (_) {}
  }

  try {
    // 1. 解包
    execSync(`npx --yes @electron/asar extract "${sourceAsar}" "${extractDir}"`, {
      stdio: 'ignore',
      cwd: workDir
    });

    // 2. 注入 preload.js & wizardPreload.js (带幂等防护)
    const engineCode = fs.readFileSync(ENGINE_PATH, 'utf-8').trim();

    const preloadPath = path.join(extractDir, 'dist', 'preload.js');
    if (fs.existsSync(preloadPath)) {
      let pContent = fs.readFileSync(preloadPath, 'utf-8');
      if (!pContent.includes('// Antigravity 2.0 Chinese Localization Engine')) {
        pContent = pContent.trim() + '\n\n' + engineCode + '\n';
        fs.writeFileSync(preloadPath, pContent, 'utf-8');
      }
    }

    const wizPreloadPath = path.join(extractDir, 'dist', 'ideInstall', 'wizardPreload.js');
    if (fs.existsSync(wizPreloadPath)) {
      let wContent = fs.readFileSync(wizPreloadPath, 'utf-8');
      if (!wContent.includes('// Antigravity 2.0 Chinese Localization Engine')) {
        wContent = wContent.trim() + '\n\n' + engineCode + '\n';
        fs.writeFileSync(wizPreloadPath, wContent, 'utf-8');
      }
    }

    // 3. 注入 menu.js (带严格的唯一性防护，彻底防止 Identifier has already been declared)
    const menuPath = path.join(extractDir, 'dist', 'menu.js');
    if (fs.existsSync(menuPath)) {
      let mContent = fs.readFileSync(menuPath, 'utf-8');
      if (!mContent.includes('const menuTranslationMap')) {
        mContent = mContent.replace(
          'const submenuItem = appMenu.items.find((item) => item.label === submenuLabel);',
          'const submenuItem = appMenu.items.find((item) => item.label === submenuLabel || (submenuLabel === "File" && item.label === "文件"));'
        );
        mContent = mContent.replace(
          'electron_1.Menu.setApplicationMenu(menu);',
          'if (typeof translateMenu === "function") { menu.items.forEach(translateMenu); } electron_1.Menu.setApplicationMenu(menu);'
        );
        if (fs.existsSync(MAIN_HOOK_PATH)) {
          mContent = mContent.trim() + '\n\n' + fs.readFileSync(MAIN_HOOK_PATH, 'utf-8') + '\n';
        }
        fs.writeFileSync(menuPath, mContent, 'utf-8');
      }
    }

    // 4. 注入 tray.js
    const trayPath = path.join(extractDir, 'dist', 'tray.js');
    if (fs.existsSync(trayPath)) {
      let tContent = fs.readFileSync(trayPath, 'utf-8');
      if (!tContent.includes('translatedActions')) {
        tContent = tContent.replace(
          'contextMenu = electron_1.Menu.buildFromTemplate(actions);',
          `const translatedActions = actions.map(action => {
            if (action.label === 'Quit Antigravity') return { ...action, label: '退出 Antigravity' };
            if (action.label === 'New Window') return { ...action, label: '新建窗口' };
            return action;
          });
          contextMenu = electron_1.Menu.buildFromTemplate(translatedActions);`
        );
        tContent = tContent.replace("' agent' +", "' 个智能体正在运行';");
        tContent = tContent.replace(
          "(count === 1 ? '' : 's') +\n                    ' running';",
          "if (count <= 0) countItem.label = '无正在运行的智能体';"
        );
        fs.writeFileSync(trayPath, tContent, 'utf-8');
      }
    }

    // 5. 注入系统原生弹窗与文案
    const ipcPath = path.join(extractDir, 'dist', 'ipcHandlers.js');
    if (fs.existsSync(ipcPath)) {
      let ipc = fs.readFileSync(ipcPath, 'utf-8');
      ipc = ipc.replace("title: 'Open workspace'", "title: '打开工作区'");
      ipc = ipc.replace("title: 'Open workspaces'", "title: '打开工作区'");
      ipc = ipc.replace("message: 'Folder is on the Windows filesystem'", "message: '文件夹位于 Windows 文件系统'");
      fs.writeFileSync(ipcPath, ipc, 'utf-8');
    }

    const updPath = path.join(extractDir, 'dist', 'updater.js');
    if (fs.existsSync(updPath)) {
      let upd = fs.readFileSync(updPath, 'utf-8');
      upd = upd.replace("title: 'Check for Updates'", "title: '检查更新'");
      upd = upd.replace("message: 'No updates available'", "message: '当前已是最新版本，暂无可用更新。'");
      upd = upd.replace("buttons: ['OK']", "buttons: ['确定']");
      fs.writeFileSync(updPath, upd, 'utf-8');
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

    // 防御规则 2：打包前强制执行语法门禁 (node --check)，若有任何语法错误则立刻熔断退出，绝不写坏主文件
    const filesToCheck = [preloadPath, wizPreloadPath, menuPath, trayPath, ipcPath, updPath, mainPath, webauthnPath];
    for (const f of filesToCheck) {
      if (fs.existsSync(f)) {
        try {
          execSync(`node --check "${f}"`, { stdio: 'pipe' });
        } catch (checkErr) {
          console.error(`[自动汉化自愈] 语法门禁拦截到错误 (${path.basename(f)}):`, checkErr.stderr ? checkErr.stderr.toString() : checkErr.message);
          fs.rmSync(workDir, { recursive: true, force: true });
          return false;
        }
      }
    }

    // 6. 重新打包
    execSync(`npx --yes @electron/asar pack "${extractDir}" "${tempAsar}" --unpack-dir "**/chrome-devtools-mcp/**"`, {
      stdio: 'ignore',
      cwd: workDir
    });

    // 7. 安全覆盖
    try {
      fs.copyFileSync(tempAsar, ASAR_PATH);
    } catch (copyErr) {
      if (copyErr.code === 'EBUSY' || copyErr.code === 'EPERM') {
        console.log('[自动汉化自愈] 提示：检测到主程序正在运行，已安全暂缓写入，将在下次启动时自动应用。');
        fs.rmSync(workDir, { recursive: true, force: true });
        return false;
      }
      throw copyErr;
    }
    fs.rmSync(workDir, { recursive: true, force: true });
    return true;
  } catch (err) {
    console.error('[自动汉化自愈] 自动修补发生异常: ' + err.message);
    if (fs.existsSync(workDir)) {
      try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (_) {}
    }
    return false;
  } finally {
    if (createdCompanion && fs.existsSync(companionUnpacked)) {
      try { fs.unlinkSync(companionUnpacked); } catch (_) {}
    }
  }
}

function heal() {
  if (!fs.existsSync(ASAR_PATH)) {
    return;
  }

  const alreadyLocalized = isLocalized(ASAR_PATH);

  // 场景 1：检测到官方刚推送了新版本更新（未汉化原始包）
  if (!alreadyLocalized) {
    console.log('[自动汉化自愈] 检测到官方刚刚推送了新版本更新！');
    console.log('[自动汉化自愈] 正在执行无感静默保底汉化 (约需 1~2 秒)...');

    // 备份官方全新未修改的包作为基准源
    try {
      fs.copyFileSync(ASAR_PATH, ASAR_BAK);
    } catch (_) {}

    // 执行就地注入
    patchInPlace();

    // 在后台无声拉起采集挖掘器（不阻塞启动）
    try {
      const child = spawn('python', [HARVESTER_PY], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      child.unref();
    } catch (_) {}
    return;
  }

  // 场景 2：已有汉化，但后台智能体挖掘到了全新词条并就绪
  if (fs.existsSync(MARKER_FILE)) {
    console.log('[自动汉化自愈] 发现后台智能体已完成新词自动挖掘与翻译，正在静默升级词典...');
    const ok = patchInPlace();
    if (ok) {
      try { fs.unlinkSync(MARKER_FILE); } catch (_) {}
      console.log('[自动汉化自愈] 新词典已就地热升级生效！');
    }
  }
}

heal();
