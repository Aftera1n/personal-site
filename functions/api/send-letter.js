/**
 * POST /api/send-letter
 *
 * 接收匿名信表单，通过 Resend API 把内容发送到站长邮箱。
 *
 * 需要在 Cloudflare Pages 项目的 Settings → Environment variables 里配置：
 *   RESEND_API_KEY   Resend 的 API Key（https://resend.com）
 *   TO_EMAIL         你自己的收件邮箱
 *   FROM_EMAIL       发信地址（可选，默认用 Resend 的测试域名；
 *                     正式使用建议在 Resend 里验证自己的域名后再改这里）
 *
 * 没有 Resend 账号也可以换成其他邮件 API（比如 Mailchannels、SendGrid），
 * 只需要改下面 sendViaResend 这部分逻辑，其余表单校验逻辑不用动。
 */

const MAX_MESSAGE_LENGTH = 4000;
const MAX_SUBJECT_LENGTH = 80;

// 简单的内存级限流（每个 Worker 实例独立计数，不是全局精确限流，
// 只用来挡掉短时间内的暴力刷接口，正式反刷建议接入 Cloudflare Turnstile）
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  record.count += 1;
  return record.count > RATE_LIMIT_MAX;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (isRateLimited(ip)) {
      return json({ error: "太快了，等一下再寄。" }, 429);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "请求格式不对。" }, 400);
    }

    const { subject = "", message = "", website = "" } = body || {};

    // honeypot：机器人常常会填这个隐藏字段
    if (website) {
      return json({ ok: true }); // 假装成功，不告诉机器人被拦截了
    }

    if (typeof message !== "string" || !message.trim()) {
      return json({ error: "信件内容不能为空。" }, 400);
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return json({ error: "信件太长了。" }, 400);
    }
    if (subject && subject.length > MAX_SUBJECT_LENGTH) {
      return json({ error: "主题太长了。" }, 400);
    }

    if (!env.RESEND_API_KEY || !env.TO_EMAIL) {
      return json({ error: "服务尚未配置完成，请联系站长。" }, 500);
    }

    const fromEmail = env.FROM_EMAIL || "Afterain 匿名信 <onboarding@resend.dev>";
    const safeSubject = subject.trim() ? subject.trim() : "一封新的匿名信";

    const html = `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
        <p style="color:#888; font-size:13px; letter-spacing:0.05em; text-transform:uppercase;">Afterain · 匿名信</p>
        <h2 style="margin: 6px 0 20px;">${escapeHtml(safeSubject)}</h2>
        <div style="white-space: pre-wrap; line-height: 1.8; font-size: 15px; border-left: 3px solid #9FD8D3; padding-left: 16px;">${escapeHtml(message)}</div>
        <p style="margin-top: 32px; color:#aaa; font-size:12px;">发送时间：${new Date().toISOString()}</p>
      </div>
    `;

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [env.TO_EMAIL],
        subject: `[匿名信] ${safeSubject}`,
        html,
      }),
    });

    if (!resendResp.ok) {
      const errText = await resendResp.text();
      console.error("Resend error:", errText);
      return json({ error: "发送失败，请稍后再试。" }, 502);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("send-letter error:", err);
    return json({ error: "服务器出错了。" }, 500);
  }
}

export async function onRequestGet() {
  return json({ error: "请使用 POST 提交。" }, 405);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
