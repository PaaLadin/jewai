// mnemo.js — мнемосхема v1.3 (правки оператора 05.10).
// Крупный текст, гейт на нижней границе, council в mainframe,
// направленные связи цветом абонента, прогресс 20 сегментов.

const MN = {};
MN.channels = [
  {id:'A', name:'АРКАДИЙ', color:'#00ff66', x:40,  y:50},
  {id:'B', name:'БОРИС',   color:'#33d6ff', x:380, y:50},
  {id:'C', name:'СЕМЁН',   color:'#c573ff', x:720, y:50},
  {id:'D', name:'ДИМОН',   color:'#ffb000', x:1060, y:50},
];
// ресурсы: RAG, песочница, прокси (без council — он в mainframe)
MN.resources = [
  {id:'rag',     name:'RAG',        x:60,  y:520, w:220, h:100},
  {id:'sandbox', name:'ПЕСОЧНИЦА',  x:320, y:520, w:220, h:100},
  {id:'doh',     name:'ПРОКСИ 9999',x:580, y:520, w:220, h:100},
];
MN.mainframe = {x:900, y:490, w:360, h:160};

const SVGNS='http://www.w3.org/2000/svg';
let mnSvg=null, monList=null;
let lastStatus=null;
const now = () => Date.now()/1000;

function svgEl(t,a){const e=document.createElementNS(SVGNS,t);for(const k in a)e.setAttribute(k,a[k]);return e;}
function svgTxt(x,y,s,cls){const t=svgEl('text',{x,y,class:cls||'mnemo-t','text-anchor':'middle'});t.textContent=s;return t;}

function chanBox(ch){
  const g=svgEl('g',{id:'node_chan_'+ch.id});
  const x=ch.x, y=ch.y, w=ch.bw||300;
  // компактный блок: 150 высотой (было 250). Контролы -> в правую панель.
  g.appendChild(svgEl('rect',{x,y,width:w,height:150,rx:10,fill:'#0a1a0e',stroke:ch.color,'stroke-width':3,filter:'url(#glow)'}));
  g.appendChild(svgTxt(x+w/2, y+26, 'КАНАЛ '+ch.id+' — '+ch.name));
  g.appendChild(svgEl('rect',{x:x+20,y:y+40,width:w-40,height:58,rx:6,fill:'#061206',stroke:ch.color,'stroke-width':1.5}));
  g.appendChild(svgTxt(x+w/2, y+74, 'МОЗГ / ЧАТ'));
  g.appendChild(svgEl('rect',{id:'gate_'+ch.id,x:x+40,y:y+106,width:w-80,height:32,rx:6,fill:'#061206',stroke:ch.color,'stroke-width':2}));
  g.appendChild(svgTxt(x+w/2, y+128, 'ГЕЙТ', 'mnemo-ts'));
  g.appendChild(svgEl('circle',{id:'led_chan_'+ch.id,cx:x+w-20,cy:y+20,r:7,fill:'#333'}));
  return g;
}
function agentBox(ch){
  const bw=ch.bw||300; const x=ch.x+(bw-160)/2, y=(ch.ay!=null?ch.ay:200), w=160, h=50;
  const g=svgEl('g',{id:'node_agent_'+ch.id});
  g.appendChild(svgEl('rect',{id:'rect_agent_'+ch.id,x,y,width:w,height:h,rx:8,fill:'#0a1a0e',stroke:ch.color,'stroke-width':2}));
  g.appendChild(svgTxt(x+w/2, y+22, 'PY-АГЕНТ'));
  g.appendChild(svgTxt(x+w/2, y+40, '876'+ch.id.charCodeAt(0)%10,'mnemo-ts'));
  return g;
}
function resBox(r){
  const g=svgEl('g',{id:'node_res_'+r.id});
  g.appendChild(svgEl('rect',{id:'rect_res_'+r.id,x:r.x,y:r.y,width:r.w,height:r.h,rx:10,fill:'#0a1a0e',stroke:'#0a8a3a','stroke-width':2}));
  g.appendChild(svgTxt(r.x+r.w/2, r.y+55, r.name));
  return g;
}
function mainframeBox(){
  const m=MN.mainframe;
  const g=svgEl('g',{id:'node_mainframe'});
  g.appendChild(svgEl('rect',{id:'rect_mainframe',x:m.x,y:m.y,width:m.w,height:m.h,rx:12,fill:'#0d2414',stroke:'#00ff66','stroke-width':3,filter:'url(#glow)'}));
  g.appendChild(svgTxt(m.x+m.w/2, m.y+40, 'MAINFRAME'));
  // council внутри mainframe
  g.appendChild(svgEl('rect',{x:m.x+20,y:m.y+60,width:m.w-40,height:70,rx:6,fill:'#061206',stroke:'#00ff66','stroke-width':1.5}));
  g.appendChild(svgTxt(m.x+m.w/2, m.y+100, 'COUNCIL 8770'));
  return g;
}
function orthoPath(x1,y1,x2,y2,mid){
  if(mid==='v') return 'M'+x1+','+y1+' L'+x1+','+((y1+y2)/2)+' L'+x2+','+((y1+y2)/2)+' L'+x2+','+y2;
  return 'M'+x1+','+y1+' L'+((x1+x2)/2)+','+y1+' L'+((x1+x2)/2)+','+y2+' L'+x2+','+y2;
}
function linkLine(id,x1,y1,x2,y2,color,mid){
  return svgEl('path',{id:'link_'+id,d:orthoPath(x1,y1,x2,y2,mid||'v'),class:'mnemo-link link-idle',stroke:color});
}
// Раскладка от числа каналов N. Возвращает {chans, resY, mf}.
// SVG viewBox 1400x760. Блок канала 300x250, агент ниже.
function layoutChannels(chans){
  const N=chans.length, W=1400;
  const topN = N<=5 ? N : Math.ceil(N/2);
  const botN = N<=5 ? 0 : N-topN;
  const perRow = Math.max(topN, botN, 1);
  const bw = Math.min(300, Math.floor((W-60)/perRow));
  const gap = (W - topN*bw) / (topN+1);
  for(let i=0;i<topN;i++){ chans[i].x=Math.round(gap*(i+1)+bw*i); chans[i].y=15; chans[i].bw=bw; chans[i].ay=180; }
  let resY, mfY;
  if(N<=5){ resY=420; mfY=400; }
  else {
    const gap2 = (W - botN*bw) / (botN+1);
    for(let i=0;i<botN;i++){ chans[topN+i].x=Math.round(gap2*(i+1)+bw*i); chans[topN+i].y=560; chans[topN+i].bw=bw; chans[topN+i].ay=500; }
    resY=280; mfY=260;
  }
  return {resY, mfY};
}

