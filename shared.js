// ═══════════════════════════════════════════════════
// SBR System ERP — Shared Core
// ═══════════════════════════════════════════════════

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwF01VM_NXs7WiBznpfkZoTDUzwQihm9gZQH7qkavY1SPPA9CykIrXO-7ZyR68uQZ1_/exec';
const APP_VER = 'v2026-2.0';
const USERS = { bilal: 'SBR@Admin2026', sana: 'SBR@Sana2026' };

// ── AUTH ──
function checkAuth(){ const u=sessionStorage.getItem('sbr_user'); if(!u){window.location.href='index.html';return null;} return u; }
function getCurrentUser(){ return sessionStorage.getItem('sbr_user'); }
function doLogin(){
  const u=document.getElementById('username').value.trim().toLowerCase();
  const p=document.getElementById('password').value;
  if(USERS[u]&&USERS[u]===p){sessionStorage.setItem('sbr_user',u);window.location.href='dashboard.html';}
  else{const e=document.getElementById('login-error');if(e){e.textContent='Invalid username or password.';e.style.display='block';}}
}
function doLogout(){ sessionStorage.removeItem('sbr_user'); window.location.href='index.html'; }

// ── DATA STORE ──
const SBR = {
  clients:[], invoices:[], receipts:[], deliveryNotes:[], projects:[],
  quotations:[], amcQuotations:[], amcContracts:[], productDB:[],
  services:[], suppliers:[], staff:[], appointments:[], purchases:[],
  inventory:[], cats:{}, settings:{},
  qtIdCtr:127, quotGroupCtr:32, pIdCtr:39, iIdCtr:110, recIdCtr:94,
  dIdCtr:90, projIdCtr:32, svcIdCtr:37, hrIdCtr:4, supplierIdCtr:6, apptIdCtr:2,
  companyInfo:{ name:'SBR System Technical Services L.L.C', addr:'Dubai, UAE',
    phone:'+971 4 XXX XXXX', email:'info@sbrsystem.ae', trn:'', bank:'Emirates NBD',
    acname:'SBR System Technical Services L.L.C', acnum:'', iban:'', swift:'' },
  // Letterhead stored on cloud so it works on any browser/device
  letterhead:{ img:'', hdr:'', ftr:'', mode:'default' }
};

// ── SIDEBAR ──
function buildSidebar(active){
  const nav = [
    {section:'Main'},
    {id:'dashboard',icon:'📊',label:'Dashboard',href:'dashboard.html'},
    {id:'appointments',icon:'📅',label:'Appointments',href:'appointments.html'},
    {id:'clients',icon:'👥',label:'Clients',href:'clients.html'},
    {section:'Sales'},
    {id:'quotations',icon:'📄',label:'Quotations',href:'quotations.html'},
    {id:'amc',icon:'🔄',label:'AMC Quotation',href:'amc.html'},
    {id:'invoices',icon:'🧾',label:'Invoices',href:'invoices.html'},
    {id:'receipts',icon:'💰',label:'Receipts',href:'receipts.html'},
    {id:'delivery',icon:'📦',label:'Delivery Notes',href:'delivery.html'},
    {id:'purchases',icon:'🛒',label:'Purchase Orders',href:'purchases.html'},
    {section:'Operations'},
    {id:'projects',icon:'🏗️',label:'Projects',href:'projects.html'},
    {id:'suppliers',icon:'🏢',label:'Suppliers',href:'suppliers.html'},
    {id:'products',icon:'📦',label:'Products',href:'products.html'},
    {id:'services',icon:'🔧',label:'Services',href:'services.html'},
    {id:'inventory',icon:'📋',label:'Inventory',href:'inventory.html'},
    {section:'Company'},
    {id:'hr',icon:'👤',label:'HR & Staff',href:'hr.html'},
    {id:'amc-contracts',icon:'🔁',label:'AMC Contracts',href:'amc-contracts.html'},
    {id:'settings',icon:'⚙️',label:'Settings',href:'settings.html'},
  ];

  const user = getCurrentUser()||'bilal';
  const logo = document.getElementById('sidebar-logo');
  if(logo) logo.innerHTML = `<img src="logo.png" alt="SBR System" onerror="this.style.display='none'">
    <div class="sb-logo-text"><div class="sb-logo-name">SBR System</div><div class="sb-logo-sub">ERP Platform · Dubai</div></div>`;

  const navEl = document.getElementById('sidebar-nav');
  if(!navEl) return;
  navEl.innerHTML = nav.map(item => {
    if(item.section) return `<div class="sb-section">${item.section}</div>`;
    const isActive = item.id === active;
    return `<a class="sb-item${isActive?' active':''}" href="${item.href}">
      <span class="ic">${item.icon}</span>${item.label}
    </a>`;
  }).join('');

  initSidebarCollapse();
  const userEl = document.getElementById('sidebar-user');
  if(userEl) userEl.innerHTML = `
    <div class="sb-user-row">
      <div class="sb-av">${user.substring(0,2).toUpperCase()}</div>
      <div><div class="sb-name">${user==='bilal'?'Bilal Ashraf':'Sana'}</div><div class="sb-role">Admin</div></div>
    </div>
    <button class="sb-signout" onclick="doLogout()">🚪 Sign Out</button>`;
}

