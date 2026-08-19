const cfg=window.SITE_CONFIG||{};
const avatar=document.querySelector("#avatar");
if(cfg.avatarUrl) avatar.src=cfg.avatarUrl;

const navs=document.querySelectorAll(".nav-item");
const pages=document.querySelectorAll(".page");
function showPage(id){
  navs.forEach(n=>n.classList.toggle("active",n.dataset.page===id));
  pages.forEach(p=>p.classList.toggle("active",p.id===id));
  history.replaceState(null,"","#"+id);
}

// Minimal, safe mobile menu handling (JS-only, no CSS/HTML changes)
const sidebar = document.querySelector('.sidebar');
const brand = document.querySelector('.brand');
const menuToggle = document.querySelector('.menu-toggle');
const _menuTrigger = menuToggle || brand; // prefer explicit toggle button if present
let touchTriggered = false;

if(_menuTrigger && sidebar){
  // touchstart for reliable mobile response
  _menuTrigger.addEventListener('touchstart', (e)=>{
    if(window.innerWidth>800) return;
    if(e.preventDefault) e.preventDefault();
    touchTriggered = true;
    sidebar.classList.toggle('open');
  }, { passive: false });

  // click as fallback
  _menuTrigger.addEventListener('click', ()=>{
    if(window.innerWidth>800) return;
    if(touchTriggered){ touchTriggered = false; return; }
    sidebar.classList.toggle('open');
  });

  // close when tapping outside (mobile only)
  document.addEventListener('click', (e)=>{
    if(window.innerWidth>800) return;
    if(!sidebar.classList.contains('open')) return;
    if(!sidebar.contains(e.target) && e.target !== _menuTrigger){
      sidebar.classList.remove('open');
    }
  });
}

navs.forEach(n=>n.addEventListener("click",()=>{
  showPage(n.dataset.page);
  // On mobile, ensure menu is closed after navigation
  if(window.innerWidth<=800) sidebar?.classList.remove('open');
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
