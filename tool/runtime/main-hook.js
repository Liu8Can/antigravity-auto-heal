// Antigravity 2.0+ Native Main Process Hook (Menu, Dialog & Dynamic i18n IPC Bridge)
'use strict';

const _i18nElectron = require('electron');
const _i18nFs = require('fs');
const _i18nPath = require('path');

const _I18N_RES_DIR = process.resourcesPath || _i18nPath.join(process.env.LOCALAPPDATA || '', 'Programs', 'antigravity', 'resources');
const _I18N_CUSTOM_DICT_FILE = _i18nPath.join(_I18N_RES_DIR, 'i18n_custom_dict.json');
const _I18N_UNTRANSLATED_FILE = _i18nPath.join(_I18N_RES_DIR, 'i18n_untranslated.json');

const menuTranslationMap = {
  'File': '文件',
  'Edit': '编辑',
  'View': '视图',
  'Selection': '选择',
  'Window': '窗口',
  'Help': '帮助',
  'New Window': '新建窗口',
  'Docs': '使用文档',
  'Toggle Developer Tools': '开发者工具',
  'Check for Updates': '检查更新',
  'Checking for Updates...': '正在检查更新...',
  'Downloading Update...': '正在下载更新...',
  'Restart to Update': '重启以应用更新',
  'Undo': '撤销',
  'Redo': '重做',
  'Cut': '剪切',
  'Copy': '复制',
  'Paste': '粘贴',
  'Select All': '全选',
  'Minimize': '最小化',
  'Close': '关闭',
  'Quit Antigravity': '退出 Antigravity',
  'About Antigravity': '关于 Antigravity',
  'Services': '服务',
  'Hide Antigravity': '隐藏 Antigravity',
  'Hide Others': '隐藏其他',
  'Show All': '显示全部',
  'Force Reload': '强制重新加载',
  'Reload': '重新加载',
  'Actual Size': '实际大小',
  'Zoom In': '放大',
  'Zoom Out': '缩小',
  'Toggle Full Screen': '切换全屏',
  'Toggle Fullscreen': '切换全屏',
  'Reset Zoom': '重置缩放',
  'New Conversation': '新建对话',
  'Create Project': '创建项目',
  'New Project': '新建项目',
  'Create New Project': '创建新项目',
  'Open Project': '打开项目',
  'Command Palette': '命令面板',
  'Split': '分屏',
  'Split Right': '向右分屏',
  'Split Down': '向下分屏',
  'Replace With New': '替换为新建',
  'Remove From Split': '从分屏中移除',
  'Split Terminal': '拆分终端',
  'Split Conversation Vertically': '垂直分屏对话',
  'Split Conversation Horizontally': '水平分屏对话',
  'Equalize Split Panes': '均分分屏窗格',
  'Fork': '派生',
  'Fork Conversation': '派生对话',
  'Connect to WSL': '连接到 WSL',
  'Reopen Locally': '本地重新打开',
  'Automations': '自动化',
  'Settings': '设置',
  'Preferences': '首选项',
  'Open': '打开',
  'Save': '保存',
  'Save As...': '另存为...',
  'Exit': '退出',
  'Quit': '退出',
  'Cancel': '取消',
  'OK': '确定',
  'No agents running': '无正在运行的智能体',
  'Connection info…': '连接信息…',
  'Connection info': '连接信息'
};

