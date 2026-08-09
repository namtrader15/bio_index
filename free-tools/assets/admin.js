let tools = [];
let selectedIndex = -1;
let adminKey = sessionStorage.getItem('freeToolsAdminKey') || '';

const $ = id => document.getElementById(id);
const API = (window.FREE_TOOLS_ADMIN_API || '').replace(/\/$/, '');
const esc = (s='') => String(s)
  .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replaceAll('"','&quot;').replaceAll("'","&#039;");

function slugify(s=''){
  return s.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function toast(msg, ms=1800){
  $('toast').textContent=msg;
  $('toast').classList.add('show');
  setTimeout(()=>$('toast').classList.remove('show'),ms);
}

function setBusy(busy, text='Đang xử lý...'){
  ['saveBtn','deleteBtn','duplicateBtn','newBtn','reloadBtn','connectBtn'].forEach(id=>{
    const el=$(id); if(el) el.disabled=busy;
  });
  $('syncInfo').textContent = busy ? text : `Đã tải ${tools.length} công cụ từ GitHub.`;
}

async function api(path, options={}){
  if(!API || API.includes('REPLACE-WITH-YOUR-WORKER')){
    throw new Error('Chưa cấu hình URL Cloudflare Worker trong assets/admin-config.js');
  }
  const headers = new Headers(options.headers || {});
  headers.set('X-Admin-Key', adminKey);
  if(options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')){
    headers.set('Content-Type','application/json');
  }
  const res = await fetch(`${API}${path}`, {...options, headers});
  let data = null;
  try { data = await res.json(); } catch { data = {}; }
  if(!res.ok) throw new Error(data.error || `API ${res.status}`);
  return data;
}

async function connect(){
  const value=$('adminKey').value.trim();
  if(value) adminKey=value;
  if(!adminKey){ toast('Nhập mật khẩu quản trị'); return; }
  setBusy(true,'Đang kết nối Worker...');
  try{
    const health=await api('/api/health');
    sessionStorage.setItem('freeToolsAdminKey', adminKey);
    $('apiStatus').textContent=`Đã kết nối · ${health.repo} · branch ${health.branch}`;
    await loadFromGitHub();
    toast('Đã kết nối GitHub');
  }catch(err){
    sessionStorage.removeItem('freeToolsAdminKey');
    $('apiStatus').textContent='Kết nối thất bại.';
    alert(err.message);
  }finally{ setBusy(false); }
}

async function loadFromGitHub(){
  setBusy(true,'Đang tải tools.json từ GitHub...');
  const data=await api('/api/tools');
  tools=Array.isArray(data.tools) ? data.tools : [];
  selectedIndex=tools.length ? 0 : -1;
  renderAll();
  if(selectedIndex>=0) fillEditor(selectedIndex); else clearEditor();
  setBusy(false);
}

async function syncTools(message){
  const payload={tools, message};
  await api('/api/tools',{method:'POST',body:JSON.stringify(payload)});
  $('syncInfo').textContent=`Đã ghi GitHub lúc ${new Date().toLocaleTimeString('vi-VN')}.`;
}

function renderAll(){
  tools.sort((a,b)=>(a.order ?? 999)-(b.order ?? 999));
  const list=$('toolList');
  if(!tools.length){
    list.innerHTML='<div class="empty">Chưa có công cụ.</div>';
    return;
  }
  list.innerHTML=tools.map((t,i)=>`
    <div class="tool-row">
      <div>
        <div class="status ${t.published?'on':'off'}">${t.published?'CÔNG KHAI':'BẢN NHÁP'}</div>
        <h3>${esc(t.name||'(Chưa đặt tên)')}</h3>
        <div class="sub">${esc(t.id||'no-id')} · v${esc(t.version||'—')} · thứ tự ${esc(t.order ?? '')}</div>
      </div>
      <div class="row-actions">
        <button class="button ghost small" type="button" onclick="editTool(${i})">Sửa</button>
        <button class="button ${t.published?'danger':'secondary'} small" type="button" onclick="togglePublish(${i})">${t.published?'Ẩn':'Công khai'}</button>
      </div>
    </div>
  `).join('');
}

function clearEditor(){
  selectedIndex=-1;
  $('editorTitle').textContent='Công cụ mới';
  $('editorHint').textContent='Tạo một công cụ mới trong thư viện.';
  ['f_id','f_name','f_short','f_desc','f_version','f_category','f_tags','f_file','f_code','f_changelog'].forEach(id=>$(id).value='');
  $('f_upload').value='';
  $('f_order').value=tools.length+1;
  $('f_updated').value=new Date().toISOString().slice(0,10);
  $('f_published').checked=true;
  $('f_featured').checked=false;
}

function fillEditor(i){
  selectedIndex=i;
  const t=tools[i];
  $('editorTitle').textContent=t.name || 'Chỉnh sửa công cụ';
  $('editorHint').textContent=`Đang chỉnh sửa: ${t.id||'chưa có ID'}`;
  $('f_id').value=t.id||'';
  $('f_name').value=t.name||'';
  $('f_short').value=t.short_description||'';
  $('f_desc').value=t.description||'';
  $('f_version').value=t.version||'';
  $('f_category').value=t.category||'';
  $('f_tags').value=(t.tags||[]).join(', ');
  $('f_file').value=t.file||'';
  $('f_code').value=t.code_preview||'';
  $('f_changelog').value=(t.changelog||[]).join('\n');
  $('f_order').value=t.order ?? (i+1);
  $('f_updated').value=t.updated||'';
  $('f_published').checked=!!t.published;
  $('f_featured').checked=!!t.featured;
  $('f_upload').value='';
}

function readForm(){
  const name=$('f_name').value.trim();
  const id=slugify($('f_id').value.trim() || name);
  return {
    id,
    name,
    short_description:$('f_short').value.trim(),
    description:$('f_desc').value.trim(),
    version:$('f_version').value.trim(),
    category:$('f_category').value.trim(),
    tags:$('f_tags').value.split(',').map(x=>x.trim()).filter(Boolean),
    file:$('f_file').value.trim(),
    published:$('f_published').checked,
    featured:$('f_featured').checked,
    updated:$('f_updated').value || new Date().toISOString().slice(0,10),
    order:Number($('f_order').value || 999),
    code_preview:$('f_code').value,
    changelog:$('f_changelog').value.split('\n').map(x=>x.trim()).filter(Boolean)
  };
}

async function maybeUpload(t){
  const file=$('f_upload').files[0];
  if(!file) return t;
  if(file.size > 20*1024*1024) throw new Error('File lớn hơn giới hạn 20 MB');
  const fd=new FormData();
  fd.append('toolId',t.id);
  fd.append('version',t.version || 'latest');
  fd.append('file',file,file.name);
  const result=await api('/api/upload',{method:'POST',body:fd});
  t.file=result.publicPath;
  $('f_file').value=t.file;

  if(!t.code_preview && /\.(py|txt|md|mq5)$/i.test(file.name) && file.size < 1024*1024){
    try { t.code_preview=(await file.text()).slice(0,30000); $('f_code').value=t.code_preview; } catch {}
  }
  return t;
}

window.editTool=i=>fillEditor(i);
window.togglePublish=async i=>{
  if(!adminKey){ toast('Chưa kết nối admin API'); return; }
  const old=tools[i].published;
  tools[i].published=!old;
  renderAll();
  setBusy(true,'Đang cập nhật trạng thái trên GitHub...');
  try{
    await syncTools(`${tools[i].published?'Publish':'Unpublish'} free tool: ${tools[i].name}`);
    if(selectedIndex===i) fillEditor(i);
    toast('Đã cập nhật');
  }catch(err){
    tools[i].published=old; renderAll(); alert(err.message);
  }finally{setBusy(false);}
};

$('newBtn').onclick=()=>clearEditor();
$('connectBtn').onclick=()=>connect();
$('reloadBtn').onclick=()=>loadFromGitHub().catch(err=>alert(err.message));

$('saveBtn').onclick=async()=>{
  if(!adminKey){ toast('Chưa kết nối admin API'); return; }
  let t=readForm();
  if(!t.name || !t.id){ toast('Tên công cụ và ID không được để trống'); return; }
  const duplicateIndex=tools.findIndex((x,i)=>x.id===t.id && i!==selectedIndex);
  if(duplicateIndex>=0){ toast('ID này đã tồn tại'); return; }
  setBusy(true,'Đang upload và ghi GitHub...');
  try{
    t=await maybeUpload(t);
    if(selectedIndex>=0) tools[selectedIndex]=t;
    else { tools.push(t); selectedIndex=tools.length-1; }
    renderAll();
    selectedIndex=tools.findIndex(x=>x.id===t.id);
    fillEditor(selectedIndex);
    await syncTools(`Update free tool: ${t.name} v${t.version||'latest'}`);
    toast('Đã lưu lên GitHub');
  }catch(err){ alert(err.message); }
  finally{setBusy(false);}
};

$('duplicateBtn').onclick=()=>{
  const t=readForm();
  t.id=`${t.id||'tool'}-copy`;
  t.name=`${t.name||'Tool'} Copy`;
  t.file='';
  t.order=tools.length+1;
  tools.push(t);
  renderAll();
  fillEditor(tools.findIndex(x=>x.id===t.id));
  toast('Đã nhân bản. Chỉnh lại rồi bấm Lưu & Publish.');
};

$('deleteBtn').onclick=async()=>{
  if(selectedIndex<0) return;
  if(!adminKey){ toast('Chưa kết nối admin API'); return; }
  const removed=tools[selectedIndex];
  if(!confirm(`Xóa ${removed.name}? Công cụ sẽ biến mất khỏi thư viện. File đã upload vẫn được giữ trong repository để tránh xóa nhầm.`)) return;
  tools.splice(selectedIndex,1);
  selectedIndex=tools.length?0:-1;
  renderAll();
  if(selectedIndex>=0) fillEditor(selectedIndex); else clearEditor();
  setBusy(true,'Đang xóa khỏi danh sách trên GitHub...');
  try{
    await syncTools(`Remove free tool: ${removed.name}`);
    toast('Đã xóa khỏi thư viện');
  }catch(err){
    tools.push(removed); renderAll(); alert(err.message);
  }finally{setBusy(false);}
};

$('f_upload').addEventListener('change', async()=>{
  const file=$('f_upload').files[0];
  if(file && !($('f_code').value.trim()) && /\.(py|txt|md|mq5)$/i.test(file.name) && file.size < 1024*1024){
    try{$('f_code').value=(await file.text()).slice(0,30000);}catch{}
  }
});

if(adminKey){
  $('adminKey').value=adminKey;
  connect();
}
