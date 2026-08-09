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
      root.innerHTML='<div class="empty">Công cụ không tồn tại hoặc chưa được công khai.</div>';
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
          <small>PHIÊN BẢN HIỆN TẠI</small>
          <strong>v${esc(t.version||'—')}</strong>
          <small>Cập nhật ${esc(t.updated||'')}</small>
          <a class="button" style="margin-top:10px" href="${esc(t.file)}" download>Tải source</a>
        </div>
      </section>

      <section class="detail-grid">
        <div class="panel">
          <div class="panel-title">Mã nguồn xem trước</div>
          <pre class="code"><code>${esc(t.code_preview||'# Chưa có mã nguồn xem trước')}</code></pre>
        </div>
        <div class="panel">
          <div class="panel-title">Lịch sử cập nhật · v${esc(t.version||'—')}</div>
          <ul class="change-list">
            ${(t.changelog||[]).map(x=>`<li>${esc(x)}</li>`).join('') || '<li>Chưa có thông tin cập nhật.</li>'}
          </ul>
        </div>
      </section>
    `;
  }catch(e){
    root.innerHTML=`<div class="empty">Không tải được dữ liệu công cụ.<br><small>${esc(e.message)}</small></div>`;
  }
})();
