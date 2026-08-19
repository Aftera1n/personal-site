// Application script for static pages (index.html, moments.html, letter.html, status.html)
const cfg = window.SITE_CONFIG || {};

function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
function escapeAttr(v){return escapeHtml(v)}

// Set avatar for common header
(function setAvatar(){
  const avatar = document.querySelector('#avatar');
  if(avatar && cfg.avatarUrl) avatar.src = cfg.avatarUrl;
})();

// Inject small mobile menu styles for touch devices
(function(){
  const css = `
.menu-toggle{position:absolute;right:12px;top:calc(50% + env(safe-area-inset-top)/2);transform:translateY(-50%);background:transparent;border:0;color:var(--text);font-size:20px;padding:8px;border-radius:8px;z-index:40;cursor:pointer}
.sidebar.open nav{max-height:70px;opacity:1;pointer-events:auto;padding:5px 0 2px}
@media(min-width:801px){.menu-toggle{display:none}.sidebar nav{display:grid;max-height:none;opacity:1;pointer-events:auto;padding:0}}
`;
  const s = document.createElement('style');
  s.appendChild(document.createTextNode(css));
  document.head.appendChild(s);
})();

// Toggle mobile menu
(function menuToggle(){
  const sidebar = document.querySelector('.sidebar');
  const menuBtn = document.querySelector('.menu-toggle');
  if(menuBtn && sidebar){
    menuBtn.addEventListener('pointerdown', e=>{
      e.preventDefault();
      const isOpen = sidebar.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(!!isOpen));
    });
  }
})();

// Mark active nav link based on current pathname
(function markActiveNav(){
  const links = document.querySelectorAll('.nav-item');
  const path = location.pathname.replace(/\/index\.html$/, '/');
  links.forEach(a=>{
    try{
      const href = new URL(a.href).pathname;
      let active = false;
      if(path === '/' && (href === '/' || href === '/index.html')) active = true;
      else if(href === path) active = true;
      a.classList.toggle('active', active);
    }catch(e){/* ignore */}
  });
})();

// Render helpers for profile/about/socials
function renderProfile(){
  if(!cfg.profile) return;
  const p = cfg.profile;
  const pa = document.getElementById('profile-avatar'); if(pa) pa.src = p.avatarUrl || cfg.avatarUrl || pa.src;
  const pn = document.getElementById('profile-name'); if(pn) pn.textContent = p.name || pn.textContent;
  const pt = document.getElementById('profile-title'); if(pt) pt.textContent = p.title || pt.textContent;
  const pb = document.getElementById('profile-bio'); if(pb) pb.textContent = p.bio || pb.textContent;
}
function renderAbout(){
  if(!cfg.about) return;
  const aboutEl = document.getElementById('about-text'); if(aboutEl) aboutEl.textContent = cfg.about;
}
function getSocialIcon(name){
  const n = (name||'').toLowerCase();
  if(n.includes('github')){
    return `
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.09 3.29 9.4 7.86 10.93.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.35-1.3-1.71-1.3-1.71-1.06-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.73 1.27 3.4.97.11-.75.41-1.27.75-1.56-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.2-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.75.81 1.2 1.84 1.2 3.1 0 4.43-2.7 5.41-5.27 5.69.42.36.79 1.08.79 2.18 0 1.57-.01 2.83-.01 3.22 0 .31.21.68.8.56A11.52 11.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z"/>
      </svg>
    `;
  }
  return '';
}
function renderSocials(){
  const socialsWrap = document.getElementById('social-links');
  if(socialsWrap && Array.isArray(cfg.socials)){
    socialsWrap.innerHTML = cfg.socials.map(s=>{
      const name = escapeHtml(s.name || s.url);
      const href = escapeAttr(s.url || '#');
      const icon = getSocialIcon(s.name || '');
      return `<a class="social-link" href="${href}" target="_blank" rel="noopener noreferrer">${icon}<span class="social-name">${name}</span></a>`;
    }).join('');
  }
}

// Moments page rendering
function renderMoments(){
  const timeline = document.querySelector('#timeline');
  const moments = (cfg.moments||[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  if(!timeline) return;
  if(!moments.length){
    timeline.innerHTML = '<div class="glass mini-card"><h3>还没有动态</h3><p>在 config.js 的 moments 中添加你的第一条记录。</p></div>';
    return;
  }
  timeline.innerHTML = moments.map(m=>`
    <article class="moment">
      <div class="moment-date">${escapeHtml(m.date||"")}</div>
      <div class="moment-card glass">
        ${m.image?`<img class="moment-img" loading="lazy" src="${escapeAttr(m.image)}" alt="${escapeAttr(m.title||"照片")}">`:''}
        <div class="moment-body"><h3 class="moment-title">${escapeHtml(m.title||"未命名")}</h3><p class="moment-desc">${escapeHtml(m.description||"")}</p></div>
      </div>
    </article>`).join('');
}

// Status page rendering
function renderStatus(){
  const s = cfg.status || {};
  const titleEl = document.querySelector('#status-title'); if(titleEl) titleEl.textContent = s.title || titleEl.textContent || '';
  const detailEl = document.querySelector('#status-detail'); if(detailEl) detailEl.textContent = s.detail || detailEl.textContent || '';
  const timeEl = document.querySelector('#status-time'); if(timeEl) timeEl.textContent = s.updatedAt?`LAST UPDATED · ${s.updatedAt}`:'';
}

// Letter page: form handling
function setupLetterForm(){
  const form = document.querySelector('#letter-form');
  const result = document.querySelector('#form-result');
  if(!form) return;
  form.addEventListener('submit', async e=>{
    e.preventDefault();
    if(document.querySelector('#website') && document.querySelector('#website').value) return;
    const message = document.querySelector('#message').value.trim();
    const replyTo = document.querySelector('#replyTo').value.trim();
    if(!message) return;
    if(result) result.textContent = '正在发送……';
    try{
      const r = await fetch(cfg.letterApi||'/api/letter', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({message,replyTo})});
      const data = await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(data.error||'发送失败');
      if(result) result.textContent = '已送达。谢谢你留下这封信。';
      form.reset();
    }catch(err){ if(result) result.textContent = err.message || '发送失败，请稍后再试.' }
  });
}

// Run page-specific render based on pathname
(function routeAndRender(){
  renderProfile(); renderAbout(); renderSocials();
  const path = location.pathname.replace(/\/index\.html$/,'/');
  if(path === '/' || path.endsWith('/index.html')){
    // index/home
  } else if(path.endsWith('/moments.html') || path.endsWith('/moments/') || path.endsWith('/moments')){
    renderMoments();
  } else if(path.endsWith('/letter.html') || path.endsWith('/letter/') || path.endsWith('/letter')){
    setupLetterForm();
  } else if(path.endsWith('/status.html') || path.endsWith('/status/') || path.endsWith('/status')){
    renderStatus();
  }
})();
