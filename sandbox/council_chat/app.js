// Council Chat — клиент (v2: табы + мнемосхема + логи).

const API = '';
let feed, input, btnSend, roster, chanList;
let currentTo = 'ALL';
let lastTs = 0;
let msgCount = 0;
let sessionStart = Date.now();

const NAMES = {A:'Аркадий', B:'Борис', C:'Семён', D:'Дима', ALL:'ВСЕ', operator:'Оператор'};
const CHAN_INFO = {
  A: {name:'Аркадий', tag:'ведущий',  color:'#00ff66', port:9222},
  B: {name:'Борис',   tag:'помощник', color:'#33d6ff', port:9223},
  C: {name:'Семён',   tag:'хранитель',color:'#c573ff', port:9224},
  D: {name:'Дима',    tag:'тестер',   color:'#ffb000', port:9225},
};
const ROSTER_ORDER = ['A','B','C','D'];
let lastSeen = {A:0, B:0, C:0, D:0};

function $(id){ return document.getElementById(id); }
function pad(n){ return String(n).padStart(2,'0'); }
function clock(){ const d=new Date(); $('clock').textContent = pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds()); }
function nowTime(){ const d=new Date(); return pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds()); }
function fmtSession(){
  const s=Math.floor((Date.now()-sessionStart)/1000); const m=Math.floor(s/60); const h=Math.floor(m/60);
  return (h>0?h+'ч ':'')+(m%60)+'м '+(s%60)+'с';
}

function renderChannels(){
  if(!chanList) return;
  chanList.innerHTML='';
  for (const k of ROSTER_ORDER){
    const info=CHAN_INFO[k]; const last=lastSeen[k];
    const online=(Date.now()/1000 - last) < 300;
    const el=document.createElement('div');
    el.className='chan'+(online?'':' off');
    const ago=last?Math.floor(Date.now()/1000-last)+'с':'—';
    el.innerHTML='<span class="led"></span><span class="nm" style="color:'+info.color+'">'+info.name+'</span><span class="v">'+ago+'</span>';
    chanList.appendChild(el);
  }
}

function renderRoster(){
  if(!roster) return;
  roster.innerHTML='';
  const all=document.createElement('div');
  all.className='person all'+(currentTo==='ALL'?' active':'');
  all.dataset.to='ALL';
  all.innerHTML='<span class="name">ВСЕ</span><span class="tag">broadcast</span><span class="led"></span>';
  all.addEventListener('click',()=>setTarget('ALL'));
  roster.appendChild(all);
  for (const k of ROSTER_ORDER){
    const info=CHAN_INFO[k];
    const el=document.createElement('div');
    el.className='person from-'+k+(currentTo===k?' active':'');
    el.dataset.to=k;
    el.innerHTML='<span class="name" style="color:'+info.color+'">'+info.name+'</span><span class="tag">'+info.tag+'</span><span class="led"></span>';
    el.addEventListener('click',()=>setTarget(k));
    roster.appendChild(el);
  }
  const op=document.createElement('div');
  op.className='person op';
  op.innerHTML='<span class="name">Оператор</span><span class="tag">я</span><span class="led"></span>';
  roster.appendChild(op);
}

function renderMsg(m){
  const div=document.createElement('div');
  div.className='msg from-'+m.from;
  const who=NAMES[m.from]||m.from;
  const to=m.to==='ALL'?'':' → '+(NAMES[m.to]||m.to);
  div.innerHTML='<span class="time">['+(m.time||nowTime())+']</span><span class="who">'+who+':</span><span class="to">'+to+'</span><span class="text"></span>';
  div.querySelector('.text').textContent=m.text;
  feed.appendChild(div);
}

function updateMetrics(){
  if($('mSession')) $('mSession').textContent=fmtSession();
  if($('mMsgs')) $('mMsgs').textContent=msgCount;
  if($('mTo')) $('mTo').textContent=NAMES[currentTo]||currentTo;
}

async function poll(){
  if(!feed) return;
  try{
    const r=await fetch(API+'/api/messages');
    if(!r.ok) return;
    const msgs=await r.json();
    let added=false;
    for (const m of msgs){
      if (m.ts>lastTs){ renderMsg(m); lastTs=m.ts; msgCount++; added=true; if (m.from in lastSeen) lastSeen[m.from]=m.ts; }
    }
    if (added){ feed.scrollTop=feed.scrollHeight; updateMetrics(); }
    renderChannels();
  }catch(e){}
}