function buildMnemo(){
  mnSvg=document.getElementById('mnemo');
  if(!mnSvg) return;
  mnSvg.innerHTML='';
  // динамическая раскладка от N (1-10)
  if(MN.channels && MN.channels.length){ const _ly=layoutChannels(MN.channels);
    if(MN.resources){
      for(const r of MN.resources){ r.y=_ly.resY; }
    }
    if(MN.mainframe){ MN.mainframe.y=_ly.mfY; }
  }
  // defs: неоновое свечение
  const defs=svgEl('defs');
  const f=svgEl('filter',{id:'glow'});
  f.appendChild(svgEl('feGaussianBlur',{stdDeviation:'3',result:'b'}));
  const mrg=svgEl('feMerge');
  mrg.appendChild(svgEl('feMergeNode',{in:'b'}));
  mrg.appendChild(svgEl('feMergeNode',{in:'SourceGraphic'}));
  f.appendChild(mrg); defs.appendChild(f); mnSvg.appendChild(defs);

  const gl=svgEl('g',{id:'linksLayer'});
  mnSvg.appendChild(gl);
  const CH=MN.channels;
  // гейт -> агент (направленная, цвет абонента)
  for(const ch of CH){
    const _c=(ch.bw||300)/2;
    const _ay=(ch.ay!=null?ch.ay:200);
    const _y1=ch.y+150, _y2=_ay+(ch.ay!=null && ch.y>300 ? 50 : 0);
    gl.appendChild(linkLine('chan'+ch.id+'_agent',ch.x+_c,_y1,ch.x+_c,(ch.y>300?_ay+50:_ay),ch.color,'v'));
  }
  // агент -> ресурсы + mainframe
  for(const ch of CH){
    const _bw=(ch.bw||300);
    const ax=ch.x+_bw/2;
    const ay=(ch.ay!=null?ch.ay:200)+50;
    const _resY=MN.resources&&MN.resources[0]?MN.resources[0].y:520;
    const _mfY=MN.mainframe?MN.mainframe.y:490;
    gl.appendChild(linkLine('agent'+ch.id+'_rag',ax,ay,170,_resY,ch.color,'v'));
    gl.appendChild(linkLine('agent'+ch.id+'_sandbox',ax,ay,430,_resY,ch.color,'v'));
    gl.appendChild(linkLine('agent'+ch.id+'_doh',ax,ay,690,_resY,ch.color,'v'));
    gl.appendChild(linkLine('agent'+ch.id+'_mainframe',ax,ay,1080,_mfY,ch.color,'v'));
  }
  // межканальные линки (xlink_XY) — живые по трафику from->to.
  // N<=5: все пары. N>5: соседние + через-один (иначе при 10 каналах 45 линий - каша).
  const ids=CH.map(c=>c.id);
  const XPAIRS=[];
  for(let i=0;i<ids.length;i++){
    for(let j=i+1;j<ids.length;j++){
      const dist=j-i;
      if(ids.length<=5 || dist===1 || dist===2){
        const depth=250+dist*25;
        XPAIRS.push([ids[i], ids[j], depth]);
      }
    }
  }
  for(const pr of XPAIRS){
    const p=pr[0], q=pr[1], depth=pr[2];
    const c1=CH.find(c=>c.id===p), c2=CH.find(c=>c.id===q);
    if(!c1||!c2) continue;
    const _c1=(c1.bw||300)/2, _c2=(c2.bw||300)/2;
    const _y1=(c1.ay!=null?c1.ay:200)+50;
    const _y2=(c2.ay!=null?c2.ay:200)+50;
    const d='M'+(c1.x+_c1)+','+_y1+' L'+(c1.x+_c1)+','+depth
           +' L'+(c2.x+_c2)+','+depth+' L'+(c2.x+_c2)+','+_y2;
    gl.appendChild(svgEl('path',{id:'link_xlink_'+p+q,d:d,
      class:'mnemo-link link-idle',stroke:c1.color,
      'stroke-dasharray':'4 3','fill':'none'}));
  }
  // mainframe -> council уже внутри
  for(const ch of CH){ mnSvg.appendChild(chanBox(ch)); mnSvg.appendChild(agentBox(ch)); }
  for(const r of MN.resources) mnSvg.appendChild(resBox(r));
  mnSvg.appendChild(mainframeBox());
}
function nodeState(nodeId,state){
  const el=document.getElementById(nodeId);
  if(!el) return;
  el.classList.remove('node-active','node-idle','node-error','node-off');
  el.classList.add('node-'+state);
}
function linkState(linkId,ageSec,color){
  const el=document.getElementById('link_'+linkId);
  if(!el) return;
  el.classList.remove('link-active','link-fading','link-idle');
  if(color) el.setAttribute('stroke',color);
  if(ageSec==null){ el.classList.add('link-idle'); return; }
  if(ageSec<2) el.classList.add('link-active');
  else if(ageSec<6) el.classList.add('link-fading');
  else el.classList.add('link-idle');
}
function gateBlink(chId,on){
  const el=document.getElementById('gate_'+chId);
  if(!el) return;
  if(on) el.classList.add('gate-blink'); else el.classList.remove('gate-blink');
}
function led(id,color,on){
  const el=document.getElementById('led_'+id);
  if(!el) return;
  el.setAttribute('fill', on?color:'#333');
}