const dialogTextMap = {
  'Confirm Quit': '确认退出',
  'Are you sure you want to quit?': '您确定要退出吗？',
  'There may be agents or background tasks running.': '可能有智能体或后台任务正在运行。',
  'WSL distro not found': '未找到 WSL 发行版',
  'WSL setup failed': 'WSL 配置失败',
  'Antigravity opened on Windows instead.': 'Antigravity 已改为在 Windows 本地打开。',
  'Startup failed': '启动失败',
  'Binary not found': '未找到二进制程序',
  'Cannot open folder': '无法打开文件夹',
  'Open workspace': '打开工作区',
  'Open workspaces': '打开工作区',
  'Select Download Folder': '选择下载文件夹',
  'Check for Updates': '检查更新',
  'No updates available': '当前已是最新版本，暂无可用更新。',
  'Folder is on the Windows filesystem': '文件夹位于 Windows 文件系统',
  'Choose a Passkey': '选择通行密钥',
  'Select a passkey account to continue:': '选择一个通行密钥账号以继续：',
  'Passkeys': '通行密钥',
  'RPC call failed': 'RPC 调用失败',
  'Connect a device': '连接设备',
  'Select a device:': '请选择一个设备：',
  'No compatible devices found.': '未找到兼容的设备。',
  'HID device': 'HID 设备',
  'USB device': 'USB 设备',
  'Unknown device': '未知设备',
  'Connection info': '连接信息',
  'Connection info…': '连接信息…',
  'This page': '此页面',
  'Not secure': '不安全',
  '⚠ Not secure': '⚠ 不安全',
  'Connection is secure': '连接安全',
  'Your information (for example, passwords or credit card numbers) is private when it is sent to this site.': '您发送至此网站的信息（例如密码或信用卡号）处于私密保护状态。',
  'Your connection to this site is not secure': '您与此网站的连接不安全',
  'You should not enter any sensitive information on this site (for example, passwords or credit cards), because it could be stolen by attackers.': '请勿在此网站输入任何敏感信息（例如密码或信用卡），因为这些信息可能会被攻击者窃取。',
  'Connection security information is not available for this page': '此页面暂无连接安全信息',
  'Certificate is valid': '证书有效',
  'Certificate details': '证书详情'
};

// 加载外部动态增量词典 (无需重打包 app.asar 即可扩展主进程与渲染进程词库)
function loadCustomDict() {
  try {
    if (_i18nFs.existsSync(_I18N_CUSTOM_DICT_FILE)) {
      const data = JSON.parse(_i18nFs.readFileSync(_I18N_CUSTOM_DICT_FILE, 'utf-8'));
      if (data && typeof data === 'object') {
        for (const [k, v] of Object.entries(data)) {
          if (k && typeof v === 'string') {
            if (!menuTranslationMap[k]) menuTranslationMap[k] = v;
            if (!dialogTextMap[k]) dialogTextMap[k] = v;
          }
        }
        return data;
      }
    }
  } catch (_) {}
  return {};
}

loadCustomDict();

function translateLabel(lbl) {
  if (!lbl || typeof lbl !== 'string') return lbl;
  if (menuTranslationMap[lbl]) return menuTranslationMap[lbl];
  const m = lbl.match(/^(\d+)\s+agents?\s+running$/i);
  if (m) return `${m[1]} 个智能体正在运行`;
  return lbl;
}

function translateMenuItem(item) {
  if (!item) return;
  if (item.label) {
    item.label = translateLabel(item.label);
  }
  if (item.submenu) {
    if (Array.isArray(item.submenu)) {
      item.submenu.forEach(translateMenuItem);
    } else if (item.submenu.items) {
      item.submenu.items.forEach(translateMenuItem);
    }
  }
}

// 1. Hook Menu.setApplicationMenu & Menu.buildFromTemplate
if (_i18nElectron.Menu) {
  const origSetAppMenu = _i18nElectron.Menu.setApplicationMenu;
  _i18nElectron.Menu.setApplicationMenu = function(menu) {
    if (menu && menu.items) {
      menu.items.forEach(translateMenuItem);
    }
    return origSetAppMenu.call(this, menu);
  };

  const origBuildTemplate = _i18nElectron.Menu.buildFromTemplate;
  _i18nElectron.Menu.buildFromTemplate = function(template) {
    if (Array.isArray(template)) {
      template.forEach(translateMenuItem);
    }
    return origBuildTemplate.call(this, template);
  };
}

