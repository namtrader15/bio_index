const esc = (s='') => String(s)
  .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replaceAll('"','&quot;').replaceAll("'","&#039;");

(async()=>{
  const id = new URLSearchParams(location.search).get('id');
  const root = document.getElementById('detailRoot');

  try{
    const res = await fetch('./tools.json', {cache:'no-store'});
    const tools = await res.json();
    const t = tools.find(x=>x.id===id && x.published);
    if(!t){
      root.innerHTML='<div class="empty">Tool không tồn tại hoặc chưa publish.</div>';
      return;
    }

    document.title = `${t.name} | Nam Nguyen Code Trading`;
    root.innerHTML=`
      <section class="detail-hero">
        <div>
          <div class="kicker">${esc(t.category||'FREE TOOL')}</div>
          <h1>${esc(t.name)}</h1>
          <p>${esc(t.description||t.short_description||'')}</p>
          <div class="tags">${(t.tags||[]).map(x=>`<span>#${esc(x)}</span>`).join('')}</div>
        </div>
        <div class="download-box">
          <small>CURRENT VERSION</small>
          <strong>v${esc(t.version||'—')}</strong>
          <small>Updated ${esc(t.updated||'')}</small>
          <a class="button" style="margin-top:10px" href="${esc(t.file)}" download>Download source</a>
        </div>
      </section>

      <section class="detail-grid">
        <div class="panel">
          <div class="panel-title">Source preview</div>
          <pre class="code"><code>${esc(t.code_preview||'# Source preview not provided')}</code></pre>
        </div>
        <div class="panel">
          <div class="panel-title">Changelog · v${esc(t.version||'—')}</div>
          <ul class="change-list">
            ${(t.changelog||[]).map(x=>`<li>${esc(x)}</li>`).join('') || '<li>No changelog.</li>'}
          </ul>
        </div>
      </section>
    `;
  }catch(e){
    root.innerHTML=`<div class="empty">Không tải được dữ liệu tool.<br><small>${esc(e.message)}</small></div>`;
  }
})();