async function send(){
  const text=input.value.trim(); if(!text) return;
  input.value=''; input.style.height='';
  try{
    await fetch(API+'/api/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({from:'operator',to:currentTo,text})});
    poll();
  }catch(e){}
}

function setTarget(to){
  currentTo=to;
  for (const el of document.querySelectorAll('.person')) el.classList.toggle('active', el.dataset.to===to);
  if($('targetBadge')) $('targetBadge').textContent='→ '+(NAMES[to]||to);
  updateMetrics();
}
function autosize(){ input.style.height='auto'; input.style.height=Math.min(140,input.scrollHeight)+'px'; }

async function openChat(){ try{ await fetch(API+'/api/open',{method:'POST'}); }catch(e){} }
async function closeChat(){ try{ await fetch(API+'/api/close',{method:'POST'}); }catch(e){} setTimeout(()=>window.close(),300); }
async function pultPause(){ try{ await fetch(API+'/api/pause',{method:'POST'}); }catch(e){} }
async function pultResume(){ try{ await fetch(API+'/api/resume',{method:'POST'}); }catch(e){} }
function clearView(){ feed.innerHTML=''; }

/* ===== VOICE INPUT (Web Speech API, ru-RU) ===== */
let recog = null, recogOn = false;
function initVoice(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const b = document.getElementById('btnVoice');
  if(!b) return;
  if(!SR){ b.title = 'Голосовой ввод не поддерживается'; b.classList.add('disabled'); return; }
  recog = new SR();
  recog.lang = 'ru-RU'; recog.continuous = true; recog.interimResults = true;
  recog.onresult = (e) => {
    let fin = '', inter = '';
    for(let i = e.resultIndex; i < e.results.length; i++){
      const t = e.results[i][0].transcript;
      if(e.results[i].isFinal) fin += t; else inter += t;
    }
    if(fin){ input.value = (input.value ? input.value + ' ' : '') + fin.trim(); autosize(); }
    const st = document.getElementById('voiceHint');
    if(st) st.textContent = inter ? ('... ' + inter) : '';
  };
  recog.onend = () => { if(recogOn){ try{ recog.start(); }catch(e){} } };
  recog.onerror = (e) => { const st = document.getElementById('voiceHint'); if(st) st.textContent = 'ошибка: ' + (e.error||'?'); };
  b.addEventListener('click', toggleVoice);
}
function toggleVoice(){
  const b = document.getElementById('btnVoice');
  if(!recog) return;
  if(recogOn){ recogOn = false; try{ recog.stop(); }catch(e){} b.classList.remove('on'); }
  else { recogOn = true; try{ recog.start(); }catch(e){} b.classList.add('on'); }
}

/* ===== MEETING ===== */
let meetingOn = false;
function renderMeeting(){
  const b = document.getElementById('btnMeeting');
  if(!b) return;
  if(meetingOn){ b.classList.add('on'); b.textContent = 'СОВЕЩАНИЕ [ИДЁТ]'; }
  else { b.classList.remove('on'); b.textContent = 'СОВЕЩАНИЕ'; }
}
async function toggleMeeting(){
  meetingOn = !meetingOn;
  renderMeeting();
  try{
    await fetch('/api/meeting', {method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({on: meetingOn})});
  }catch(e){}
}
async function loadMeeting(){
  try{
    const r = await fetch('/api/meeting', {cache:'no-store'});
    if(r.ok){ const j = await r.json(); meetingOn = !!j.on; renderMeeting(); }
  }catch(e){}
}

/* ===== TABS ===== */
function initTabs(){
  const tabs=document.querySelectorAll('.tab');
  tabs.forEach(t=>{
    t.addEventListener('click',()=>{
      tabs.forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
      const scr=$('screen-'+t.dataset.tab);
      if(scr) scr.classList.add('active');
      if(t.dataset.tab==='mnemo' && window.__mnemoRefresh) window.__mnemoRefresh();
      if(t.dataset.tab==='logs' && window.__logsRefresh) window.__logsRefresh();
    });
  });
}

/* ===== LOGS ===== */
const LOG_TABS=[
  {id:'chat', name:'чат', url:'/api/logs?name=chat'},
  {id:'agent', name:'агент', url:'/api/logs?name=agent'},
  {id:'svc', name:'сервисы', url:'/api/logs?name=svc'},
];
let curLog='chat';
async function loadLog(name){
  curLog=name;
  const body=$('logBody'); if(!body) return;
  const t=LOG_TABS.find(x=>x.id===name);
  try{
    const r=await fetch(t.url+'&_='+Date.now(),{cache:'no-store'});
    if(!r.ok){ body.textContent='[лог недоступен: '+r.status+']'; return; }
    const j=await r.json();
    if(!j.content){ body.textContent = (name==='server') ? '(лог пуст: server.py буферизует stdout, правка зона 4A)' : '(пусто)'; } else { body.textContent=j.content; }
    body.scrollTop=body.scrollHeight;
  }catch(e){ body.textContent='[лог недоступен]'; }
}
function initLogs(){
  const wrap=$('logTabs'); if(!wrap) return;
  LOG_TABS.forEach(t=>{
    const b=document.createElement('button');
    b.className='log-tab'+(t.id==='chat'?' active':'');
    b.textContent=t.name;
    b.addEventListener('click',()=>{
      document.querySelectorAll('.log-tab').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      loadLog(t.id);
    });
    wrap.appendChild(b);
  });
  loadLog('chat');
  window.__logsRefresh=()=>loadLog(curLog);
  setInterval(()=>{ if(document.getElementById("screen-logs").classList.contains("active")) loadLog(curLog); },5000);
}

window.addEventListener('DOMContentLoaded', ()=>{
  feed=$('feed'); input=$('input'); btnSend=$('btnSend'); roster=$('roster'); chanList=$('chanList');

  const bc=document.createElement('button');
  bc.id='btnClose'; bc.textContent='ЗАКРЫТЬ';
  bc.addEventListener('click',closeChat);
  document.body.appendChild(bc);

  initVoice();
  const bm = $('btnMeeting');
  if(bm) bm.addEventListener('click', toggleMeeting);
  loadMeeting();
  initTabs();
  renderRoster();
  setTarget('ALL');
  updateMetrics();

  if(btnSend) btnSend.addEventListener('click',send);
  if(input){
    input.addEventListener('input',autosize);
    input.addEventListener('keydown',(e)=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } });
  }
  if($('btnPauseAll')) $('btnPauseAll').addEventListener('click',pultPause);
  if($('btnResumeAll')) $('btnResumeAll').addEventListener('click',pultResume);
  if($('btnClearView')) $('btnClearView').addEventListener('click',clearView);

  initLogs();
  // openChat() убран: авто-broadcast [COUNCIL] на каждое открытие панели - шум
  // (оператор 05.10). Открытие/закрытие чата - только по кнопке.
  clock(); setInterval(clock,1000); setInterval(updateMetrics,1000);
  poll(); setInterval(poll,1500);
});