// 2. Hook Dialog APIs (MessageBox, ErrorBox, OpenDialog, SaveDialog)
if (_i18nElectron.dialog) {
  function translateDetailBlock(detail) {
    if (!detail || typeof detail !== 'string') return detail;
    if (dialogTextMap[detail]) return dialogTextMap[detail];
    return detail.split('\n').map(line => {
      if (dialogTextMap[line]) return dialogTextMap[line];
      if (line.startsWith('Issued to: ')) return line.replace('Issued to: ', '颁发给：');
      if (line.startsWith('Issued by: ')) return line.replace('Issued by: ', '颁发者：');
      if (line.startsWith('Valid from: ')) return line.replace('Valid from: ', '生效时间：');
      if (line.startsWith('Valid until: ')) return line.replace('Valid until: ', '过期时间：');
      if (line.startsWith('Protocol: ')) return line.replace('Protocol: ', '协议：');
      if (line.startsWith('Error: ')) return line.replace('Error: ', '错误：');
      return line;
    }).join('\n');
  }

  function translateDialogOpts(opts) {
    if (!opts || typeof opts !== 'object') return;
    if (opts.title && dialogTextMap[opts.title]) opts.title = dialogTextMap[opts.title];
    if (opts.buttonLabel && (menuTranslationMap[opts.buttonLabel] || dialogTextMap[opts.buttonLabel])) {
      opts.buttonLabel = menuTranslationMap[opts.buttonLabel] || dialogTextMap[opts.buttonLabel];
    }
    if (opts.message) {
      if (dialogTextMap[opts.message]) {
        opts.message = dialogTextMap[opts.message];
      } else if (opts.message.startsWith('The WSL distro')) {
        opts.message = opts.message.replace(/The WSL distro "([^"]+)" is no longer installed\./, 'WSL 发行版 "$1" 已不再安装。');
      } else if (opts.message.startsWith('Sign in to ')) {
        opts.message = opts.message.replace('Sign in to ', '登录到 ');
      } else if (opts.message.includes(' wants to connect to a ')) {
        opts.message = opts.message
          .replace(' wants to connect to a HID device', ' 请求连接 HID 设备')
          .replace(' wants to connect to a USB device', ' 请求连接 USB 设备')
          .replace(' wants to connect to a ', ' 请求连接 ');
      }
    }
    if (opts.detail) {
      opts.detail = translateDetailBlock(opts.detail);
    }
    if (Array.isArray(opts.buttons)) {
      opts.buttons = opts.buttons.map(b => menuTranslationMap[b] || dialogTextMap[b] || b);
    }
  }

  const origShowMessageBox = _i18nElectron.dialog.showMessageBox;
  _i18nElectron.dialog.showMessageBox = function(browserWindow, options) {
    const opts = (typeof browserWindow === 'object' && options) ? options : browserWindow;
    translateDialogOpts(opts);
    return origShowMessageBox.apply(this, arguments);
  };

  const origShowMessageBoxSync = _i18nElectron.dialog.showMessageBoxSync;
  _i18nElectron.dialog.showMessageBoxSync = function(browserWindow, options) {
    const opts = (typeof browserWindow === 'object' && options) ? options : browserWindow;
    translateDialogOpts(opts);
    return origShowMessageBoxSync.apply(this, arguments);
  };

  if (typeof _i18nElectron.dialog.showOpenDialog === 'function') {
    const origShowOpenDialog = _i18nElectron.dialog.showOpenDialog;
    _i18nElectron.dialog.showOpenDialog = function(browserWindow, options) {
      const opts = (typeof browserWindow === 'object' && options) ? options : browserWindow;
      translateDialogOpts(opts);
      return origShowOpenDialog.apply(this, arguments);
    };
  }

  if (typeof _i18nElectron.dialog.showOpenDialogSync === 'function') {
    const origShowOpenDialogSync = _i18nElectron.dialog.showOpenDialogSync;
    _i18nElectron.dialog.showOpenDialogSync = function(browserWindow, options) {
      const opts = (typeof browserWindow === 'object' && options) ? options : browserWindow;
      translateDialogOpts(opts);
      return origShowOpenDialogSync.apply(this, arguments);
    };
  }

  const origShowErrorBox = _i18nElectron.dialog.showErrorBox;
  _i18nElectron.dialog.showErrorBox = function(title, content) {
    const t = dialogTextMap[title] || title;
    const c = dialogTextMap[content] || content;
    return origShowErrorBox.call(this, t, c);
  };
}

