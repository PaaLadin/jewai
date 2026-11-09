#!/usr/bin/env python3
"""Wiki builder: markdown -> JSON data for client-side renderer."""
import os, re, json, sys
from pathlib import Path

try:
    import markdown
except ImportError:
    print('FAIL: pip install markdown'); sys.exit(1)

WIKI = Path(r'C:\DeepSeek\wiki')
OUT = Path(r'C:\DeepSeek\sandbox\council_chat\wiki_data.json')

def parse_frontmatter(raw):
    meta, body = {}, raw
    if raw.startswith('---'):
        parts = raw.split('---', 2)
        if len(parts) >= 3:
            for line in parts[1].strip().splitlines():
                if ':' in line:
                    k, v = line.split(':', 1)
                    meta[k.strip()] = v.strip()
            body = parts[2].lstrip('\n')
    return meta, body

def linkify(html, pages_known):
    """[[path|text]] -> <a>. Unknown -> red link."""
    def repl(m):
        inner = m.group(1)
        if '|' in inner:
            path, text = inner.split('|', 1)
        else:
            path, text = inner, inner
        path = path.strip(); text = text.strip()
        if path in pages_known:
            return f'<a href="#/{path}" class="wiki-link">{text}</a>'
        return f'<a href="#/{path}" class="wiki-link red">{text}</a>'
    return re.sub(r'\[\[([^\]]+)\]\]', repl, html)

def main():
    md = markdown.Markdown(extensions=['tables', 'fenced_code'])
    raw_pages = []
    for p in sorted(WIKI.rglob('*.md')):
        rel = p.relative_to(WIKI).with_suffix('').as_posix()
        raw = p.read_text(encoding='utf-8')
        meta, body = parse_frontmatter(raw)
        raw_pages.append((rel, meta, body))
    known = {rel for rel, _, _ in raw_pages}
    pages = {}
    for rel, meta, body in raw_pages:
        html = md.convert(body); md.reset()
        html = linkify(html, known)
        pages[rel] = {
            'title': meta.get('title', rel),
            'tags': [t.strip() for t in meta.get('tags', '').strip('[]').split(',') if t.strip()],
            'related': [r.strip() for r in meta.get('related', '').strip('[]').split(',') if r.strip()],
            'updated': meta.get('updated', ''),
            'html': html,
        }
    tree = {}
    for rel, page in pages.items():
        if rel == 'index':
            continue
        parts = rel.split('/')
        cat = parts[0] if len(parts) > 1 else '_root'
        tree.setdefault(cat, []).append((rel, page['title']))
    for cat in tree:
        tree[cat].sort(key=lambda x: x[1].lower())
    data = {'pages': pages, 'tree': tree, 'index': pages.get('index', {})}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'OK {len(pages)} pages -> {OUT} ({OUT.stat().st_size} bytes)')
    print('categories:', {k: len(v) for k, v in tree.items()})

if __name__ == '__main__':
    main()
if __name__ == '__main__':
    main()