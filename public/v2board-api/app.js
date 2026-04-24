const state = { manifest:null, routeData:new Map(), rows:[] };

const MODULE_CN={guest:'访客',passport:'认证',user:'用户',staff:'员工',client:'客户端',admin:'管理后台','node-backend':'节点后端交互',article:'文章公告',server:'节点接口',root:'根模块'};
const AUTH_CN={'client/server token':'客户端/节点令牌','guest':'游客','user(auth_data)':'用户(auth_data)','admin(auth_data)':'管理员(auth_data)','staff(auth_data)':'员工(auth_data)','client订阅鉴权':'客户端订阅鉴权','客户端鉴权':'客户端鉴权'};
const SKIP_CN={'SKIPPED_DYNAMIC_SERVER_ROUTE':'跳过：动态节点路由','SKIPPED_SIDE_EFFECT':'跳过：存在副作用风险','SKIPPED_EXTERNAL':'跳过：依赖外部服务','SKIPPED_NEEDS_PARAMS':'跳过：缺少必要参数','SKIPPED_GENERIC':'跳过：通用跳过'};

function labelModule(m){return MODULE_CN[m]||m;}
function labelAuth(r){const a=r.auth; return AUTH_CN[a]||a||'unknown';}
function esc(s){return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function badgeFor(r){
  if(r.sample && r.sample.status==null) return '<span class="badge">未采样</span>';
  const s=r.sample && r.sample.status;
  if(s>=200&&s<300)return `<span class="badge b200">HTTP ${s}</span>`;
  if(s>=400&&s<500)return `<span class="badge b4xx">HTTP ${s}</span>`;
  if(s>=500)return `<span class="badge b5xx">HTTP ${s}</span>`;
  return '<span class="badge">未采样</span>';
}
function authBadge(r){ return `<span class="badge">鉴权: ${esc(labelAuth(r))}</span>`; }
function methodLabel(m){ const map={GET:'读取',POST:'提交',PUT:'更新',PATCH:'部分更新',DELETE:'删除',ANY:'任意方法'}; return map[m]||m; }

function renderParams(r){
  const ps=r.params||[];
  if(!ps.length) return '<div class="empty">无请求参数</div>';
  const looksStructured=ps.every(x=>x && typeof x==='object');
  if(!looksStructured) return `<pre>${esc(JSON.stringify(ps,null,2))}</pre>`;
  return `<table class="kv-table"><thead><tr><th>字段</th><th>类型</th><th>必填</th><th>说明</th></tr></thead><tbody>${ps.map(p=>`<tr><th>${esc(p.name||p.field||'')}</th><td>${esc(p.type||'')}</td><td>${esc(p.required===true?'是':p.required===false?'否':'')}</td><td>${esc(p.desc||p.description||'')}</td></tr>`).join('')}</tbody></table>`;
}

function renderResponse(r){
  const resp=r.response||{};
  if(!Object.keys(resp).length) return '<div class="empty">暂无返回结构</div>';
  const meta=[];
  if(resp.type) meta.push(`<div><b>类型：</b>${esc(resp.type)}</div>`);
  if(resp.keys&&resp.keys.length) meta.push(`<div><b>顶层键：</b>${esc(resp.keys.join(', '))}</div>`);
  const fields=resp.fields||[];
  const table=fields.length ? `<table class="kv-table"><thead><tr><th>字段</th><th>类型</th><th>说明</th></tr></thead><tbody>${fields.map(d=>`<tr><th>${esc(d.field||d.name||'')}</th><td>${esc(d.type||'')}</td><td>${esc(d.desc||d.description||'')}</td></tr>`).join('')}</tbody></table>` : '';
  return `${meta.join('')}${table || '<div class="empty">暂无字段级说明</div>'}`;
}

function renderNotes(r){
  const notes=r.notes||[];
  if(!notes.length) return '<div class="empty">无</div>';
  return `<ul>${notes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
}

function renderExample(val, empty){
  if(!val) return `<div class="empty">${esc(empty)}</div>`;
  return `<pre>${esc(JSON.stringify(val,null,2))}</pre>`;
}

function renderSample(r){
  if(!r.sample || (r.sample.status==null && !r.sample.body)) return '<div class="empty">未采样</div>';
  return `<pre>${esc(`HTTP ${r.sample.status}\n${r.sample.body||''}`)}</pre>`;
}

async function loadManifest(){
  const res=await fetch('./data/manifest.json');
  state.manifest=await res.json();
  document.getElementById('totalCount').textContent=`${state.manifest.total} 条接口`;
  const scope=document.getElementById('scope');
  for(const m of state.manifest.modules){
    const o=document.createElement('option');
    o.value=m;
    o.textContent=`${labelModule(m)} / ${m} (${state.manifest.counts[m]})`;
    scope.appendChild(o);
  }
}

async function loadRoute(file){
  if(state.routeData.has(file)) return state.routeData.get(file);
  const res=await fetch(`./data/${file}`);
  const data=await res.json();
  state.routeData.set(file, data);
  return data;
}

async function ensureRows(){
  const selected=document.getElementById('scope').value;
  let rows=state.manifest.routes||[];
  if(selected) rows=rows.filter(r=>r.module===selected);
  state.rows=rows;
}

function renderStats(rows){
  const stats=document.getElementById('stats');
  const total=rows.length;
  stats.innerHTML=`<span class="stat">当前结果：${total} 条</span>`;
}

async function render(){
  await ensureRows();
  const q=document.getElementById('q').value.trim().toLowerCase();
  const method=document.getElementById('method').value;
  let rows=state.rows.filter(r=>{
    if(method&&r.method!==method)return false;
    if(!q)return true;
    const blob=[r.path,r.action,r.file,r.description||'',r.module||''].join(' ').toLowerCase();
    return blob.includes(q);
  });
  renderStats(rows);
  const grouped=new Map();
  for(const r of rows){const g=r.module||'other';if(!grouped.has(g))grouped.set(g,[]);grouped.get(g).push(r);}
  const app=document.getElementById('app');app.innerHTML='';
  for(const [group,items] of [...grouped.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){
    const wrap=document.createElement('section');wrap.className='group';
    wrap.innerHTML=`<div class="group-head"><div class="group-title">${esc(labelModule(group))} / ${esc(group)}</div><div class="group-meta">${items.length} 条</div></div>`;
    for(const meta of items.sort((a,b)=>(a.path+a.method).localeCompare(b.path+b.method))){
      const r=await loadRoute(meta.file);
      const row=document.createElement('div');row.className='row';
      row.innerHTML=`<div class="top"><div class="method ${esc(r.method)}" title="${esc(methodLabel(r.method))}">${esc(r.method)}</div><div style="flex:1"><div class="path">${esc(r.path)}</div><div class="action">${esc(meta.action||'')}</div><div class="badges">${authBadge(r)} ${badgeFor(r)}</div><div class="small" style="margin-top:6px">${esc(r.description || '')}</div><details open><summary>请求参数</summary>${renderParams(r)}</details><details open><summary>返回结构</summary>${renderResponse(r)}</details><details><summary>关键说明</summary>${renderNotes(r)}</details><details><summary>示例请求</summary>${renderExample(r.examples && r.examples.request, '暂无示例请求')}</details><details><summary>示例返回</summary>${renderExample(r.examples && r.examples.response, '暂无示例返回')}</details><details><summary>真实返回示例</summary>${renderSample(r)}</details></div></div>`;
      wrap.appendChild(row);
    }
    app.appendChild(wrap);
  }
}

async function boot(){
  await loadManifest();
  ['q','scope','method'].forEach(id=>document.getElementById(id).addEventListener(id==='q'?'input':'change',render));
  await render();
}
boot();