// ── TOPBAR ──
function buildTopbar(title){
  const el = document.getElementById('topbar-title');
  if(el) el.textContent = title;
  const date = document.getElementById('topbar-date');
  if(date) date.textContent = new Date().toLocaleDateString('en-AE',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  const ver = document.getElementById('topbar-ver');
  if(ver) ver.textContent = APP_VER;
}

// ── MOBILE SIDEBAR TOGGLE ──
function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sb-overlay').classList.toggle('open');
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('open');
}

// ── SYNC STATUS ──
function setSyncStatus(state, msg){
  const dot = document.getElementById('sync-dot');
  const txt = document.getElementById('sync-txt');
  if(dot){ dot.className='sync-dot'; if(state==='loading')dot.classList.add('loading'); if(state==='error')dot.classList.add('error'); }
  if(txt) txt.textContent = msg || (state==='loading'?'Syncing...':state==='error'?'Sync error':'✅ Synced');
}

// ── LOAD DATA (JSONP) ──
async function loadData(){
  setSyncStatus('loading');
  return new Promise((resolve)=>{
    const cb = '_sbrLoad_'+Date.now();
    const script = document.createElement('script');
    let done = false;
    window[cb] = function(json){
      done=true; delete window[cb]; script.remove();
      if(json&&json.status==='ok'&&json.data){
        const d = typeof json.data==='string'?JSON.parse(json.data):json.data;
        applyData(d); setSyncStatus('ok'); resolve(true);
      } else { setSyncStatus('error'); resolve(false); }
    };
    script.src = SHEET_URL+'?action=load&callback='+cb+'&t='+Date.now();
    script.onerror = ()=>{ if(done)return; done=true; delete window[cb]; script.remove(); setSyncStatus('error'); resolve(false); };
    setTimeout(()=>{ if(done)return; done=true; delete window[cb]; script.remove(); setSyncStatus('error'); resolve(false); }, 25000);
    document.head.appendChild(script);
  });
}

// ── APPLY DATA ──
function applyData(d){
  if(!d) return;
  const keys = ['clients','invoices','receipts','deliveryNotes','projects','quotations',
    'amcQuotations','amcContracts','productDB','services','suppliers','staff',
    'appointments','purchases','inventory','cats','settings','companyInfo','letterhead'];
  keys.forEach(k=>{ if(d[k]!==undefined) SBR[k]=d[k]; });
  const ctrs = ['qtIdCtr','quotGroupCtr','pIdCtr','iIdCtr','recIdCtr','dIdCtr',
    'projIdCtr','svcIdCtr','hrIdCtr','supplierIdCtr','apptIdCtr'];
  ctrs.forEach(k=>{ if(d[k]!==undefined) SBR[k]=d[k]; });
  // Backward compat: savedQuotations -> quotations
  if(d.savedQuotations&&!d.quotations) SBR.quotations=d.savedQuotations;
}

