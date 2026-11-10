# Antigravity Autonomous Background String Harvester & Multi-Source Translator
# 100% Zero-Touch: Extracts new UI strings from official updates AND runtime IPC reports,
# applies authoritative developer terminology + Google Translate + MyMemory fallback,
# and writes to both external hot-loadable dictionary (i18n_custom_dict.json) and engine.js.
import os
import sys
import re
import json
import shutil
import subprocess
import requests

TOOL_DIR = os.path.dirname(os.path.abspath(__file__))
ENGINE_PATH = os.path.join(TOOL_DIR, 'runtime', 'engine.js')
local_app_data = os.environ.get('LOCALAPPDATA') or os.path.expanduser('~\\AppData\\Local')
default_program_dir = os.path.join(local_app_data, 'Programs', 'antigravity')
RES_DIR = os.path.join(default_program_dir, 'resources')
ASAR_BAK = os.environ.get('ANTIGRAVITY_ASAR_BAK') or os.path.join(RES_DIR, 'app.asar.bak')
CUSTOM_DICT_FILE = os.path.join(RES_DIR, 'i18n_custom_dict.json')
UNTRANSLATED_FILE = os.path.join(RES_DIR, 'i18n_untranslated.json')
WORK_DIR = os.path.join(TOOL_DIR, 'harvester_work')
MARKER_FILE = os.path.join(TOOL_DIR, '.new_words_ready')
LOG_FILE = os.path.join(TOOL_DIR, 'harvester.log')

proxy_url = os.environ.get('HTTP_PROXY') or os.environ.get('http_proxy') or os.environ.get('ALL_PROXY')
PROXIES = {
    'http': proxy_url,
    'https': proxy_url
} if proxy_url else None

# Authoritative Developer Glossary (ensures industry-standard software engineering terms)
DEV_GLOSSARY = {
    'Fork': '派生',
    'Fork Conversation': '派生对话',
    'Repository': '代码仓库',
    'Repositories': '代码仓库',
    'Workspace': '工作区',
    'Workspaces': '工作区',
    'Branch': '分支',
    'Branches': '分支',
    'Commit': '提交',
    'Commits': '提交',
    'Planning Mode': '规划模式',
    'Prompt': '提示词',
    'Prompts': '提示词',
    'Thinking': '思考过程',
    'Thinking Process': '思考过程',
    'Run': '运行',
    'Running': '正在运行',
    'Ran': '已运行',
    'Passkey': '通行密钥',
    'Built-in Browser': '内置浏览器',
    'Configure link opening and built-in browser preferences.': '配置链接打开方式与内置浏览器偏好设置。',
    'Open Links In': '链接打开方式',
    'Choose where links open by default when clicked.': '选择点击链接时的默认打开位置。',
    'Always Ask': '每次询问',
    'External Browser': '外部浏览器',
    'System Default Browser': '系统默认浏览器',
    'Open in Built-in Browser': '在内置浏览器中打开',
    'Open in External Browser': '在外部浏览器中打开',
    'Passkeys': '通行密钥',
    'Choose a Passkey': '选择通行密钥',
    'Select a passkey account to continue:': '选择一个通行密钥账号以继续：',
    'RPC call failed': 'RPC 调用失败',
    'Connect a device': '连接设备',
    'Select a device:': '请选择一个设备：',
    'No compatible devices found.': '未找到兼容的设备。',
    'HID device': 'HID 设备',
    'USB device': 'USB 设备',
    'Unknown device': '未知设备',
    'Select Download Folder': '选择下载文件夹',
    'Download Folder': '下载文件夹',
    'Default Download Folder': '默认下载文件夹',
    'Connection info': '连接信息',
    'Connection info…': '连接信息…',
    'Connection is secure': '连接安全',
    'Not secure': '不安全',
    '⚠ Not secure': '⚠ 不安全',
    'Certificate is valid': '证书有效',
    'Certificate details': '证书详情',
    'Your connection to this site is not secure': '您与此网站的连接不安全',
    'Connection security information is not available for this page': '此页面暂无连接安全信息',
    'Antigravity opened on Windows instead.': 'Antigravity 已改为在 Windows 本地打开。',
    'Sign in to': '登录到',
    'Agent': '智能体',
    'Agents': '智能体',
    'Skill': '技能',
    'Skills': '技能',
    'Rule': '规则',
    'Rules': '规则',
    'Cancel': '取消',
    'Confirm': '确认',
    'Quit': '退出',
    'Exit': '退出',
    'Settings': '设置',
    'Save': '保存',
    'Save As': '另存为',
    'New Window': '新建窗口',
    'Close Window': '关闭窗口',
    'Undo': '撤销',
    'Redo': '重做',
    'Cut': '剪切',
    'Copy': '复制',
    'Paste': '粘贴',
    'Select All': '全选',
    'Inspect Element': '审查元素',
    'Toggle Developer Tools': '切换开发者工具'
}

