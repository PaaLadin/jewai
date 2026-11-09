(function(){
  var DATA = null, current = 'index', loading = false;

  function el(id){ return document.getElementById(id); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  function loadData(cb){
    if (DATA) { cb(); return; }
    if (loading) return;
    loading = true;
    fetch('/api/wiki', {cache:'no-store'})
      .then(function(r){ return r.json(); })
      .then(function(j){ DATA = j; loading = false; cb(); })
      .catch(function(e){ loading = false; console.error('wiki load fail', e); });
  }

  function renderTree(){
    var tree = DATA.tree || {};
    var html = '';
    var order = ['functions', 'projects', 'troubleshooting'];
    var labels = {functions:'ФУНКЦИИ', projects:'ПРОЕКТЫ', troubleshooting:'ТРАБЛШУТИНГ'};
    var seen = {};
    order.forEach(function(cat){
      if (!tree[cat]) return;
      seen[cat] = 1;
      html += '<div class="wiki-cat"><div class="wiki-cat-title">' + (labels[cat]||cat.toUpperCase()) + '</div><ul>';
      tree[cat].forEach(function(item){
        html += '<li><a href="#/' + item[0] + '" data-path="' + item[0] + '">' + esc(item[1]) + '</a></li>';
      });
      html += '</ul></div>';
    });
    Object.keys(tree).forEach(function(cat){
      if (seen[cat]) return;
      html += '<div class="wiki-cat"><div class="wiki-cat-title">' + esc(cat.toUpperCase()) + '</div><ul>';
      tree[cat].forEach(function(item){
        html += '<li><a href="#/' + item[0] + '" data-path="' + item[0] + '">' + esc(item[1]) + '</a></li>';
      });
      html += '</ul></div>';
    });
    el('wikiTree').innerHTML = html;
  }

  function renderArticle(path){
    var page = DATA.pages[path];
    if (!page) {
      el('wikiContent').innerHTML = '<div class="wiki-404">Статья не найдена: <code>' + esc(path) + '</code></div>';
      return;
    }
    var meta = '';
    if (page.updated) meta += '<span class="wiki-meta">обновлено: ' + esc(page.updated) + '</span>';
    if (page.tags && page.tags.length) meta += ' <span class="wiki-tags">' + page.tags.map(function(t){return '<span class="wiki-tag">'+esc(t)+'</span>';}).join('') + '</span>';
    el('wikiContent').innerHTML = '<div class="wiki-page-meta">' + meta + '</div>' + page.html;
    // highlight active link
    var links = document.querySelectorAll('#wikiTree a');
    for (var i=0;i<links.length;i++){
      if (links[i].getAttribute('data-path') === path) links[i].classList.add('active');
      else links[i].classList.remove('active');
    }
    el('wikiContent').scrollTop = 0;
  }

  function show(path){
    current = path || 'index';
    history.replaceState(null, '', '#/' + current);
    renderArticle(current);
  }

  function renderSearch(q){
    q = (q||'').trim().toLowerCase();
    if (!q) { el('wikiSearchResults').innerHTML = ''; el('wikiSearchResults').style.display='none'; return; }
    var hits = [];
    Object.keys(DATA.pages).forEach(function(path){
      var p = DATA.pages[path];
      var title = (p.title||'').toLowerCase();
      var body = (p.html||'').toLowerCase();
      var score = 0;
      if (title.indexOf(q) !== -1) score += 10;
      if (body.indexOf(q) !== -1) score += 1;
      if (score > 0) hits.push({path:path, title:p.title, score:score});
    });
    hits.sort(function(a,b){return b.score - a.score;});
    if (!hits.length) {
      el('wikiSearchResults').innerHTML = '<div class="wiki-no-hit">ничего не найдено</div>';
    } else {
      el('wikiSearchResults').innerHTML = hits.slice(0,30).map(function(h){
        return '<a href="#/' + h.path + '" data-path="' + h.path + '" class="wiki-hit">' + esc(h.title) + '</a>';
      }).join('');
    }
    el('wikiSearchResults').style.display = 'block';
  }

  function init(){
    loadData(function(){
      renderTree();
      var initial = (location.hash.indexOf('#/') === 0) ? location.hash.slice(2) : 'index';
      show(initial);

      // search
      var q = el('wikiSearch');
      if (q) {
        var timer = null;
        q.addEventListener('input', function(e){ clearTimeout(timer); timer = setTimeout(function(){ renderSearch(e.target.value); }, 120); });
        q.addEventListener('keydown', function(e){ if (e.key === 'Escape') { q.value = ''; renderSearch(''); q.blur(); } });
      }

      // click handlers
      document.addEventListener('click', function(e){
        var a = e.target.closest('a');
        if (!a) return;
        var href = a.getAttribute('href') || '';
        if (href.indexOf('#/') === 0) {
          e.preventDefault();
          show(href.slice(2));
        }
      });

      // hash navigation
      window.addEventListener('hashchange', function(){
        var path = (location.hash.indexOf('#/') === 0) ? location.hash.slice(2) : 'index';
        if (path !== current) show(path);
      });
    });
  }

  window.__wikiInit = function(){ init(); };
})();