import argparse,json,time,sys
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser()
ap.add_argument('--cdp',type=int,required=True)
ap.add_argument('--fill',required=True)
ap.add_argument('--attach',nargs='*',default=[])
ap.add_argument('--out',required=True)
a=ap.parse_args()
res={'ok':False,'url':'','err':''}
def save():
    json.dump(res,open(a.out,'w',encoding='utf-8'),ensure_ascii=False);print(json.dumps(res,ensure_ascii=False))
with sync_playwright() as p:
    b=p.chromium.connect_over_cdp('http://127.0.0.1:%d'%a.cdp,timeout=30000)
    ctx=b.contexts[0]
    pg=None
    for x in ctx.pages:
        if 'chat.deepseek.com' in x.url: pg=x;break
    if not pg: res['err']='no page';save();sys.exit(2)
    pg.goto('https://chat.deepseek.com/',wait_until='domcontentloaded',timeout=60000)
    try: pg.wait_for_selector('textarea',timeout=30000)
    except Exception: res['err']='no textarea';save();sys.exit(3)
    ta=pg.query_selector('textarea');ta.click();ta.fill(a.fill);time.sleep(1)
    v=pg.evaluate("()=> (document.querySelector('textarea')||{}).value||''")
    if a.fill[:5] not in v: res['err']='fill fail';save();sys.exit(4)
    if a.attach:
        inp=pg.query_selector('input[type=file]')
        if inp: inp.set_input_files(a.attach);time.sleep(4)
    u0=pg.url;ok=False
    for i in range(3):
        try:
            ta=pg.query_selector('textarea')
            if ta: ta.click()
        except Exception: pass
        try: pg.keyboard.press('Enter')
        except Exception as e: res['err']='press: %r'%e;break
        time.sleep(2)
        try: pg.keyboard.press('Enter')
        except Exception: pass
        for _ in range(15):
            time.sleep(1)
            if pg.url!=u0 and '/a/chat/s/' in pg.url: ok=True;break
        if ok: break
    res['ok']=ok;res['url']=pg.url if ok else '';res['err']=res['err'] if not ok else ''
    if not ok and not res['err']: res['err']='no new url'
save()