PROPER_NOUN_BLACKLIST = re.compile(
    r'\b(Gemini|Claude|GPT|Anthropic|OpenAI|Argon|Sonnet|Opus|Haiku|Flash|Nano|Ultra|Ubuntu|Debian|GitHub|GitLab|Python|Node|TypeScript|JavaScript|React|Electron|Firefox|Safari|JSON|YAML|TOML|HTML|CSS|OAuth|CitC|UUID)\b',
    re.IGNORECASE
)

def log(msg):
    line = f"[Harvester] {msg}"
    print(line)
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(line + '\n')
    except:
        pass

def is_valid_translation(source, trans):
    if not trans or not isinstance(trans, str):
        return False
    # Strip any residual HTML tags from machine translation APIs
    clean = re.sub(r'<[^>]+>', '', trans).strip()
    if not clean or clean.lower() == source.lower():
        return False
    # Reject machine translation error banners
    bad_markers = ['MYMEMORY WARNING', 'QUERY LENGTH LIMIT', 'TOO MANY REQUESTS', 'ERROR 400', 'ERROR 429', '<!DOCTYPE', '<html']
    for bm in bad_markers:
        if bm in clean.upper():
            return False
    # Must contain at least one Chinese character
    if not re.search(r'[\u4e00-\u9fa5]', clean):
        return False
    return clean

def translate_phrase(text):
    # 1. Check authoritative glossary
    if text in DEV_GLOSSARY:
        return DEV_GLOSSARY[text]

    # 2. Check partial template replacements
    for en_key, zh_val in DEV_GLOSSARY.items():
        if text.startswith(en_key + " ") or text.startswith(en_key + ":"):
            rest = text[len(en_key):]
            sub = translate_phrase(rest.strip()) if rest.strip() else ''
            return (zh_val + sub) if sub else (zh_val + rest)

    # Skip proper noun strings (model names, tech frameworks) from blind machine translation
    if PROPER_NOUN_BLACKLIST.search(text):
        return None

    # 3. Primary API: Google Translate
    for use_proxy in ([PROXIES, None] if PROXIES else [None]):
        try:
            url = 'https://translate.googleapis.com/translate_a/single'
            params = {
                'client': 'gtx',
                'sl': 'en',
                'tl': 'zh-CN',
                'dt': 't',
                'q': text
            }
            r = requests.get(url, params=params, proxies=use_proxy, timeout=5)
            if r.status_code == 200:
                data = r.json()
                if data and data[0]:
                    trans = "".join([part[0] for part in data[0] if part[0]])
                    valid = is_valid_translation(text, trans)
                    if valid:
                        return valid
        except Exception:
            pass

    # 4. Fallback API: MyMemory (automatically handles Google 429 rate-limits)
    for use_proxy in ([None, PROXIES] if PROXIES else [None]):
        try:
            url = 'https://api.mymemory.translated.net/get'
            params = {
                'q': text,
                'langpair': 'en|zh-CN'
            }
            r = requests.get(url, params=params, proxies=use_proxy, timeout=6)
            if r.status_code == 200:
                data = r.json()
                raw_trans = data.get('responseData', {}).get('translatedText', '')
                valid = is_valid_translation(text, raw_trans)
                if valid:
                    return valid
        except Exception as e:
            log(f"Fallback translate failed for '{text}': {e}")

    return None

def load_json_dict(path):
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                d = json.load(f)
                if isinstance(d, dict):
                    return d
        except:
            pass
    return {}

