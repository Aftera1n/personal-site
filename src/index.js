const ALLOWED_ORIGIN = "*"; // 部署后建议改成你的域名，例如 "https://afterain.example.com"

function json(data, status=200){
  return new Response(JSON.stringify(data), {
    status,
    headers: {"content-type":"application/json; charset=utf-8","access-control-allow-origin":ALLOWED_ORIGIN}
  });
}
function escapeHtml(s=""){
  return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

export default {
  async fetch(request, env){
    const url=new URL(request.url);
    if(url.pathname==="/api/letter"){
      if(request.method==="OPTIONS") return new Response(null,{headers:{
        "access-control-allow-origin":ALLOWED_ORIGIN,
        "access-control-allow-methods":"POST, OPTIONS",
        "access-control-allow-headers":"content-type"
      }});
      if(request.method!=="POST") return json({error:"Method Not Allowed"},405);
      try{
        const body=await request.json();
        const message=String(body.message||"").trim();
        const replyTo=String(body.replyTo||"").trim();
        if(!message || message.length>2000) return json({error:"留言不能为空，且不能超过 2000 字。"},400);
        if(replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) return json({error:"邮箱格式不正确。"},400);

        const to=env.TO_EMAIL;
        const from=env.FROM_EMAIL;
        if(!to || !from) return json({error:"邮件服务尚未配置。"},500);

        // Cloudflare Email Service Email Sending binding
        await env.EMAIL.send({
          to,
          from,
          replyTo: replyTo || undefined,
          subject:"Afterain · 新的匿名信",
          text:`你收到了一封新的匿名信：\n\n${message}\n\n${replyTo ? `回复邮箱：${replyTo}` : "对方没有留下回复邮箱。"}`,
          html:`<div style="font-family:system-ui;line-height:1.8"><h2>新的匿名信</h2><p>${escapeHtml(message).replace(/\n/g,"<br>")}</p><hr><p style="color:#777">${replyTo?`回复邮箱：${escapeHtml(replyTo)}`:"对方没有留下回复邮箱。"}</p></div>`
        });
        return json({ok:true});
      }catch(e){
        console.error(e);
        return json({error:"发送失败，请稍后再试。"},500);
      }
    }
    return env.ASSETS.fetch(request);
  }
};