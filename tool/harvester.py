# Antigravity Autonomous Background String Harvester & AI Translator
# 100% Zero-Touch: Automatically extracts new UI strings from official updates,
# applies authoritative developer terminology and Google Translate via proxy,
# and safely merges into the local localization dictionary.
import os
import sys
import re
import json
import shutil
import subprocess
import requests

TOOL_DIR = os.path.dirname(os.path.abspath(__file__))
ENGINE_PATH = os.path.join(TOOL_DIR, 'runtime', 'engine.js')
ASAR_BAK = r'C:\Users\DanielSong\AppData\Local\Programs\antigravity\resources\app.asar.bak'
WORK_DIR = os.path.join(TOOL_DIR, 'harvester_work')
MARKER_FILE = os.path.join(TOOL_DIR, '.new_words_ready')
LOG_FILE = os.path.join(TOOL_DIR, 'harvester.log')

PROXIES = {
    'http': 'http://127.0.0.1:7897',
    'https': 'http://127.0.0.1:7897'
}

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
    'Passkeys': '通行密钥',
    'Choose a Passkey': '选择通行密钥',
    'Select a passkey account to continue:': '选择一个通行密钥账号以继续：',
    'RPC call failed': 'RPC 调用失败',
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

def log(msg):
    line = f"[Harvester] {msg}"
    print(line)
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(line + '\n')
    except:
        pass

def translate_phrase(text):
    # 1. Check authoritative glossary
    if text in DEV_GLOSSARY:
        return DEV_GLOSSARY[text]
    
    # 2. Check partial template replacements (e.g. "Sign in to ${rpLabel}")
    for en_key, zh_val in DEV_GLOSSARY.items():
        if text.startswith(en_key + " ") or text.startswith(en_key + ":"):
            rest = text[len(en_key):]
            return zh_val + translate_phrase(rest.strip()) if rest.strip() else zh_val + rest

    # 3. Call Google Translate via proxy
    try:
        url = 'https://translate.googleapis.com/translate_a/single'
        params = {
            'client': 'gtx',
            'sl': 'en',
            'tl': 'zh-CN',
            'dt': 't',
            'q': text
        }
        r = requests.get(url, params=params, proxies=PROXIES, timeout=6)
        if r.status_code == 200:
            data = r.json()
            if data and data[0]:
                trans = "".join([part[0] for part in data[0] if part[0]])
                if trans:
                    return trans
    except Exception as e:
        log(f"Translate failed for '{text}': {e}")
    
    return None

def run():
    if not os.path.exists(ASAR_BAK):
        log("未找到官方原版备份 app.asar.bak，退出。")
        return

    if not os.path.exists(ENGINE_PATH):
        log("未找到本地 engine.js，退出。")
        return

    with open(ENGINE_PATH, 'r', encoding='utf-8') as f:
        engine_content = f.read()

    # 1. Unpack backup to temp work directory
    if os.path.exists(WORK_DIR):
        shutil.rmtree(WORK_DIR, ignore_errors=True)
    os.makedirs(WORK_DIR, exist_ok=True)
    extract_dir = os.path.join(WORK_DIR, 'extracted')

    log("正在从官方新版备份解包并扫描新增 UI 字符串...")
    companion_unpacked = ASAR_BAK + '.unpacked'
    source_unpacked = r'C:\Users\DanielSong\AppData\Local\Programs\antigravity\resources\app.asar.unpacked'
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
    except Exception as e:
        log(f"解包官方备份失败: {e}")
        if created_temp_companion and os.path.exists(companion_unpacked):
            try: os.rmdir(companion_unpacked)
            except: pass
        shutil.rmtree(WORK_DIR, ignore_errors=True)
        return
    finally:
        if created_temp_companion and os.path.exists(companion_unpacked):
            try: os.rmdir(companion_unpacked)
            except: pass

    # 2. Extract candidate UI strings
    found_strings = set()
    dist_dir = os.path.join(extract_dir, 'dist')
    if not os.path.exists(dist_dir):
        dist_dir = extract_dir

    pattern = re.compile(
        r'(?:title|label|message|detail|tooltip|placeholder|status)\s*:\s*[`\'"]([A-Za-z0-9][^`\'"\r\n]{2,80})[`\'"]',
        re.IGNORECASE
    )

    for root, dirs, files in os.walk(dist_dir):
        for f in files:
            if f.endswith('.js') and not f.endswith('.map') and not f.startswith('engine'):
                fp = os.path.join(root, f)
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

    # 3. Find untranslated strings
    new_untranslated = []
    for s in found_strings:
        # Check if already present in dictionary
        if f'"{s}"' not in engine_content and f"'{s}'" not in engine_content:
            new_untranslated.append(s)

    log(f"扫描完成：共提取 {len(found_strings)} 个 UI 字符串，发现 {len(new_untranslated)} 个全新未翻译词条。")

    if not new_untranslated:
        log("本地词典与当前官方版本 100% 同步，无需增补。")
        shutil.rmtree(WORK_DIR, ignore_errors=True)
        return

    # 4. Translate new strings
    translated_pairs = {}
    for phrase in new_untranslated:
        zh = translate_phrase(phrase)
        if zh and zh != phrase:
            translated_pairs[phrase] = zh
            log(f"  [新词对齐] {phrase} -> {zh}")

    if not translated_pairs:
        log("未获取到有效翻译，退出。")
        shutil.rmtree(WORK_DIR, ignore_errors=True)
        return

    # 5. Inject into engine.js
    log(f"正在将 {len(translated_pairs)} 个新翻译词条安全合入本地词典库...")
    dict_marker = "const dictionary = {"
    if dict_marker not in engine_content:
        log("未找到 dictionary 挂载点，合入失败。")
        shutil.rmtree(WORK_DIR, ignore_errors=True)
        return

    # Format entries
    new_entries = "\n    // [Auto-Harvested New Words]\n"
    for en, zh in translated_pairs.items():
        safe_en = en.replace("'", "\\'")
        safe_zh = zh.replace("'", "\\'")
        new_entries += f"    '{safe_en}': '{safe_zh}',\n"

    new_engine = engine_content.replace(dict_marker, dict_marker + new_entries, 1)

    # Backup & test syntax
    bak_engine = ENGINE_PATH + ".bak"
    shutil.copy2(ENGINE_PATH, bak_engine)

    with open(ENGINE_PATH, 'w', encoding='utf-8') as f:
        f.write(new_engine)

    check = subprocess.run(['node', '--check', ENGINE_PATH], capture_output=True, text=True)
    if check.returncode == 0:
        log("AST 语法验证通过 (node --check ALL GREEN)！已完成词典增量合入。")
        with open(MARKER_FILE, 'w', encoding='utf-8') as f:
            json.dump(translated_pairs, f, ensure_ascii=False, indent=2)
        if os.path.exists(bak_engine):
            os.remove(bak_engine)
    else:
        log(f"AST 语法验证失败，自动回滚词典！错误: {check.stderr}")
        shutil.copy2(bak_engine, ENGINE_PATH)
        if os.path.exists(bak_engine):
            os.remove(bak_engine)

    # 6. Cleanup
    shutil.rmtree(WORK_DIR, ignore_errors=True)
    log("后台差分自愈流程完成。")

if __name__ == '__main__':
    run()