// прогресс 20 сегментов (0-999 -> 0-100%)
function buildProgress(pct){
  let html='<div class="seg-bar">';
  for(let i=0;i<20;i++){
    const segPct=(i+1)*5;
    let cls='seg';
    if(pct>=segPct) cls+= pct>=85?' seg-red':(pct>=50?' seg-yellow':' seg-green');
    html+='<div class="'+cls+'"></div>';
  }
  html+='</div>';
  return html;
}
let _aliveState = {};

function aliveBtnHtml(chId){
  const st = _aliveState[chId] || 'grey';
  return '<button class="alive-btn" id="aliveBtn_'+chId+'" data-ch="'+chId+'" title="Проверить живость канала">ALIVE?</button>';
}
function paintAliveBtns(){
  for(const ch of MN.channels){
    const b = document.getElementById('aliveBtn_'+ch.id);
    if(!b) continue;
    const st = _aliveState[ch.id] || 'grey';
    b.classList.remove('grey','yellow','green');
    b.classList.add(st);
  }
}
async function sendAlive(chId){
  _aliveState[chId] = 'yellow';
  paintAliveBtns();
  try{ await fetch('/api/alive', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ch: chId})}); }catch(e){}
  // таймаут 45с -> серый
  setTimeout(()=>{ if(_aliveState[chId]==='yellow'){ _aliveState[chId]='grey'; paintAliveBtns(); } }, 45000);
}
async function pollHealth(){
  try{
    const r = await fetch('/api/health', {cache:'no-store'});
    if(!r.ok) return;
    const d = await r.json();
    const mx = d.matrix || {};
    for(const ch of MN.channels){
      const row = mx[ch.id] || {};
      if(row.alive_button){ _aliveState[ch.id] = row.alive_button; }
    }
    paintAliveBtns();
  }catch(e){}
}
window.__sendAlive = sendAlive;

