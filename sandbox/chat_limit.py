"""chat_limit.py - проверка переполнения чата (триггер №2).
Читает ТЕКСТ ЧАТА (не sidepanel) через нативный CDP.
Печатает LIMIT или OK.
Usage: python sandbox/chat_limit.py --port 9225
"""
import argparse, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp_client import CDPSession, find_chat_target

# Только СПЕЦИФИЧНЫЕ маркеры (грабли 13.10: "new chat"/"начните новый чат"
# ловились ложно из обычного текста -> преждевременное перерождение).
PHRASES = ["предел длины", "превышен лимит",
           "length limit reached", "please start a new chat"]

ap = argparse.ArgumentParser()
ap.add_argument("--port", type=int, required=True)
a = ap.parse_args()

t = find_chat_target(a.port)
if not t:
    print("NOCHAT"); sys.exit(0)
s = CDPSession(t["webSocketDebuggerUrl"])
# Ловим БАННЕР (короткий системный элемент), не упоминание в тексте.
# Грабли 13.10: "Length limit reached" встречается в сообщениях агентов
# (они цитируют документацию) -> ложное срабатывание.
res = s.eval("""(() => {
  const ph = ["предел длины", "превышен лимит", "length limit reached", "please start a new chat"];
  const els = Array.from(document.querySelectorAll('div,span,p,section'));
  for (const e of els) {
    const t = (e.innerText || '').trim().toLowerCase();
    if (!t || t.length > 160) continue;   // баннер короткий
    if (e.querySelector('div,span,p')) continue; // берём самый вложенный
    for (const p of ph) if (t.includes(p)) return p;
  }
  return '';
})()""")
s.close()
print("LIMIT" if res else "OK")