def run():
    if not os.path.exists(ENGINE_PATH):
        log("未找到本地 engine.js，退出。")
        return

    with open(ENGINE_PATH, 'r', encoding='utf-8') as f:
        engine_content = f.read()

    custom_dict = load_json_dict(CUSTOM_DICT_FILE)
    found_strings = set()

    # Source A: Read runtime UI strings reported via Electron IPC (i18n_untranslated.json)
    runtime_words = []
    if os.path.exists(UNTRANSLATED_FILE):
        try:
            with open(UNTRANSLATED_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    runtime_words = [w.strip() for w in data if isinstance(w, str) and 2 < len(w.strip()) <= 80]
                    found_strings.update(runtime_words)
            log(f"从运行期 IPC 采集池读取到 {len(runtime_words)} 个候选 UI 词条。")
        except Exception as e:
            log(f"读取运行期采集池失败: {e}")

    # Source B: Unpack official backup app.asar.bak to scan main-process UI strings
    if os.path.exists(ASAR_BAK):
        if os.path.exists(WORK_DIR):
            shutil.rmtree(WORK_DIR, ignore_errors=True)
        os.makedirs(WORK_DIR, exist_ok=True)
        extract_dir = os.path.join(WORK_DIR, 'extracted')

        log("正在从官方新版备份解包并扫描新增 UI 字符串...")
        companion_unpacked = ASAR_BAK + '.unpacked'
        source_unpacked = os.path.join(os.path.dirname(ASAR_BAK), 'app.asar.unpacked')
        created_temp_companion = False
        if not os.path.exists(companion_unpacked) and os.path.exists(source_unpacked):
            try:
                subprocess.run(f'cmd /c mklink /J "{companion_unpacked}" "{source_unpacked}"', shell=True, capture_output=True)
                created_temp_companion = True
            except:
                pass

        try:
            subprocess.run(
                f'npx --yes @electron/asar extract "{ASAR_BAK}" "{extract_dir}"',
                shell=True,
                check=True,
                capture_output=True,
                cwd=WORK_DIR
            )
            dist_dir = os.path.join(extract_dir, 'dist')
            if not os.path.exists(dist_dir):
                dist_dir = extract_dir

            pattern = re.compile(
                r'(?:title|label|message|detail|tooltip|placeholder|buttonLabel)\s*:\s*[`\'"]([A-Za-z0-9][^`\'"\r\n]{2,80})[`\'"]',
                re.IGNORECASE
            )

            for root, dirs, files in os.walk(dist_dir):
                for fn in files:
                    if fn.endswith('.js') and not fn.endswith('.map') and not fn.startswith('engine'):
                        fp = os.path.join(root, fn)
                        try:
                            with open(fp, 'r', encoding='utf-8', errors='ignore') as fp_in:
                                code = fp_in.read()
                            for m in pattern.finditer(code):
                                s = m.group(1).strip()
                                if len(s) > 2 and not s.startswith(('.', '/', '#', 'http', 'data:')) and not s.endswith(('.js', '.png', '.css', '.svg', '.json')):
                                    if ' ' in s or s[0].isupper():
                                        found_strings.add(s)
                        except:
                            pass
        except Exception as e:
            log(f"解包官方备份扫描跳过: {e}")
        finally:
            if created_temp_companion and os.path.exists(companion_unpacked):
                try: os.rmdir(companion_unpacked)
                except: pass
            shutil.rmtree(WORK_DIR, ignore_errors=True)

    # Filter out already translated strings
    new_untranslated = []
    for s in sorted(found_strings):
        if s not in custom_dict and f'"{s}"' not in engine_content and f"'{s}'" not in engine_content:
            new_untranslated.append(s)

    log(f"扫描完成：共汇总 {len(found_strings)} 个候选词条，发现 {len(new_untranslated)} 个全新未翻译词条。")

    if not new_untranslated:
        if os.path.exists(UNTRANSLATED_FILE):
            try: os.remove(UNTRANSLATED_FILE)
            except: pass
        log("本地词典与当前版本 100% 同步，无需增补。")
        return

    # Translate new strings via 3-tier pipeline
    translated_pairs = {}
    for phrase in new_untranslated:
        zh = translate_phrase(phrase)
        if zh and zh != phrase:
            translated_pairs[phrase] = zh
            log(f"  [新词对齐] {phrase} -> {zh}")

    if not translated_pairs:
        log("未获取到有效翻译，退出。")
        return

    # 1. Save immediately to external hot-loadable custom_dict.json (0ms load on next launch without repacking app.asar!)
    try:
        custom_dict.update(translated_pairs)
        os.makedirs( os.path.dirname(CUSTOM_DICT_FILE), exist_ok=True )
        with open(CUSTOM_DICT_FILE, 'w', encoding='utf-8') as f:
            json.dump(custom_dict, f, ensure_ascii=False, indent=2)
        log(f"已将 {len(translated_pairs)} 个新词写入外部动态词库: {CUSTOM_DICT_FILE} (下次启动或刷新窗口直接生效，无需重打包)")
    except Exception as e:
        log(f"写入外部动态词库失败: {e}")

    # Clear processed runtime untranslated queue
    if os.path.exists(UNTRANSLATED_FILE):
        try: os.remove(UNTRANSLATED_FILE)
        except: pass

    # 2. Also merge into engine.js for permanent persistence
    log(f"正在将 {len(translated_pairs)} 个新翻译词条同步合入 engine.js 源码库...")
    dict_marker = "const dictionary = {"
    if dict_marker not in engine_content:
        log("未找到 dictionary 挂载点，跳过源码合入。")
        return

    new_entries = "\n    // [Auto-Harvested New Words]\n"
    for en, zh in translated_pairs.items():
        safe_en = en.replace("\\", "\\\\").replace("'", "\\'")
        safe_zh = zh.replace("\\", "\\\\").replace("'", "\\'")
        new_entries += f"    '{safe_en}': '{safe_zh}',\n"

    new_engine = engine_content.replace(dict_marker, dict_marker + new_entries, 1)

    bak_engine = ENGINE_PATH + ".bak"
    shutil.copy2(ENGINE_PATH, bak_engine)

    with open(ENGINE_PATH, 'w', encoding='utf-8') as f:
        f.write(new_engine)

    check = subprocess.run(['node', '--check', ENGINE_PATH], capture_output=True, text=True)
    if check.returncode == 0:
        log("AST 语法验证通过 (node --check ALL GREEN)！已完成词典永久合入。")
        if os.path.exists(bak_engine):
            os.remove(bak_engine)
    else:
        log(f"AST 语法验证失败，自动回滚 engine.js！错误: {check.stderr}")
        shutil.copy2(bak_engine, ENGINE_PATH)
        if os.path.exists(bak_engine):
            os.remove(bak_engine)

    log("后台差分自愈流程完成。")

if __name__ == '__main__':
    run()
