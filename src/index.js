const ALLOWED_ORIGIN = "*";

// 每个 IP 24 小时最多 3 封
const MAX_LETTERS_PER_DAY = 3;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": ALLOWED_ORIGIN,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

function escapeHtml(s = "") {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c]));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/letter") {

      // CORS
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "access-control-allow-origin": ALLOWED_ORIGIN,
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        });
      }

      if (request.method !== "POST") {
        return json(
          { error: "Method Not Allowed" },
          405
        );
      }

      try {
        const body = await request.json();

        const message = String(body.message || "").trim();
        const replyTo = String(body.replyTo || "").trim();

        // 留言检查
        if (!message || message.length > 2000) {
          return json(
            {
              error: "留言不能为空，且不能超过 2000 字。"
            },
            400
          );
        }

        // 邮箱检查
        if (
          replyTo &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)
        ) {
          return json(
            {
              error: "邮箱格式不正确。"
            },
            400
          );
        }

        // Resend API Key
        if (!env.RESEND_API_KEY) {
          return json(
            {
              error: "邮件服务尚未配置。"
            },
            500
          );
        }

        // ==============================
        // IP 限流
        // ==============================

        const ip =
          request.headers.get("CF-Connecting-IP") ||
          "unknown";

        const key = `letter:${ip}`;

        const stored = await env.LETTER_RATE_LIMIT.get(
          key,
          "json"
        );

        const now = Date.now();

        let count = 0;
        let expiresAt = now + 24 * 60 * 60 * 1000;

        if (stored) {
          count = Number(stored.count || 0);
          expiresAt = Number(
            stored.expiresAt || expiresAt
          );

          // 理论上的过期保护
          if (now >= expiresAt) {
            count = 0;
            expiresAt =
              now + 24 * 60 * 60 * 1000;
          }
        }

        if (count >= MAX_LETTERS_PER_DAY) {
          return json(
            {
              error:
                "今天的匿名信发送次数已用完，请 24 小时后再试。"
            },
            429
          );
        }

        // ==============================
        // 邮件内容
        // ==============================

        const text = `你收到了一封新的匿名信：

${message}

${
  replyTo
    ? `回复邮箱：${replyTo}`
    : "对方没有留下回复邮箱。"
}`;

        const html = `
<div style="
  font-family:system-ui,-apple-system,BlinkMacSystemFont,
  'Segoe UI',sans-serif;
  line-height:1.8;
  max-width:680px;
  margin:auto;
  padding:24px;
">
  <h2>新的匿名信</h2>

  <div style="
    padding:18px;
    border-radius:12px;
    background:#f5f8fb;
  ">
    ${escapeHtml(message).replace(/\n/g, "<br>")}
  </div>

  <hr style="
    margin:24px 0;
    border:0;
    border-top:1px solid #ddd;
  ">

  <p style="color:#777;font-size:14px;">
    ${
      replyTo
        ? `回复邮箱：${escapeHtml(replyTo)}`
        : "对方没有留下回复邮箱。"
    }
  </p>
</div>
`;

        // ==============================
        // Resend
        // ==============================

        const resendResponse = await fetch(
          "https://api.resend.com/emails",
          {
            method: "POST",

            headers: {
              "Authorization":
                `Bearer ${env.RESEND_API_KEY}`,
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              from: "Afterain <letter@afterain.lol>",
              to: ["3533434464@qq.com"],
              subject:
                "Afterain · 新的匿名信",
              text,
              html,

              ...(replyTo
                ? {
                    reply_to: replyTo,
                  }
                : {}),
            }),
          }
        );

        const resendData =
          await resendResponse.json();

        // Resend 失败
        if (!resendResponse.ok) {
          console.error(
            "Resend error:",
            resendData
          );

          return json(
            {
              error:
                "邮件发送失败，请稍后再试。"
            },
            500
          );
        }

        // ==============================
        // 只有邮件发送成功后才计数
        // ==============================

        count += 1;

        const ttl =
          Math.max(
            60,
            Math.ceil(
              (expiresAt - now) / 1000
            )
          );

        await env.LETTER_RATE_LIMIT.put(
          key,
          JSON.stringify({
            count,
            expiresAt,
          }),
          {
            expirationTtl: ttl,
          }
        );

        return json({
          ok: true,
          id: resendData.id,
        });

      } catch (e) {
        console.error(e);

        return json(
          {
            error:
              "发送失败，请稍后再试。"
          },
          500
        );
      }
    }

    return env.ASSETS.fetch(request);
  },
};