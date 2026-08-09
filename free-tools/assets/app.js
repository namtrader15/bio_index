let allTools = [];

const esc = (s='') => String(s)
  .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replaceAll('"','&quot;').replaceAll("'","&#039;");

async function loadTools(){
  const res = await fetch('./tools.json', {cache:'no-store'});
  if(!res.ok) throw new Error('Không tải được tools.json');
  allTools = (await res.json())
    .filter(t => t.published)
    .sort((a,b)=>(a.order ?? 999)-(b.order ?? 999));
  buildCategories();
  render();
}

function buildCategories(){
  const select = document.getElementById('categoryFilter');
  const cats = [...new Set(allTools.map(t=>t.category).filter(Boolean))].sort();
  cats.forEach(c=>{
    const o=document.createElement('option');
    o.value=c;o.textContent=c;select.appendChild(o);
  });
}

function render(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const cat = document.getElementById('categoryFilter').value;

  const filtered = allTools.filter(t=>{
    const hay = [t.name,t.short_description,t.description,t.category,...(t.tags||[])].join(' ').toLowerCase();
    return (!q || hay.includes(q)) && (!cat || t.category===cat);
  });

  document.getElementById('toolCount').textContent = `${filtered.length} công cụ`;
  const grid=document.getElementById('toolGrid');

  if(!filtered.length){
    grid.innerHTML='<div class="empty">Không tìm thấy công cụ phù hợp.</div>';
    return;
  }

  grid.innerHTML=filtered.map(t=>`
    <article class="card">
      <div class="badges">
        <span class="badge free">FREE</span>
        ${t.featured?'<span class="badge featured">NỔI BẬT</span>':''}
        <span class="badge">${esc(t.category||'Tool')}</span>
      </div>
      <h3>${esc(t.name)}</h3>
      <p>${esc(t.short_description||'')}</p>
      <div class="tags">${(t.tags||[]).map(x=>`<span>#${esc(x)}</span>`).join('')}</div>
      <div class="meta">
        <span>v${esc(t.version||'—')}</span>
        <span>${esc(t.updated||'')}</span>
      </div>
      <div class="card-actions">
        <a class="button ghost" href="./tool.html?id=${encodeURIComponent(t.id)}">Xem chi tiết</a>
        <a class="button" href="${esc(t.file)}" download>Tải xuống</a>
      </div>
    </article>
  `).join('');
}

document.getElementById('searchInput').addEventListener('input', render);
document.getElementById('categoryFilter').addEventListener('change', render);
document.getElementById('clearBtn').addEventListener('click',()=>{
  document.getElementById('searchInput').value='';
  document.getElementById('categoryFilter').value='';
  render();
});

loadTools().catch(err=>{
  document.getElementById('toolGrid').innerHTML=
    `<div class="empty">Không tải được dữ liệu thư viện.<br><small>${esc(err.message)}</small></div>`;
  document.getElementById('toolCount').textContent='Không thể tải dữ liệu';
});
