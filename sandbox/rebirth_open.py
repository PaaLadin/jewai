import argparse, json, time, sys
sys.path.insert(0, r'C:\DeepSeek\sandbox')
from cdp_client import CDPSession, list_targets

ap = argparse.ArgumentParser()
ap.add_argument('--cdp', type=int, required=True)
ap.add_argument('--fill', required=True)
ap.add_argument('--attach', nargs='*', default=[])
ap.add_argument('--out', required=True)
a = ap.parse_args()
res = {'ok': False, 'url': '', 'err': ''}

def save():
    json.dump(res, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False)
    print(json.dumps(res, ensure_ascii=False))

def _find_ta():
    return ("(function(){var ts=Array.from(document.querySelectorAll('textarea'));"
            "for(var i=0;i<ts.length;i++){var r=ts[i].getBoundingClientRect();"
            "if(r.width>0&&r.height>0&&!ts[i].readOnly)return true;}return false;})()")

def _fill(text):
    j = json.dumps(text)
    return ("(function(){var ts=Array.from(document.querySelectorAll('textarea'));"
            "var ta=null;for(var i=0;i<ts.length;i++){var r=ts[i].getBoundingClientRect();"
            "if(r.width>0&&r.height>0&&!ts[i].readOnly){ta=ts[i];break;}}"
            "if(!ta)return false;ta.focus();"
            "var st=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;"
            "st.call(ta," + j + ");"
            "if(ta._valueTracker)ta._valueTracker.setValue('');"
            "ta.dispatchEvent(new Event('input',{bubbles:true}));"
            "ta.dispatchEvent(new Event('change',{bubbles:true}));"
            "return ta.value.length>0;})()")

def _focus():
    return ("(function(){var ts=Array.from(document.querySelectorAll('textarea'));"
            "for(var i=0;i<ts.length;i++){var r=ts[i].getBoundingClientRect();"
            "if(r.width>0&&r.height>0&&!ts[i].readOnly){ts[i].focus();return true;}}"
            "return false;})()")

try:
    tgt = None
    for t in list_targets(a.cdp):
        u = t.get('url', '')
        if 'chat.deepseek.com' in u and t.get('type') == 'page':
            tgt = t
            break
    if not tgt:
        res['err'] = 'no page'
        save(); sys.exit(2)

    s = CDPSession(tgt['webSocketDebuggerUrl'])
    s.call('Page.enable')
    s.call('Runtime.enable')
    s.call('Page.navigate', {'url': 'https://chat.deepseek.com/'})
    time.sleep(5)

    for _ in range(15):
        r = s.call('Runtime.evaluate', {'expression': _find_ta(), 'returnByValue': True})
        if r.get('result', {}).get('result', {}).get('value'):
            break
        time.sleep(2)
    else:
        res['err'] = 'no textarea'
        save(); sys.exit(3)

    for _ in range(5):
        r = s.call('Runtime.evaluate', {'expression': _fill(a.fill), 'returnByValue': True})
        if r.get('result', {}).get('result', {}).get('value'):
            break
        time.sleep(1)
    else:
        res['err'] = 'fill fail'
        save(); sys.exit(4)

    attach_result = {'ok': False, 'err': '', 'inputs': 0, 'chips': []}
    if a.attach:
        try:
            # полное дерево с pierce — input[type=file] на deep уровне (display:none)
            doc = s.call('DOM.getDocument', {'depth': -1, 'pierce': True})
            # cdp_client.call возвращает весь ответ: {'id':.., 'result': {'root': {...}}}
            root = ((doc or {}).get('result') or {}).get('root') or {}
            root_id = root.get('nodeId')
            if not root_id:
                raise RuntimeError('no DOM root, doc keys=%r' % (list((doc or {}).keys()),))
            root = root_id
            nodes = s.call('DOM.querySelectorAll',
                           {'nodeId': root, 'selector': 'input[type=file]'})
            ids = nodes.get('result', {}).get('nodeIds', [])
            attach_result['inputs'] = len(ids)
            if not ids:
                raise RuntimeError('input[type=file] not found (depth=-1)')
            r = s.call('DOM.setFileInputFiles',
                       {'files': a.attach, 'nodeId': ids[-1]})
            if 'error' in r:
                raise RuntimeError('setFileInputFiles error: %r' % r)
            time.sleep(4)
            # верификация: input.files.length > 0 и в DOM появились имена
            files_ok = False
            for _ in range(15):
                chk = s.eval(
                    """(function(){var i=document.querySelector('input[type=file]');
                       if(!i)return JSON.stringify({n:0,names:[]});
                       var names=[];for(var k=0;k<(i.files||[]).length;k++){names.push(i.files[k].name);}
                       return JSON.stringify({n:(i.files||[]).length,names:names});})()""")
                try:
                    import json as _j
                    d = _j.loads(chk or '{}')
                except Exception:
                    d = {}
                if d.get('n', 0) > 0:
                    files_ok = True
                    attach_result['ok'] = True
                    attach_result['chips'] = d.get('names', [])
                    break
                time.sleep(1)
            if not files_ok:
                attach_result['err'] = 'files not accepted by input'
        except Exception as _ae:
            attach_result['err'] = repr(_ae)[:200]
            print('    ATTACH ERR:', attach_result['err'])
    res['attach'] = attach_result

    def get_url():
        r = s.call('Runtime.evaluate', {'expression': 'window.location.href', 'returnByValue': True})
        return r.get('result', {}).get('result', {}).get('value', '')

    u0 = get_url()
    ok = False
    for _ in range(3):
        s.call('Runtime.evaluate', {'expression': _focus(), 'returnByValue': True})
        time.sleep(0.5)
        for _ in range(2):
            s.call('Input.dispatchKeyEvent', {'type': 'keyDown', 'key': 'Enter', 'code': 'Enter', 'windowsVirtualKeyCode': 13, 'nativeVirtualKeyCode': 13})
            time.sleep(0.1)
            s.call('Input.dispatchKeyEvent', {'type': 'keyUp', 'key': 'Enter', 'code': 'Enter', 'windowsVirtualKeyCode': 13, 'nativeVirtualKeyCode': 13})
            time.sleep(2)
        for _ in range(15):
            time.sleep(1)
            u = get_url()
            if u != u0 and '/a/chat/s/' in u:
                ok = True
                res['url'] = u
                break
        if ok:
            break

    res['ok'] = ok
    if not ok:
        res['err'] = 'no new url'
    s.close()
except Exception as e:
    res['err'] = 'exception: ' + repr(e)[:200]

save()