function lastIdNum(id){
  // последние 3-4 цифры id -> позиция в серии (0-999...)
  if(!id) return null;
  const m=String(id).match(/(\d{4})$/);
  return m?parseInt(m[1],10):null;
}
function blinkClass(n){
  if(n==null) return '';
  if(n>=950) return 'blink05';
  if(n>=900) return 'blink1';
  if(n>=850) return 'blink2';
  return '';
}
function ctlVal(ch, kind, c){
  // 1. реальные params из /api/status (приоритет)
  try{
    const p = c && c.svc_params && c.svc_params[kind];
    if(p){
      if(kind==='watchdog' && p.interval!=null) return String(p.interval);
      if(kind==='recovery' && p.cooldown!=null) return String(p.cooldown);
    }
  }catch(e){}
  // 2. localStorage (ввод оператора)
  try{ const v=localStorage.getItem('ctl_'+kind+'_'+ch); if(v!=null) return v; }catch(e){}
  // 3. дефолт
  return kind==='watchdog' ? '10' : '300';
}
function renderMonitor(st){
  if(!monList) return;
  // focus-save: не терять ввод оператора при 3-сек refresh
  const _ae=document.activeElement;
  const _fid=(_ae && _ae.id && /^clim_/.test(_ae.id))?_ae.id:null;
  const _fval=_fid?_ae.value:null;
  monList.innerHTML='';
  // динамическая сетка от числа каналов N (1-10)
  const chans = (st.channels && Object.keys(st.channels).length) ? Object.keys(st.channels) : MN.channels.map(c=>c.id);
  const N = chans.length;
  const cols = N <= 5 ? 1 : 2;
  const rows = N <= 5 ? Math.max(3, N) : Math.ceil(N/2);
  monList.style.display='grid';
  monList.style.gridTemplateColumns='repeat('+cols+', 1fr)';
  monList.style.gridTemplateRows='repeat('+rows+', minmax(0, 1fr))';
  monList.style.gap='6px';
  monList.style.flex='1';
  monList.style.minHeight='0';
  for(const cid of chans){
    const ch = MN.channels.find(x=>x.id===cid) || {id:cid, name:cid, color:'#888'};
    const c=(st.channels&&st.channels[ch.id])||{};
    const isErr=(c.agent_ping===false);
    const lid=c.lastId||'';
    const num=lastIdNum(lid);
    const bcls=blinkClass(num);
    const card=document.createElement('div');
    card.className='mon-card'+(isErr?' error':'');
    card.style.minHeight='0';
    card.style.overflow='hidden';
    const wdOn = c.svc_watchdog===true;
    const rcOn = c.svc_recovery===true;
    card.innerHTML=
      '<div class="mon-head"><span class="nm" style="color:'+ch.color+'">'+ch.id+' — '+ch.name+'</span>'+
      (bcls?'<span class="mon-lamp '+bcls+'" style="background:#ff3b3b"></span>':'')+'</div>'+
      '<div class="mon-row big"><span>lastId</span><span>'+(lid||'—')+'</span></div>'+
      '<div class="mon-row"><span>позиция</span><span>'+(num!=null?num+' / 999':'—')+'</span></div>'+
      '<div class="mon-row"><span>ping</span><span>'+(c.agent_ping===true?'OK':'DEAD')+'</span></div>'+
      '<div class="mon-ctl"><button class="ctl-tg'+(wdOn?' on':'')+'" id="ctg_wd_'+ch.id+'" data-ch="'+ch.id+'" data-k="watchdog">ALIVE '+(wdOn?'ON':'OFF')+'</button></div>'+
      '<div class="mon-ctl"><button class="ctl-tg'+(rcOn?' on':'')+'" id="ctg_rc_'+ch.id+'" data-ch="'+ch.id+'" data-k="recovery">REC '+(rcOn?'ON':'OFF')+'</button>'+
      '<input class="ctl-lim" id="clim_rc_'+ch.id+'" type="number" min="1" value="'+ctlVal(ch.id,'recovery',c)+'"'+(rcOn?' disabled':'')+'></div>';
    monList.appendChild(card);
  }
  // вернуть фокус и значение, если оператор печатал
  if(_fid){ const _el=document.getElementById(_fid); if(_el){ _el.value=_fval; _el.focus(); } }
}
async function pollStatus(){
  try{
    const r=await fetch('/api/status',{cache:'no-store'});
    if(!r.ok) return;
    const st=await r.json();
    lastStatus=st;
    const t=now();
    for(const ch of MN.channels){
      const c=(st.channels&&st.channels[ch.id])||{};
      let state='off';
      if(c.agent_ping===false) state='error';
      else if(c.last_activity_ts && t-c.last_activity_ts<5) state='active';
      else if(c.agent_ping===true) state='idle';
      nodeState('node_chan_'+ch.id,state);
      nodeState('node_agent_'+ch.id,state);
      led('chan_'+ch.id, ch.color, c.agent_ping===true);
    }
    for(const r of MN.resources){
      const res=(st.resources&&st.resources[r.id])||{};
      let state='off';
      if(res.last_access_ts && t-res.last_access_ts<5) state='active';
      else if(res.last_access_ts) state='idle';
      nodeState('node_res_'+r.id,state);
    }
    nodeState('node_mainframe','active');
    const links=(st.links||{});
    for(const ch of MN.channels){
      for(const tgt of ['agent','rag','sandbox','doh','mainframe']){
        const lid=(tgt==='agent')?('chan'+ch.id+'_agent'):('agent'+ch.id+'_'+tgt);
        const L=links[lid]; const age=L&&L.last_ts?(t-L.last_ts):null;
        linkState(lid,age,ch.color);
      }
      // гейт мигает при активной передаче chanX_agent
      const La=links['chan'+ch.id+'_agent'];
      gateBlink(ch.id, La&&La.last_ts&&(t-La.last_ts)<2);
    }
    // межканальные линки: живой трафик from->to (обе стороны)
    const cby={}; for(const c of MN.channels) cby[c.id]=c;
    for(const pr of [['A','B'],['B','C'],['C','D'],['A','C'],['B','D'],['A','D']]){
      const cp=cby[pr[0]], cq=cby[pr[1]];
      const L1=links['xlink_'+pr[0]+pr[1]], L2=links['xlink_'+pr[1]+pr[0]];
      let ts=0;
      if(L1&&L1.last_ts) ts=Math.max(ts,L1.last_ts);
      if(L2&&L2.last_ts) ts=Math.max(ts,L2.last_ts);
      const age=ts?(t-ts):null;
      linkState('xlink_'+pr[0]+pr[1], age, cp?cp.color:'#888');
    }
    renderMonitor(st);
    checkRiskAlarm(st);
  }catch(e){}
}
document.addEventListener('click', (e)=>{
  const b = e.target.closest && e.target.closest('.alive-btn');
  if(b){ sendAlive(b.dataset.ch); }
});

