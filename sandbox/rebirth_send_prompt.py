"""rebirth_send_prompt.py — отправка PROMPT_<next>.md текстом в новый чат.

Используется rebirth_cdp.py после создания нового чата. Заменяет ненадёжный
attach через input[type=file] (в DeepSeek file-input скрыт без клика по скрепке).

Баг-фикс 2026-10-27: B переродился, но инструкция не пришла — агент отвечал
как ChatGPT «у меня нет доступа к TODO».
"""
import json
import time


def send_prompt_to_chat(cdp_port, new_url, prompt_path, header):
    import sys as _s
    import os as _o
    _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__)))
    from cdp_client import CDPSession, list_targets

    with open(prompt_path, encoding='utf-8') as f:
        prompt_text = f.read()
    if len(prompt_text) > 18000:
        prompt_text = prompt_text[:18000] + "\n\n[...PROMPT truncated...]"

    HASH = chr(35) * 3
    BT = chr(96) * 3
    msg = (
        header + "\n\n"
        "Активация. Ты — LLM в браузерном чате. Прямого доступа к диску нет, "
        "но есть мост JewAI: он ловит в твоём тексте специальные блоки и шлёт "
        "локальному Python-агенту, возвращая [AGENT REPORT] с результатом.\n\n"
        "Формат блока (внутри код-фенса):\n"
        "  открывающая строка: " + HASH + " BEGIN " + HASH + "\n"
        "  строки: id: <PR> | op: read | path: <файл>\n"
        "  закрывающая: " + HASH + " END " + HASH + "\n\n"
        "Ниже твой PROMPT — прочитай и выполни первое действие (чтение файлов через мост).\n\n"
        "---\n" + prompt_text
    )

    tabs = [x for x in list_targets(cdp_port)
            if x.get('type') == 'page' and 'chat.deepseek.com' in x.get('url', '')]
    if not tabs:
        print("    send_prompt: NO TAB")
        return False
    tgt = None
    if new_url:
        for t in tabs:
            if new_url.rstrip('/') in t.get('url', ''):
                tgt = t
                break
    if not tgt:
        tgt = tabs[-1]

    s = CDPSession(tgt['webSocketDebuggerUrl'], timeout=60)

    for _ in range(15):
        r = s.eval("(()=>{var t=document.querySelector('textarea');return t?'OK':'NO';})()")
        if r == 'OK':
            break
        time.sleep(2)
    else:
        print("    send_prompt: NO TEXTAREA")
        s.close()
        return False

    msg_json = json.dumps(msg)
    fill_js = (
        "(() => {"
        "var ts=Array.from(document.querySelectorAll('textarea'));"
        "var ta=null;"
        "for(var i=0;i<ts.length;i++){var rc=ts[i].getBoundingClientRect();"
        "if(rc.width>0&&rc.height>0&&!ts[i].readOnly){ta=ts[i];break;}}"
        "if(!ta)return 'NO TA';"
        "ta.focus();"
        "var setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;"
        "setter.call(ta," + msg_json + ");"
        "if(ta._valueTracker)ta._valueTracker.setValue('');"
        "ta.dispatchEvent(new Event('input',{bubbles:true}));"
        "ta.dispatchEvent(new Event('change',{bubbles:true}));"
        "return ta.value.length>0?'OK':'EMPTY';"
        "})()"
    )

    ok = False
    for _ in range(3):
        r = s.eval(fill_js)
        if 'OK' in str(r):
            ok = True
            break
        time.sleep(1)
    if not ok:
        print("    send_prompt: fill fail")
        s.close()
        return False

    time.sleep(0.5)
    for _ in range(2):
        s.call('Input.dispatchKeyEvent',
               {'type': 'keyDown', 'key': 'Enter', 'code': 'Enter',
                'windowsVirtualKeyCode': 13, 'nativeVirtualKeyCode': 13})
        time.sleep(0.1)
        s.call('Input.dispatchKeyEvent',
               {'type': 'keyUp', 'key': 'Enter', 'code': 'Enter',
                'windowsVirtualKeyCode': 13, 'nativeVirtualKeyCode': 13})
        time.sleep(2)
    s.close()
    return True