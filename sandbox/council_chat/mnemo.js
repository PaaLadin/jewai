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
  const x=ch.x, y=ch.y, w=300, h=250;
  // внешняя рамка канала (толстая, неон)
  g.appendChild(svgEl('rect',{x,y,width:300,height:250,rx:10,fill:'#0a1a0e',stroke:ch.color,'stroke-width':3,filter:'url(#glow)'}));
  g.appendChild(svgTxt(x+150, y+30, 'КАНАЛ '+ch.id+' — '+ch.name));
  // чат (крупный)
  g.appendChild(svgEl('rect',{x:x+20,y:y+46,width:260,height:70,rx:6,fill:'#061206',stroke:ch.color,'stroke-width':1.5}));
  g.appendChild(svgTxt(x+150, y+88, 'МОЗГ / ЧАТ'));
  // гейт на НИЖНЕЙ границе (мигает при передаче)
  g.appendChild(svgEl('rect',{id:'gate_'+ch.id,x:x+40,y:y+220,width:220,height:44,rx:6,fill:'#061206',stroke:ch.color,'stroke-width':2}));
  g.appendChild(svgTxt(x+150, y+248, 'ГЕЙТ', 'mnemo-ts'));
  // LED
  g.appendChild(svgEl('circle',{id:'led_chan_'+ch.id,cx:x+280,cy:y+22,r:7,fill:'#333'}));
  return g;
}
function agentBox(ch){
  const x=ch.x+50, y=330, w=200, h=80;
  const g=svgEl('g',{id:'node_agent_'+ch.id});
  g.appendChild(svgEl('rect',{id:'rect_agent_'+ch.id,x,y,width:w,height:h,rx:8,fill:'#0a1a0e',stroke:ch.color,'stroke-width':2}));
  g.appendChild(svgTxt(x+w/2, y+34, 'PY-АГЕНТ'));
  g.appendChild(svgTxt(x+w/2, y+58, '876'+ch.id.charCodeAt(0)%10,'mnemo-ts'));
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
function buildMnemo(){
  mnSvg=document.getElementById('mnemo');
  if(!mnSvg) return;
  mnSvg.innerHTML='';
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
    gl.appendChild(linkLine('chan'+ch.id+'_agent',ch.x+150,ch.y+250,ch.x+150,330,ch.color,'v'));
  }
  // агент -> ресурсы + mainframe
  for(const ch of CH){
    const ax=ch.x+150, ay=410;
    gl.appendChild(linkLine('agent'+ch.id+'_rag',ax,ay,170,520,ch.color,'v'));
    gl.appendChild(linkLine('agent'+ch.id+'_sandbox',ax,ay,430,520,ch.color,'v'));
    gl.appendChild(linkLine('agent'+ch.id+'_doh',ax,ay,690,520,ch.color,'v'));
    gl.appendChild(linkLine('agent'+ch.id+'_mainframe',ax,ay,1080,490,ch.color,'v'));
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

function renderMonitor(st){
  if(!monList) return;
  monList.innerHTML='';
  for(const ch of MN.channels){
    const c=(st.channels&&st.channels[ch.id])||{};
    const pct=(c.id_pct!=null)?c.id_pct:0;
    const isErr=(c.agent_ping===false);
    const card=document.createElement('div');
    card.className='mon-card'+(isErr?' error':'');
    const riskOn=(pct>=85);
    card.innerHTML=
      '<div class="mon-head"><span class="nm" style="color:'+ch.color+'">'+ch.id+' — '+ch.name+'</span>'+
      (riskOn?'<span class="mon-lamp blink" style="background:#ff3b3b"></span>':'')+'</div>'+
      buildProgress(pct)+
      '<div class="mon-row"><span>lastId</span><span>'+(c.lastId||'—')+'</span></div>'+
      '<div class="mon-row"><span>заполнение</span><span>'+pct+'%</span></div>'+
      '<div class="mon-row"><span>ping</span><span>'+(c.agent_ping===true?'OK':'DEAD')+'</span></div>' + aliveBtnHtml(ch.id);
    monList.appendChild(card);
  }
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
    renderMonitor(st);
    checkRiskAlarm(st);
  }catch(e){}
}
document.addEventListener('click', (e)=>{
  const b = e.target.closest && e.target.closest('.alive-btn');
  if(b){ sendAlive(b.dataset.ch); }
});

function initMnemo(){
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