// ── COLLECT DATA ──
function collectData(){
  return { ...SBR };
}

// ── SAVE DATA ──
let _saveTimer = null;
function saveAllData(){
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(()=>{
    const data = collectData();
    fetch(SHEET_URL,{ method:'POST', mode:'no-cors', body:JSON.stringify({action:'save',data:JSON.stringify(data)}) })
    .then(()=>setSyncStatus('ok','✅ Saved'))
    .catch(()=>setSyncStatus('error'));
  }, 800);
}

// ── HELPERS ──
function escH(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmt(n,d){ return Number(n||0).toLocaleString('en-AE',{minimumFractionDigits:d||2,maximumFractionDigits:d||2}); }
function fmtNum(n,d){ return fmt(n,d); }
function fmtDate(d){ if(!d)return'—'; try{return new Date(d).toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'});}catch(e){return d;} }
function td(){ return new Date().toISOString().split('T')[0]; }
function gv(id){ const el=document.getElementById(id); return el?el.value:''; }
function sv(id,v){ const el=document.getElementById(id); if(el)el.value=(v==null?'':v); }
function showToast(msg, type='success'){
  let t=document.getElementById('_toast');
  if(!t){t=document.createElement('div');t.id='_toast';t.style.cssText='position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';document.body.appendChild(t);}
  const el=document.createElement('div');
  el.style.cssText=`background:${type==='error'?'#dc2626':'#0F4C81'};color:#fff;padding:10px 18px;border-radius:10px;font-size:12px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,.2);animation:slideIn .2s ease`;
  el.textContent=msg;
  const style=document.createElement('style');
  style.textContent='@keyframes slideIn{from{transform:translateX(120%)}to{transform:translateX(0)}}';
  document.head.appendChild(style);
  t.appendChild(el);
  setTimeout(()=>el.remove(),3000);
}
function badgeHTML(status){
  const map={'Paid':'green','Approved':'green','Active':'green','Completed':'green',
    'Not Paid':'amber','Pending':'amber','In Progress':'blue','Under Discussion':'amber',
    'Draft':'blue','Estimate':'gray','Sent':'blue',
    'Rejected':'red','Cancelled':'red','Overdue':'red','Expired':'red','On Hold':'amber'};
  const cls = map[status]||'gray';
  return `<span class="badge badge-${cls}">${escH(status||'—')}</span>`;
}
function navTo(page){ window.location.href = page+'.html'; }


// ── SIDEBAR COLLAPSE (desktop) ──
function initSidebarCollapse(){
  if(window.innerWidth <= 900) return;
  // Add toggle button
  if(document.getElementById('sb-toggle-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'sb-toggle-btn';
  btn.className = 'sidebar-toggle';
  btn.innerHTML = '<span id="sb-toggle-icon">◀</span>';
  btn.onclick = toggleDesktopSidebar;
  btn.title = 'Toggle Sidebar';
  document.body.appendChild(btn);
  // Restore state
  if(localStorage.getItem('sb-collapsed')==='1') _collapseSidebar(true);
}

function toggleDesktopSidebar(){
  const collapsed = document.body.classList.contains('sb-collapsed');
  _collapseSidebar(!collapsed);
}

function _collapseSidebar(collapse){
  if(collapse){
    document.body.classList.add('sb-collapsed');
    const icon = document.getElementById('sb-toggle-icon');
    if(icon) icon.textContent = '▶';
    localStorage.setItem('sb-collapsed','1');
  } else {
    document.body.classList.remove('sb-collapsed');
    const icon = document.getElementById('sb-toggle-icon');
    if(icon) icon.textContent = '◀';
    localStorage.setItem('sb-collapsed','0');
  }
}

// ── PAGE INIT ──
async function initPage(pageId, title, onDataLoaded){
  if(!checkAuth()) return;
  buildTopbar(title);
  buildSidebar(pageId);
  await loadData();
  if(typeof onDataLoaded === 'function') onDataLoaded();
}