// 3. 主进程与渲染进程安全词库 IPC 桥接 + 实时自动翻译自愈引擎 (无需手动提取、无需重打包 app.asar)
const _reportedWordsSet = new Set();
const _inflightWordsSet = new Set();
let _flushTimer = null;
let _cachedCustomDict = null;

function _getCachedCustomDict() {
  if (!_cachedCustomDict) {
    _cachedCustomDict = loadCustomDict() || {};
  }
  return _cachedCustomDict;
}

function _saveCachedCustomDict() {
  if (!_cachedCustomDict) return;
  try {
    _i18nFs.writeFileSync(_I18N_CUSTOM_DICT_FILE, JSON.stringify(_cachedCustomDict, null, 2), 'utf-8');
  } catch (_) {}
}

function _refineZhTerminology(en, zh) {
  if (!zh || typeof zh !== 'string') return '';
  let res = zh.trim();
  if (!res || res === en || !/[\u4e00-\u9fa5]/.test(res)) return '';
  if (/MYMEMORY WARNING|YOU USED ALL AVAILABLE FREE TRANSLATIONS|QUERY LENGTH LIMIT/i.test(res)) return '';
  if (/\bsubagents?\b/i.test(en)) {
    res = res.replace(/子代理|子特工|副代理/g, '子智能体');
  }
  if (/\bagents?\b/i.test(en)) {
    res = res.replace(/代理商|特工|经纪人|代理/g, '智能体');
  }
  if (/\bworkspaces?\b/i.test(en)) {
    res = res.replace(/工作空间/g, '工作区');
  }
  if (/\bartifacts?\b/i.test(en)) {
    res = res.replace(/人工制品|神器的?|文物/g, '工件');
  }
  if (/\bsandbox(?:ed)?\b/i.test(en)) {
    res = res.replace(/沙箱/g, '沙盒');
  }
  if (/\bprompts?\b/i.test(en) && !/\bprompt\s+(?:you|for)\b/i.test(en)) {
    res = res.replace(/提示符/g, '提示词');
  }
  return res;
}

