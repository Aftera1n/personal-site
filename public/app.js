const cfg=window.SITE_CONFIG||{};
const avatar=document.querySelector("#avatar");
if(cfg.avatarUrl) avatar.src=cfg.avatarUrl;

// Inject small mobile menu styles so we don't need to modify the large stylesheet
(function(){
  const css = `
.menu-toggle{
  position:absolute;
  right:12px;
  top:calc(50% + env(safe-area-inset-top)/2);
  transform:translateY(-50%);
  background:transparent;
  border:0;
  color:var(--text);
  font-size:20px;
  padding:8px;
  border-radius:8px;
  z-index:40;
  cursor:pointer;
}

.sidebar.open nav{
  max-height:70px;
  opacity:1;
  pointer-events:auto;
  padding:5px 0 2px;
}

@media(min-width:801px){
  .menu-toggle{display:none}
  .sidebar nav{display:grid; max-height:none; opacity:1; pointer-events:auto; padding:0}
}
`;
  const s = document.createElement('style');
  s.appendChild(document.createTextNode(css));
  document.head.appendChild(s);
})();

const navs=document.querySelectorAll(".nav-item");
const pages=document.querySelectorAll(".page");
function showPage(id){
  navs.forEach(n=>n.classList.toggle("active",n.dataset.page===id));
  pages.forEach(p=>p.classList.toggle("active",p.id===id));
  history.replaceState(null,"","#"+id);
}

// Sidebar and menu button handling for touch devices
const sidebar = document.querySelector('.sidebar');
const menuBtn = document.querySelector('.menu-toggle');

if(menuBtn && sidebar){
  // Use pointerdown for reliable touch/mouse handling
  menuBtn.addEventListener('pointerdown', e=>{
    e.preventDefault();
    const isOpen = sidebar.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(!!isOpen));
  });
}

navs.forEach(n=>n.addEventListener("click",()=>{
  showPage(n.dataset.page);
  if(window.innerWidth<=800 && sidebar){
    sidebar.classList.remove('open');
    if(menuBtn) menuBtn.setAttribute('aria-expanded','false');
  }
}));

const initial=location.hash.slice(1);
if(initial && document.getElementById(initial)) showPage(initial);

const timeline=document.querySelector("#timeline");
const moments=[...(cfg.moments||[])].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
if(!moments.length){
  timeline.innerHTML='<div class="glass mini-card"><h3>还没有动态</h3><p>在 config.js 的 moments 中添加你的第一条记录。</p></div>';
}else{
  timeline.innerHTML=moments.map(m=>`
    <article class="moment">
      <div class="moment-date">${escapeHtml(m.date||"")}</div>
      <div class="moment-card glass">
        ${m.image?`<img class="moment-img" loading="lazy" src="${escapeAttr(m.image)}" alt="${escapeAttr(m.title||"照片")}">`:""}
        <div class="moment-body"><h3 class="moment-title">${escapeHtml(m.title||"未命名")}</h3><p class="moment-desc">${escapeHtml(m.description||"")}</p></div>
      </div>
    </article>`).join("");
}

const s=cfg.status||{};
document.querySelector("#status-title").textContent=s.title||"";
document.querySelector("#status-detail").textContent=s.detail||"";
document.querySelector("#status-time").textContent=s.updatedAt?`LAST UPDATED · ${s.updatedAt}`:"";

const form=document.querySelector("#letter-form");
const result=document.querySelector("#form-result");
form.addEventListener("submit",async e=>{
  e.preventDefault();
  if(document.querySelector("#website").value) return;
  const message=document.querySelector("#message").value.trim();
  const replyTo=document.querySelector("#replyTo").value.trim();
  if(!message) return;
  result.textContent="正在发送……";
  try{
    const r=await fetch(cfg.letterApi||"/api/letter",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({message,replyTo})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.error||"发送失败");
    result.textContent="已送达。谢谢你留下这封信。";
    form.reset();
  }catch(err){result.textContent=err.message||"发送失败，请稍后再试。"}
});
function escapeHtml(v){return String(v).replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
function escapeAttr(v){return escapeHtml(v)}

// render profile / about / socials from SITE_CONFIG
const siteCfg = window.SITE_CONFIG || {};
if(siteCfg.profile){
  const p = siteCfg.profile;
  const pa = document.getElementById('profile-avatar');
  if(pa) pa.src = p.avatarUrl || siteCfg.avatarUrl || '/assets/avatar-placeholder.svg';
  const pn = document.getElementById('profile-name');
  if(pn) pn.textContent = p.name || '';
  const pt = document.getElementById('profile-title');
  if(pt) pt.textContent = p.title || '';
  const pb = document.getElementById('profile-bio');
  if(pb) pb.textContent = p.bio || '';
}
if(siteCfg.about){
  const aboutEl = document.getElementById('about-text');
  if(aboutEl) aboutEl.textContent = siteCfg.about;
}
const socialsWrap = document.getElementById('social-links');
if(socialsWrap && Array.isArray(siteCfg.socials)){
  socialsWrap.innerHTML = siteCfg.socials.map(s => {
    const name = escapeHtml(s.name || s.url);
    const href = escapeAttr(s.url || '#');
    return `<a class="social-link" href="${href}" target="_blank" rel="noopener noreferrer">${name}</a>`;
  }).join('');
}
