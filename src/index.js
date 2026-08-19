const ALLOWED_ORIGIN = "*";

// 每个 IP 24 小时最多 3 封
const MAX_LETTERS_PER_DAY = 3;

const DAY_SECONDS = 24 * 60 * 60;

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

    // =====================================================
    // 匿名信
    // =====================================================

    if (url.pathname === "/api/letter") {

      // -----------------------------
      // CORS
      // -----------------------------

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
          {
            error: "Method Not Allowed",
          },
          405
        );
      }

      try {

        // =================================================
        // 检查 KV
        // =================================================

        if (!env.LETTER_RATE_LIMIT) {
          console.error(
            "LETTER_RATE_LIMIT KV binding missing"
          );

          return json(
            {
              error: "服务器限流服务未配置。",
            },
            500
          );
        }

        // =================================================
        // 解析请求
        // =================================================

        const body = await request.json();

        const message =
          String(body.message || "").trim();

        const replyTo =
          String(body.replyTo || "").trim();

        // =================================================
        // 留言检查
        // =================================================

        if (
          !message ||
          message.length > 2000
        ) {
          return json(
            {
              error:
                "留言不能为空，且不能超过 2000 字。",
            },
            400
          );
        }

        // =================================================
        // 邮箱检查
        // =================================================

        if (
          replyTo &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            replyTo
          )
        ) {
          return json(
            {
              error: "邮箱格式不正确。",
            },
            400
          );
        }

        // =================================================
        // Resend API Key
        // =================================================

        if (!env.RESEND_API_KEY) {
          return json(
            {
              error:
                "邮件服务尚未配置。",
            },
            500
          );
        }

        // =================================================
        // 获取 IP
        // =================================================

        const ip =
          request.headers.get(
            "CF-Connecting-IP"
          ) || "unknown";

        /*
         * 使用固定 24 小时窗口。
         *
         * 例如：
         *
         * 2026-08-19
         *
         * 这个 IP 的 key：
         *
         * letter:1.2.3.4:2026-08-19
         *
         * 第二天自动换成：
         *
         * letter:1.2.3.4:2026-08-20
         *
         * 因此刷新网页不会重置。
         */

        const dayKey =
          new Date()
            .toISOString()
            .slice(0, 10);

        const key =
          `letter:${ip}:${dayKey}`;

        // =================================================
        // 获取当天次数
        // =================================================

        const stored =
          await env.LETTER_RATE_LIMIT.get(
            key,
            "json"
          );

        let count = 0;

        if (stored) {
          count =
            Number(
              stored.count || 0
            );
        }

        // =================================================
        // 限流
        // =================================================

        if (
          count >= MAX_LETTERS_PER_DAY
        ) {
          return json(
            {
              error:
                "今天的匿名信发送次数已用完，请明天再试。",
            },
            429
          );
        }

        // =================================================
        // 邮件内容
        // =================================================

        const text = `
你收到了一封新的匿名信：

${message}

${
  replyTo
    ? `回复邮箱：${replyTo}`
    : "对方没有留下回复邮箱。"
}
`.trim();

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
    ${escapeHtml(message).replace(
      /\n/g,
      "<br>"
    )}
  </div>

  <hr style="
    margin:24px 0;
    border:0;
    border-top:1px solid #ddd;
  ">

  <p style="
    color:#777;
    font-size:14px;
  ">
    ${
      replyTo
        ? `回复邮箱：${escapeHtml(
            replyTo
          )}`
        : "对方没有留下回复邮箱。"
    }
  </p>

</div>
`;

        // =================================================
        // Resend
        // =================================================

        const resendResponse =
          await fetch(
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
                from:
                  "Afterain <letter@afterain.lol>",

                to: [
                  "3533434464@qq.com"
                ],

                subject:
                  "Afterain · 新的匿名信",

                text,

                html,

                ...(replyTo
                  ? {
                      reply_to:
                        replyTo,
                    }
                  : {}),
              }),
            }
          );

        const resendData =
          await resendResponse.json();

        // =================================================
        // Resend 失败
        // =================================================

        if (!resendResponse.ok) {

          console.error(
            "Resend error:",
            resendData
          );

          return json(
            {
              error:
                "Resend 发送失败。",
            },
            500
          );
        }

        // =================================================
        // 邮件成功
        // =================================================

        count += 1;

        /*
         * 这里设置 2 天 TTL。
         *
         * 实际上 key 本身带日期，
         * 第二天不会再读取这个 key。
         *
         * TTL 只是让旧数据自动清理，
         * 防止 KV 无限积累。
         */

        await env.LETTER_RATE_LIMIT.put(
          key,
          JSON.stringify({
            count,
          }),
          {
            expirationTtl:
              DAY_SECONDS * 2,
          }
        );

        console.log(
          `Anonymous letter sent: IP=${ip}, count=${count}/${MAX_LETTERS_PER_DAY}`
        );

        return json({
          ok: true,
          id: resendData.id,
          remaining:
            MAX_LETTERS_PER_DAY -
            count,
        });

      } catch (e) {

        console.error(
          "Worker error:",
          e
        );

        return json(
          {
            error:
              "Worker 执行失败。",
          },
          500
        );
      }
    }

    // =====================================================
    // 其他请求交给静态资源
    // =====================================================

    return env.ASSETS.fetch(request);
  },
};