function injectCtlCss(){
  if(document.getElementById('chanctl-css')) return;
  const st=document.createElement('style'); st.id='chanctl-css';
  st.textContent='.chanctl{font:11px system-ui;color:#cfe;padding:2px}'
    +'.ctl-row{display:flex;align-items:center;gap:4px;margin:3px 0;justify-content:flex-end}'
    +'.ctl-tg{background:#1a1d22;border:1px solid #2a2f36;color:#bbc;border-radius:3px;'
    +'padding:2px 8px;font-size:10px;cursor:pointer;min-width:58px}'
    +'.ctl-tg.on{background:#0e1a13;border-color:#2e6b4f;color:#7fe0a0}'
    +'.ctl-lim{width:52px;background:#161a1f;border:1px solid #2a2f36;color:#eef;'
    +'border-radius:3px;padding:1px 4px;font-size:10px}'
    +'.ctl-lim:disabled{opacity:.45;cursor:not-allowed}'
    +'.ctl-u{color:#678}'
    +'.mon-row.big span:last-child{font-size:14px;color:#cfe;font-weight:600}'
    +'.mon-lamp.blink2{animation:monblink 2s steps(1) infinite}'
    +'.mon-lamp.blink1{animation:monblink 1s steps(1) infinite}'
    +'.mon-lamp.blink05{animation:monblink 0.5s steps(1) infinite}'
    +'@keyframes monblink{0%,50%{opacity:1}50.01%,100%{opacity:.15}}';
  document.head.appendChild(st);
}
function setChanCtl(ch, kind, on, lim){
  const tg=document.getElementById('ctg_'+(kind==='watchdog'?'wd_':'rc_')+ch);
  const li=document.getElementById('clim_'+(kind==='watchdog'?'wd_':'rc_')+ch);
  if(tg){ tg.classList.toggle('on',on); tg.textContent=(kind==='watchdog'?'WD ':'REC ')+(on?'ON':'OFF'); }
  if(li){ if(lim!=null) li.value=lim; li.disabled=on; }
}
async function toggleChanCtl(ch, kind){
  const tg=document.getElementById('ctg_'+(kind==='watchdog'?'wd_':'rc_')+ch);
  const li=document.getElementById('clim_'+(kind==='watchdog'?'wd_':'rc_')+ch);
  const on=tg && tg.classList.contains('on');
  const body={channel:ch, kind:kind, action:on?'stop':'start'};
  if(!on){
    if(kind==='watchdog'){ body.interval=300; body.threshold=3; }
    else { const v=parseInt(li&&li.value)||300; try{ localStorage.setItem('ctl_recovery_'+ch, String(v)); }catch(e){} body.cooldown=v; }
  }
  try{ await fetch('/api/svc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); }catch(e){}
  pollStatus();
}
document.addEventListener('click',(e)=>{
  const b=e.target.closest && e.target.closest('.ctl-tg');
  if(b){ toggleChanCtl(b.dataset.ch, b.dataset.k); }
});
function demoChannels(){
  // ?n=N -> N синтетических каналов для проверки раскладки 1-10
  const m = (location.search + location.hash).match(/[?#&]n=(\d+)/);
  if(!m) return null;
  const N = Math.max(1, Math.min(10, parseInt(m[1],10)));
  const names=['АРКАДИЙ','БОРИС','СЕМЁН','ДИМОН','ЕГОР','ЖЕНЯ','ЗАХАР','ИГОРЬ','КИРИЛЛ','ЛЕОНИД'];
  const cols=['#00ff66','#33d6ff','#c573ff','#ffb000','#ff6b6b','#4ecdc4','#f7b731','#a55eea','#26de81','#fc5c65'];
  const out=[];
  for(let i=0;i<N;i++){
    const id=String.fromCharCode(65+i);
    out.push({id:id, name:names[i]||('АГЕНТ '+(i+1)), color:cols[i]||'#888'});
  }
  return out;
}

function initMnemo(){
  injectCtlCss();
  const _demo = demoChannels();
  if(_demo){ MN.channels = _demo; }
  monList=document.getElementById('monList');
  buildMnemo();
  pollStatus();
  setInterval(pollStatus,3000);
  pollHealth();
  setInterval(pollHealth,5000);
}
window.addEventListener('DOMContentLoaded',()=>{ setTimeout(initMnemo,100); });
let _lastAlarm=0;
function checkRiskAlarm(st){
  const t=Date.now();
  if(t-_lastAlarm<30000) return;
  for(const ch of MN.channels){
    const c=(st.channels&&st.channels[ch.id])||{};
    if(c.id_pct>=85){ _lastAlarm=t; try{ new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=").play(); }catch(e){} return; }
  }
}