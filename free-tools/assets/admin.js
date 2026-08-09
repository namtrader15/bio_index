let tools = [];
let selectedIndex = -1;

const $ = id => document.getElementById(id);
const esc = (s='') => String(s)
  .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replaceAll('"','&quot;').replaceAll("'","&#039;");

function slugify(s=''){
  return s.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function toast(msg){
  $('toast').textContent=msg;
  $('toast').classList.add('show');
  setTimeout(()=>$('toast').classList.remove('show'),1500);
}

async function loadFromServer(){
  const res=await fetch('./tools.json',{cache:'no-store'});
  if(!res.ok) throw new Error('Cannot load tools.json');
  tools=await res.json();
  selectedIndex = tools.length ? 0 : -1;
  renderAll();
  if(selectedIndex>=0) fillEditor(selectedIndex); else clearEditor();
  toast('Loaded tools.json');
}

function renderAll(){
  tools.sort((a,b)=>(a.order ?? 999)-(b.order ?? 999));
  const list=$('toolList');

  if(!tools.length){
    list.innerHTML='<div class="empty">Chưa có tool.</div>';
  }else{
    list.innerHTML=tools.map((t,i)=>`
      <div class="tool-row">
        <div>
          <div class="status ${t.published?'on':'off'}">${t.published?'PUBLISHED':'DRAFT'}</div>
          <h3>${esc(t.name||'(Unnamed tool)')}</h3>
          <div class="sub">${esc(t.id||'no-id')} · v${esc(t.version||'—')} · order ${esc(t.order ?? '')}</div>
        </div>
        <div class="row-actions">
          <button class="button ghost small" onclick="editTool(${i})">Edit</button>
          <button class="button ${t.published?'danger':'secondary'} small" onclick="togglePublish(${i})">${t.published?'Unpublish':'Publish'}</button>
        </div>
      </div>
    `).join('');
  }

  $('jsonPreview').textContent=JSON.stringify(tools,null,2);
}

function clearEditor(){
  selectedIndex=-1;
  $('editorTitle').textContent='New tool';
  $('editorHint').textContent='Create a new library item.';
  ['f_id','f_name','f_short','f_desc','f_version','f_category','f_tags','f_file','f_code','f_changelog'].forEach(id=>$(id).value='');
  $('f_order').value=(tools.length+1);
  $('f_updated').value=new Date().toISOString().slice(0,10);
  $('f_published').checked=true;
  $('f_featured').checked=false;
}

function fillEditor(i){
  selectedIndex=i;
  const t=tools[i];
  $('editorTitle').textContent=t.name || 'Edit tool';
  $('editorHint').textContent=`Editing ${t.id||'unnamed'}`;
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
    updated:$('f_updated').value,
    order:Number($('f_order').value || 999),
    code_preview:$('f_code').value,
    changelog:$('f_changelog').value.split('\n').map(x=>x.trim()).filter(Boolean)
  };
}

window.editTool = i => fillEditor(i);

window.togglePublish = i => {
  tools[i].published=!tools[i].published;
  renderAll();
  if(selectedIndex===i) fillEditor(i);
};

$('newBtn').onclick=()=>clearEditor();

$('saveBtn').onclick=()=>{
  const t=readForm();
  if(!t.name || !t.id){
    toast('Name / ID cannot be empty');
    return;
  }
  const duplicateIndex=tools.findIndex((x,i)=>x.id===t.id && i!==selectedIndex);
  if(duplicateIndex>=0){
    toast('ID already exists');
    return;
  }
  if(selectedIndex>=0){
    tools[selectedIndex]=t;
  }else{
    tools.push(t);
    selectedIndex=tools.length-1;
  }
  renderAll();
  fillEditor(tools.findIndex(x=>x.id===t.id));
  toast('Saved in browser');
};

$('duplicateBtn').onclick=()=>{
  const t=readForm();
  t.id = `${t.id||'tool'}-copy`;
  t.name = `${t.name||'Tool'} Copy`;
  t.order = tools.length+1;
  tools.push(t);
  renderAll();
  fillEditor(tools.findIndex(x=>x.id===t.id));
  toast('Duplicated');
};

$('deleteBtn').onclick=()=>{
  if(selectedIndex<0) return;
  const name=tools[selectedIndex]?.name||'this tool';
  if(!confirm(`Delete ${name}?`)) return;
  tools.splice(selectedIndex,1);
  selectedIndex=tools.length?0:-1;
  renderAll();
  if(selectedIndex>=0) fillEditor(selectedIndex); else clearEditor();
  toast('Deleted in browser');
};

$('exportBtn').onclick=()=>{
  const blob=new Blob([JSON.stringify(tools,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='tools.json';a.click();
  URL.revokeObjectURL(url);
  toast('Exported tools.json');
};

$('importBtn').onclick=()=>$('importFile').click();

$('importFile').onchange=async e=>{
  const file=e.target.files[0];
  if(!file) return;
  try{
    const parsed=JSON.parse(await file.text());
    if(!Array.isArray(parsed)) throw new Error('Root JSON must be an array');
    tools=parsed;
    selectedIndex=tools.length?0:-1;
    renderAll();
    if(selectedIndex>=0) fillEditor(selectedIndex); else clearEditor();
    toast('Imported JSON');
  }catch(err){
    alert('Invalid JSON: '+err.message);
  }
};

$('resetBtn').onclick=()=>loadFromServer().catch(e=>alert(e.message));

loadFromServer().catch(()=>{
  tools=[];
  renderAll();
  clearEditor();
  toast('Use Import JSON to start');
});