async function _fetchJsonViaElectron(url) {
  const fetchFn = (_i18nElectron.net && typeof _i18nElectron.net.fetch === 'function')
    ? _i18nElectron.net.fetch.bind(_i18nElectron.net)
    : (typeof fetch === 'function' ? fetch : null);
  if (!fetchFn) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const resp = await fetchFn(url, { signal: controller.signal });
    if (!resp || !resp.ok) return null;
    return await resp.json();
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function _translateSinglePhrase(en) {
  // 1. Primary: Google Translate GTX
  const gUrl = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=' + encodeURIComponent(en);
  const gData = await _fetchJsonViaElectron(gUrl);
  if (gData && Array.isArray(gData[0])) {
    const raw = gData[0].map(p => (p && p[0]) ? p[0] : '').join('');
    const refined = _refineZhTerminology(en, raw);
    if (refined) return refined;
  }
  // 2. Fallback: MyMemory API
  const mUrl = 'https://api.mymemory.translated.net/get?langpair=en|zh-CN&q=' + encodeURIComponent(en);
  const mData = await _fetchJsonViaElectron(mUrl);
  if (mData && mData.responseData && mData.responseData.translatedText) {
    const refined = _refineZhTerminology(en, mData.responseData.translatedText);
    if (refined) return refined;
  }
  return '';
}

async function _autoTranslateBatchAndNotify(sender, words) {
  const dict = _getCachedCustomDict();
  const todo = [];
  for (const raw of words) {
    if (typeof raw !== 'string') continue;
    const w = raw.trim();
    if (w.length < 2 || w.length > 360) continue;
    if (dict[w] || menuTranslationMap[w] || dialogTextMap[w] || _inflightWordsSet.has(w)) continue;
    _inflightWordsSet.add(w);
    todo.push(w);
  }
  if (todo.length === 0) return;

  const CHUNK_SIZE = 12;
  const newlyTranslated = {};

  for (let i = 0; i < todo.length; i += CHUNK_SIZE) {
    const chunk = todo.slice(i, i + CHUNK_SIZE);
    // Single-line items can be batch-translated in 1 HTTP request separated by \n
    const singleLineItems = chunk.filter(x => !x.includes('\n'));
    const multiLineItems = chunk.filter(x => x.includes('\n'));

    if (singleLineItems.length > 0) {
      const joined = singleLineItems.join('\n');
      const gUrl = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=' + encodeURIComponent(joined);
      const gData = await _fetchJsonViaElectron(gUrl);
      let batchSucceeded = false;
      if (gData && Array.isArray(gData[0])) {
        const fullTrans = gData[0].map(p => (p && p[0]) ? p[0] : '').join('');
        const transLines = fullTrans.split('\n');
        if (transLines.length === singleLineItems.length) {
          batchSucceeded = true;
          for (let j = 0; j < singleLineItems.length; j++) {
            const orig = singleLineItems[j];
            const zh = _refineZhTerminology(orig, transLines[j]);
            if (zh) {
              dict[orig] = zh;
              newlyTranslated[orig] = zh;
            }
          }
        }
      }
      if (!batchSucceeded) {
        for (const orig of singleLineItems) {
          const zh = await _translateSinglePhrase(orig);
          if (zh) {
            dict[orig] = zh;
            newlyTranslated[orig] = zh;
          }
        }
      }
    }

    for (const orig of multiLineItems) {
      const zh = await _translateSinglePhrase(orig);
      if (zh) {
        dict[orig] = zh;
        newlyTranslated[orig] = zh;
      }
    }
  }

  for (const w of todo) {
    _inflightWordsSet.delete(w);
  }

  if (Object.keys(newlyTranslated).length > 0) {
    _saveCachedCustomDict();
    try {
      if (sender && !sender.isDestroyed()) {
        sender.send('i18n:auto-translated', newlyTranslated);
      }
    } catch (_) {}
  }
}

function _flushUntranslatedWords() {
  _flushTimer = null;
  if (_reportedWordsSet.size === 0) return;
  try {
    const dict = _getCachedCustomDict();
    let existing = [];
    if (_i18nFs.existsSync(_I18N_UNTRANSLATED_FILE)) {
      try {
        existing = JSON.parse(_i18nFs.readFileSync(_I18N_UNTRANSLATED_FILE, 'utf-8'));
        if (!Array.isArray(existing)) existing = [];
      } catch (_) {
        existing = [];
      }
    }
    const merged = new Set(existing);
    let added = 0;
    for (const w of _reportedWordsSet) {
      if (!merged.has(w) && !dict[w] && !menuTranslationMap[w] && !dialogTextMap[w]) {
        merged.add(w);
        added++;
      }
    }
    _reportedWordsSet.clear();
    if (added > 0 && merged.size <= 2000) {
      _i18nFs.writeFileSync(_I18N_UNTRANSLATED_FILE, JSON.stringify(Array.from(merged), null, 2), 'utf-8');
    }
  } catch (_) {}
}

if (_i18nElectron.ipcMain) {
  _i18nElectron.ipcMain.on('i18n:get-custom-dict', (event) => {
    event.returnValue = _getCachedCustomDict();
  });

  _i18nElectron.ipcMain.on('i18n:report-untranslated', (event, words) => {
    if (!Array.isArray(words)) return;
    for (const w of words) {
      if (typeof w === 'string' && w.length >= 2 && w.length <= 360) {
        _reportedWordsSet.add(w);
      }
    }
    if (_reportedWordsSet.size > 0 && !_flushTimer) {
      _flushTimer = setTimeout(_flushUntranslatedWords, 3000);
    }
    // 立即在主进程后台异步调用翻译并在完成后实时推送回渲染进程热更新 DOM
    _autoTranslateBatchAndNotify(event.sender, words).catch(() => {});
  });
}
