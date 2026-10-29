// Antigravity 2.0+ Native Main Process Hook (Menu & Dialog i18n)
'use strict';

const electron = require('electron');

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
  'No agents running': '无正在运行的智能体'
};

const dialogTextMap = {
  'Confirm Quit': '确认退出',
  'Are you sure you want to quit?': '您确定要退出吗？',
  'There may be agents or background tasks running.': '可能有智能体或后台任务正在运行。',
  'WSL distro not found': '未找到 WSL 发行版',
  'WSL setup failed': 'WSL 配置失败',
  'Startup failed': '启动失败',
  'Binary not found': '未找到二进制程序',
  'Cannot open folder': '无法打开文件夹',
  'Open workspace': '打开工作区',
  'Open workspaces': '打开工作区',
  'Check for Updates': '检查更新',
  'No updates available': '当前已是最新版本，暂无可用更新。',
  'Folder is on the Windows filesystem': '文件夹位于 Windows 文件系统',
  'Choose a Passkey': '选择通行密钥',
  'Select a passkey account to continue:': '选择一个通行密钥账号以继续：',
  'Passkeys': '通行密钥',
  'RPC call failed': 'RPC 调用失败'
};

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
if (electron.Menu) {
  const origSetAppMenu = electron.Menu.setApplicationMenu;
  electron.Menu.setApplicationMenu = function(menu) {
    if (menu && menu.items) {
      menu.items.forEach(translateMenuItem);
    }
    return origSetAppMenu.call(this, menu);
  };

  const origBuildTemplate = electron.Menu.buildFromTemplate;
  electron.Menu.buildFromTemplate = function(template) {
    if (Array.isArray(template)) {
      template.forEach(translateMenuItem);
    }
    return origBuildTemplate.call(this, template);
  };
}

// 2. Hook Dialog APIs
if (electron.dialog) {
  function translateDialogOpts(opts) {
    if (!opts || typeof opts !== 'object') return;
    if (opts.title && dialogTextMap[opts.title]) opts.title = dialogTextMap[opts.title];
    if (opts.message) {
      if (dialogTextMap[opts.message]) {
        opts.message = dialogTextMap[opts.message];
      } else if (opts.message.startsWith('The WSL distro')) {
        opts.message = opts.message.replace(/The WSL distro "([^"]+)" is no longer installed\./, 'WSL 发行版 "$1" 已不再安装。');
      } else if (opts.message.startsWith('Sign in to ')) {
        opts.message = opts.message.replace('Sign in to ', '登录到 ');
      }
    }
    if (opts.detail && dialogTextMap[opts.detail]) {
      opts.detail = dialogTextMap[opts.detail];
    }
    if (Array.isArray(opts.buttons)) {
      opts.buttons = opts.buttons.map(b => menuTranslationMap[b] || dialogTextMap[b] || b);
    }
  }

  const origShowMessageBox = electron.dialog.showMessageBox;
  electron.dialog.showMessageBox = function(browserWindow, options) {
    const opts = (typeof browserWindow === 'object' && options) ? options : browserWindow;
    translateDialogOpts(opts);
    return origShowMessageBox.apply(this, arguments);
  };

  const origShowMessageBoxSync = electron.dialog.showMessageBoxSync;
  electron.dialog.showMessageBoxSync = function(browserWindow, options) {
    const opts = (typeof browserWindow === 'object' && options) ? options : browserWindow;
    translateDialogOpts(opts);
    return origShowMessageBoxSync.apply(this, arguments);
  };

  const origShowErrorBox = electron.dialog.showErrorBox;
  electron.dialog.showErrorBox = function(title, content) {
    const t = dialogTextMap[title] || title;
    const c = dialogTextMap[content] || content;
    return origShowErrorBox.call(this, t, c);
  };
}
