const ALLOWED_ORIGIN = "*";

// =====================================================
// 匿名信
// =====================================================

const MAX_LETTERS_PER_DAY = 3;
const DAY_SECONDS = 24 * 60 * 60;

// =====================================================
// Admin
// =====================================================

const ADMIN_SESSION_COOKIE = "afterain_admin_session";

const ADMIN_SESSION_SECONDS = 60 * 60 * 24 * 7;

// 登录失败限制
const ADMIN_LOGIN_MAX_FAILURES = 5;
const ADMIN_LOGIN_WINDOW = 15 * 60;

// KV keys
const STATUS_KEY = "status";
const MOMENTS_KEY = "moments";

// =====================================================
// Response helpers
// =====================================================
function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": ALLOWED_ORIGIN,
      "access-control-allow-methods":
        "GET, POST, PUT, DELETE, OPTIONS",
      "access-control-allow-headers":ƒ
        "content-type",
      ...extraHeaders,
    },
  });
}

function escapeHtml(s = "") {
  return String(s).replace(
    /[&<>"']/g,
    c =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c]
  );
}

// =====================================================
// Crypto helpers
// =====================================================

function bytesToBase64Url(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const base64 =
    value
      .replace(/-/g, "+")
      .replace(/_/g, "/") +
    "===".slice((value.length + 3) % 4);

  const binary = atob(base64);

  return Uint8Array.from(
    binary,
    char => char.charCodeAt(0)
  );
}

async function sha256(value) {
  const data =
    new TextEncoder().encode(value);

  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return new Uint8Array(hash);
}

async function hmacSign(value, secret) {
  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(value)
    );

  return bytesToBase64Url(
    new Uint8Array(signature)
  );
}

async function timingSafeEqual(a, b) {
  const aBytes =
    new TextEncoder().encode(a);

  const bBytes =
    new TextEncoder().encode(b);

  if (aBytes.length !== bBytes.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < aBytes.length; i++) {
    result |=
      aBytes[i] ^ bBytes[i];
  }

  return result === 0;
}

// =====================================================
// Admin Session
// =====================================================

async function createSession(env) {
  if (!env.ADMIN_SESSION_SECRET) {
    throw new Error(
      "ADMIN_SESSION_SECRET is not configured"
    );
  }

  const payload = {
    exp:
      Math.floor(Date.now() / 1000) +
      ADMIN_SESSION_SECONDS,
    nonce:
      crypto.randomUUID(),
  };

  const encoded =
    bytesToBase64Url(
      new TextEncoder().encode(
        JSON.stringify(payload)
      )
    );

  const signature =
    await hmacSign(
      encoded,
      env.ADMIN_SESSION_SECRET
    );

  return `${encoded}.${signature}`;
}

async function verifySession(request, env) {
  if (!env.ADMIN_SESSION_SECRET) {
    return false;
  }

  const cookie =
    request.headers.get("Cookie") || "";

  const match =
    cookie.match(
      new RegExp(
        `${ADMIN_SESSION_COOKIE}=([^;]+)`
      )
    );

  if (!match) {
    return false;
  }

  const value = match[1];

  const parts = value.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const [
    encoded,
    signature,
  ] = parts;

  const expected =
    await hmacSign(
      encoded,
      env.ADMIN_SESSION_SECRET
    );

  if (
    !(await timingSafeEqual(
      signature,
      expected
    ))
  ) {
    return false;
  }

  try {
    const payload =
      JSON.parse(
        new TextDecoder().decode(
          base64UrlToBytes(encoded)
        )
      );

    if (
      !payload.exp ||
      payload.exp <
        Math.floor(Date.now() / 1000)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function sessionCookie(value) {
  return [
    `${ADMIN_SESSION_COOKIE}=${value}`,
    "Path=/api/admin",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${ADMIN_SESSION_SECONDS}`,
  ].join("; ");
}

function clearSessionCookie() {
  return [
    `${ADMIN_SESSION_COOKIE}=`,
    "Path=/api/admin",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=0",
  ].join("; ");
}

// =====================================================
// Admin auth
// =====================================================

async function requireAdmin(request, env) {
  return await verifySession(
    request,
    env
  );
}

function getClientIP(request) {
  return (
    request.headers.get(
      "CF-Connecting-IP"
    ) || "unknown"
  );
}

// =====================================================
// Admin login rate limit
// =====================================================

async function checkLoginRateLimit(
  request,
  env
) {
  if (!env.AFTERAIN_SITE) {
    return {
      allowed: true,
    };
  }

  const ip =
    getClientIP(request);

  const key =
    `auth:login:${ip}`;

  const stored =
    await env.AFTERAIN_SITE.get(
      key,
      "json"
    );

  if (!stored) {
    return {
      allowed: true,
      count: 0,
    };
  }

  const count =
    Number(stored.count || 0);

  if (
    count >=
    ADMIN_LOGIN_MAX_FAILURES
  ) {
    return {
      allowed: false,
      count,
    };
  }

  return {
    allowed: true,
    count,
  };
}

async function recordLoginFailure(
  request,
  env
) {
  if (!env.AFTERAIN_SITE) {
    return;
  }

  const ip =
    getClientIP(request);

  const key =
    `auth:login:${ip}`;

  const stored =
    await env.AFTERAIN_SITE.get(
      key,
      "json"
    );

  const count =
    Number(
      stored?.count || 0
    ) + 1;

  await env.AFTERAIN_SITE.put(
    key,
    JSON.stringify({
      count,
    }),
    {
      expirationTtl:
        ADMIN_LOGIN_WINDOW,
    }
  );
}

async function clearLoginFailures(
  request,
  env
) {
  if (!env.AFTERAIN_SITE) {
    return;
  }

  const ip =
    getClientIP(request);

  await env.AFTERAIN_SITE.delete(
    `auth:login:${ip}`
  );
}

// =====================================================
// Status
// =====================================================

async function getStatus(env) {
  const status =
    await env.AFTERAIN_SITE.get(
      STATUS_KEY,
      "json"
    );

  return (
    status || {
      title: "",
      detail: "",
    }
  );
}

async function saveStatus(
  env,
  status
) {
  await env.AFTERAIN_SITE.put(
    STATUS_KEY,
    JSON.stringify({
      title:
        String(status.title || "")
          .trim()
          .slice(0, 80),

      detail:
        String(status.detail || "")
          .trim()
          .slice(0, 300),

      updatedAt:
        new Date().toISOString(),
    })
  );
}

// =====================================================
// Moments
// =====================================================

async function getMoments(env) {
  const moments =
    await env.AFTERAIN_SITE.get(
      MOMENTS_KEY,
      "json"
    );

  if (!Array.isArray(moments)) {
    return [];
  }

  return moments;
}

async function saveMoments(
  env,
  moments
) {
  await env.AFTERAIN_SITE.put(
    MOMENTS_KEY,
    JSON.stringify(moments)
  );
}

// =====================================================
// Cloudinary
// =====================================================

async function cloudinarySignature(
  params,
  apiSecret
) {
  const keys =
    Object.keys(params)
      .filter(
        key =>
          params[key] !== undefined &&
          params[key] !== null &&
          params[key] !== ""
      )
      .sort();

  const query =
    keys
      .map(
        key =>
          `${key}=${params[key]}`
      )
      .join("&");

  const data =
    new TextEncoder().encode(
      query + apiSecret
    );

  const hash =
    await crypto.subtle.digest(
      "SHA-1",
      data
    );

  return Array.from(
    new Uint8Array(hash)
  )
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}

async function uploadToCloudinary(
  file,
  env
) {
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "Cloudinary 尚未配置。"
    );
  }

  const timestamp =
    Math.floor(
      Date.now() / 1000
    );

  const folder =
    "afterain/moments";

  const signature =
    await cloudinarySignature(
      {
        folder,
        timestamp,
      },
      env.CLOUDINARY_API_SECRET
    );

  const form =
    new FormData();

  form.append(
    "file",
    file
  );

  form.append(
    "api_key",
    env.CLOUDINARY_API_KEY
  );

  form.append(
    "timestamp",
    String(timestamp)
  );

  form.append(
    "folder",
    folder
  );

  form.append(
    "signature",
    signature
  );

  const response =
    await fetch(
      `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: form,
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "Cloudinary upload error:",
      data
    );

    throw new Error(
      "图片上传失败。"
    );
  }

  return {
    url: data.secure_url,
    publicId: data.public_id,
  };
}

async function deleteFromCloudinary(
  publicId,
  env
) {
  if (
    !publicId ||
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    return;
  }

  const timestamp =
    Math.floor(
      Date.now() / 1000
    );

  const signature =
    await cloudinarySignature(
      {
        public_id: publicId,
        timestamp,
      },
      env.CLOUDINARY_API_SECRET
    );

  const form =
    new URLSearchParams();

  form.append(
    "public_id",
    publicId
  );

  form.append(
    "timestamp",
    String(timestamp)
  );

  form.append(
    "api_key",
    env.CLOUDINARY_API_KEY
  );

  form.append(
    "signature",
    signature
  );

  try {
    const response =
      await fetch(
        `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/x-www-form-urlencoded",
          },
          body: form,
        }
      );

    if (!response.ok) {
      console.error(
        "Cloudinary delete failed:",
        await response.text()
      );
    }
  } catch (error) {
    console.error(
      "Cloudinary delete error:",
      error
    );
  }
}

// =====================================================
// Worker
// =====================================================

export default {
  async fetch(request, env) {
    const url =
      new URL(request.url);

    // =================================================
    // Anonymous letter
    // =================================================

    if (
      url.pathname ===
      "/api/letter"
    ) {
      if (
        request.method ===
        "OPTIONS"
      ) {
        return new Response(null, {
          headers: {
            "access-control-allow-origin":
              ALLOWED_ORIGIN,
            "access-control-allow-methods":
              "POST, OPTIONS",
            "access-control-allow-headers":
              "content-type",
          },
        });
      }

      if (
        request.method !==
        "POST"
      ) {
        return json(
          {
            error:
              "Method Not Allowed",
          },
          405
        );
      }

      try {
        if (
          !env.LETTER_RATE_LIMIT
        ) {
          return json(
            {
              error:
                "服务器限流服务未配置。",
            },
            500
          );
        }

        const body =
          await request.json();

        const message =
          String(
            body.message || ""
          ).trim();

        const replyTo =
          String(
            body.replyTo || ""
          ).trim();

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

        if (
          replyTo &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            replyTo
          )
        ) {
          return json(
            {
              error:
                "邮箱格式不正确。",
            },
            400
          );
        }

        if (
          !env.RESEND_API_KEY
        ) {
          return json(
            {
              error:
                "邮件服务尚未配置。",
            },
            500
          );
        }

        const ip =
          getClientIP(request);

        const dayKey =
          new Date()
            .toISOString()
            .slice(0, 10);

        const key =
          `letter:${ip}:${dayKey}`;

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

        if (
          count >=
          MAX_LETTERS_PER_DAY
        ) {
          return json(
            {
              error:
                "今天的匿名信发送次数已用完，请明天再试。",
            },
            429
          );
        }

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

        const resendResponse =
          await fetch(
            "https://api.resend.com/emails",
            {
              method: "POST",
              headers: {
                Authorization:
                  `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  from:
                    "Afterain <letter@afterain.lol>",

                  to: [
                    "3533434464@qq.com",
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

        if (
          !resendResponse.ok
        ) {
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

        count += 1;

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

        return json({
          ok: true,
          id: resendData.id,
          remaining:
            MAX_LETTERS_PER_DAY -
            count,
        });
      } catch (error) {
        console.error(
          "Letter worker error:",
          error
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

    // =================================================
    // Admin API
    // =================================================

    if (
      url.pathname.startsWith(
        "/api/admin"
      )
    ) {
      // -----------------------------------------------
      // OPTIONS
      // -----------------------------------------------

      if (
        request.method ===
        "OPTIONS"
      ) {
        return new Response(null, {
          headers: {
            "access-control-allow-origin":
              ALLOWED_ORIGIN,
            "access-control-allow-methods":
              "GET, POST, PUT, DELETE, OPTIONS",
            "access-control-allow-headers":
              "content-type",
          },
        });
      }

      // -----------------------------------------------
      // Login
      // -----------------------------------------------

      if (
        url.pathname ===
          "/api/admin/login" &&
        request.method ===
          "POST"
      ) {
        try {
          if (
            !env.ADMIN_PASSWORD
          ) {
            return json(
              {
                error:
                  "管理员密码尚未配置。",
              },
              500
            );
          }

          if (
            !env.ADMIN_SESSION_SECRET
          ) {
            return json(
              {
                error:
                  "管理员 Session 尚未配置。",
              },
              500
            );
          }

          const rate =
            await checkLoginRateLimit(
              request,
              env
            );

          if (!rate.allowed) {
            return json(
              {
                error:
                  "登录失败次数过多，请 15 分钟后再试。",
              },
              429
            );
          }

          const body =
            await request.json();

          const password =
            String(
              body.password || ""
            );

          const passwordHash =
            await sha256(password);

          const adminHash =
            await sha256(
              env.ADMIN_PASSWORD
            );

          const passwordMatches =
            await timingSafeEqual(
              bytesToBase64Url(
                passwordHash
              ),
              bytesToBase64Url(
                adminHash
              )
            );

          if (
            !passwordMatches
          ) {
            await recordLoginFailure(
              request,
              env
            );

            return json(
              {
                error:
                  "管理员密码错误。",
              },
              401
            );
          }

          await clearLoginFailures(
            request,
            env
          );

          const session =
            await createSession(
              env
            );

          return json(
            {
              ok: true,
            },
            200,
            {
              "Set-Cookie":
                sessionCookie(
                  session
                ),
            }
          );
        } catch (error) {
          console.error(
            "Admin login error:",
            error
          );

          return json(
            {
              error:
                "登录失败。",
            },
            500
          );
        }
      }

      // -----------------------------------------------
      // Logout
      // -----------------------------------------------

      if (
        url.pathname ===
          "/api/admin/logout" &&
        request.method ===
          "POST"
      ) {
        return json(
          {
            ok: true,
          },
          200,
          {
            "Set-Cookie":
              clearSessionCookie(),
          }
        );
      }

      // -----------------------------------------------
      // Session
      // -----------------------------------------------

      if (
        url.pathname ===
          "/api/admin/session" &&
        request.method ===
          "GET"
      ) {
        const authenticated =
          await requireAdmin(
            request,
            env
          );

        if (!authenticated) {
          return json(
            {
              authenticated:
                false,
            },
            401
          );
        }

        return json({
          authenticated:
            true,
        });
      }

      // -----------------------------------------------
      // All remaining admin APIs require auth
      // -----------------------------------------------

      const authenticated =
        await requireAdmin(
          request,
          env
        );

      if (!authenticated) {
        return json(
          {
            error:
              "未登录或登录已过期。",
          },
          401
        );
      }

      // -----------------------------------------------
      // Status GET
      // -----------------------------------------------

      if (
        url.pathname ===
          "/api/admin/status" &&
        request.method ===
          "GET"
      ) {
        try {
          const status =
            await getStatus(
              env
            );

          return json({
            status,
          });
        } catch (error) {
          console.error(
            "Get status error:",
            error
          );

          return json(
            {
              error:
                "读取状态失败。",
            },
            500
          );
        }
      }

      // -----------------------------------------------
      // Status PUT
      // -----------------------------------------------

      if (
        url.pathname ===
          "/api/admin/status" &&
        request.method ===
          "PUT"
      ) {
        try {
          const body =
            await request.json();

          const title =
            String(
              body.title || ""
            ).trim();

          const detail =
            String(
              body.detail || ""
            ).trim();

          if (!title) {
            return json(
              {
                error:
                  "状态标题不能为空。",
              },
              400
            );
          }

          if (
            title.length > 80
          ) {
            return json(
              {
                error:
                  "状态标题不能超过 80 字。",
              },
              400
            );
          }

          if (
            detail.length > 300
          ) {
            return json(
              {
                error:
                  "状态说明不能超过 300 字。",
              },
              400
            );
          }

          await saveStatus(
            env,
            {
              title,
              detail,
            }
          );

          return json({
            ok: true,
          });
        } catch (error) {
          console.error(
            "Save status error:",
            error
          );

          return json(
            {
              error:
                "保存状态失败。",
            },
            500
          );
        }
      }

      // -----------------------------------------------
      // Moments GET
      // -----------------------------------------------

      if (
        url.pathname ===
          "/api/admin/moments" &&
        request.method ===
          "GET"
      ) {
        try {
          const list =
            await getMoments(
              env
            );

          return json({
            moments: list,
          });
        } catch (error) {
          console.error(
            "Get moments error:",
            error
          );

          return json(
            {
              error:
                "读取动态失败。",
            },
            500
          );
        }
      }

      // -----------------------------------------------
      // Moments POST
      // -----------------------------------------------

      if (
        url.pathname ===
          "/api/admin/moments" &&
        request.method ===
          "POST"
      ) {
        try {
          const body =
            await request.json();

          const date =
            String(
              body.date || ""
            ).trim();

          const title =
            String(
              body.title || ""
            ).trim();

          const description =
            String(
              body.description || ""
            ).trim();

          const image =
            String(
              body.image || ""
            ).trim();

          const imagePublicId =
            String(
              body.imagePublicId || ""
            ).trim();

          if (!date) {
            return json(
              {
                error:
                  "请选择日期。",
              },
              400
            );
          }

          if (!title) {
            return json(
              {
                error:
                  "动态标题不能为空。",
              },
              400
            );
          }

          if (
            title.length > 100
          ) {
            return json(
              {
                error:
                  "标题不能超过 100 字。",
              },
              400
            );
          }

          if (
            description.length >
            500
          ) {
            return json(
              {
                error:
                  "说明不能超过 500 字。",
              },
              400
            );
          }

          if (
            image.length > 2000
          ) {
            return json(
              {
                error:
                  "图片地址无效。",
              },
              400
            );
          }

          const list =
            await getMoments(
              env
            );

          const moment = {
            id:
              crypto.randomUUID(),

            date,

            title,

            description,

            image,

            imagePublicId,

            createdAt:
              new Date().toISOString(),
          };

          list.push(moment);

          // 新的动态排在前面
          list.sort(
            (a, b) =>
              String(
                b.date || ""
              ).localeCompare(
                String(
                  a.date || ""
                )
              ) ||
              String(
                b.createdAt || ""
              ).localeCompare(
                String(
                  a.createdAt || ""
                )
              )
          );

          await saveMoments(
            env,
            list
          );

          return json({
            ok: true,
            moment,
          });
        } catch (error) {
          console.error(
            "Create moment error:",
            error
          );

          return json(
            {
              error:
                "发布动态失败。",
            },
            500
          );
        }
      }

      // -----------------------------------------------
      // Moment PUT
      // -----------------------------------------------

      const momentMatch =
        url.pathname.match(
          /^\/api\/admin\/moments\/([^/]+)$/
        );

      if (
        momentMatch &&
        request.method ===
          "PUT"
      ) {
        try {
          const id =
            decodeURIComponent(
              momentMatch[1]
            );

          const body =
            await request.json();

          const list =
            await getMoments(
              env
            );

          const index =
            list.findIndex(
              item =>
                item.id === id
            );

          if (index === -1) {
            return json(
              {
                error:
                  "动态不存在。",
              },
              404
            );
          }

          const old =
            list[index];

          const updated = {
            ...old,

            date:
              body.date !== undefined
                ? String(
                    body.date
                  ).trim()
                : old.date,

            title:
              body.title !== undefined
                ? String(
                    body.title
                  ).trim()
                : old.title,

            description:
              body.description !==
              undefined
                ? String(
                    body.description
                  ).trim()
                : old.description,

            image:
              body.image !== undefined
                ? String(
                    body.image
                  ).trim()
                : old.image,

            imagePublicId:
              body.imagePublicId !==
              undefined
                ? String(
                    body.imagePublicId
                  ).trim()
                : old.imagePublicId,

            updatedAt:
              new Date().toISOString(),
          };

          if (!updated.title) {
            return json(
              {
                error:
                  "动态标题不能为空。",
              },
              400
            );
          }

          if (
            updated.title.length >
            100
          ) {
            return json(
              {
                error:
                  "标题不能超过 100 字。",
              },
              400
            );
          }

          if (
            updated.description.length >
            500
          ) {
            return json(
              {
                error:
                  "说明不能超过 500 字。",
              },
              400
            );
          }

          list[index] =
            updated;

          await saveMoments(
            env,
            list
          );

          return json({
            ok: true,
            moment:
              updated,
          });
        } catch (error) {
          console.error(
            "Update moment error:",
            error
          );

          return json(
            {
              error:
                "修改动态失败。",
            },
            500
          );
        }
      }

      // -----------------------------------------------
      // Moment DELETE
      // -----------------------------------------------

      if (
        momentMatch &&
        request.method ===
          "DELETE"
      ) {
        try {
          const id =
            decodeURIComponent(
              momentMatch[1]
            );

          const list =
            await getMoments(
              env
            );

          const index =
            list.findIndex(
              item =>
                item.id === id
            );

          if (index === -1) {
            return json(
              {
                error:
                  "动态不存在。",
              },
              404
            );
          }

          const deleted =
            list[index];

          list.splice(
            index,
            1
          );

          await saveMoments(
            env,
            list
          );

          // 删除 Cloudinary 图片
          if (
            deleted.imagePublicId
          ) {
            await deleteFromCloudinary(
              deleted.imagePublicId,
              env
            );
          }

          return json({
            ok: true,
          });
        } catch (error) {
          console.error(
            "Delete moment error:",
            error
          );

          return json(
            {
              error:
                "删除动态失败。",
            },
            500
          );
        }
      }

      // -----------------------------------------------
      // Cloudinary Upload
      // -----------------------------------------------\
      
      // =================================================
// Cloudinary 配置测试（临时）
// =================================================

if (
  url.pathname ===
    "/api/admin/cloudinary-test" &&
  request.method ===
    "GET"
) {
  return json({
    cloudNameConfigured:
      !!env.CLOUDINARY_CLOUD_NAME,

    apiKeyConfigured:
      !!env.CLOUDINARY_API_KEY,

    apiSecretConfigured:
      !!env.CLOUDINARY_API_SECRET,

    cloudNameLength:
      env.CLOUDINARY_CLOUD_NAME
        ? String(
            env.CLOUDINARY_CLOUD_NAME
          ).length
        : 0,

    apiKeyLength:
      env.CLOUDINARY_API_KEY
        ? String(
            env.CLOUDINARY_API_KEY
          ).length
        : 0,

    apiSecretLength:
      env.CLOUDINARY_API_SECRET
        ? String(
            env.CLOUDINARY_API_SECRET
          ).length
        : 0,
  });
}

      if (
        url.pathname ===
          "/api/admin/upload" &&
        request.method ===
          "POST"
      ) {
        try {
          const form =
            await request.formData();

          const file =
            form.get("file");

          if (
            !file ||
            typeof file ===
              "string"
          ) {
            return json(
              {
                error:
                  "没有选择图片。",
              },
              400
            );
          }

          if (
            !file.type.startsWith(
              "image/"
            )
          ) {
            return json(
              {
                error:
                  "只能上传图片。",
              },
              400
            );
          }

          // 10 MB
          if (
            file.size >
            10 * 1024 * 1024
          ) {
            return json(
              {
                error:
                  "图片不能超过 10 MB。",
              },
              400
            );
          }

          const result =
            await uploadToCloudinary(
              file,
              env
            );

          return json({
            ok: true,

            url:
              result.url,

            publicId:
              result.publicId,
          });
        } catch (error) {
          console.error(
            "Upload error:",
            error
          );

          return json(
            {
              error:
                error.message ||
                "图片上传失败。",
            },
            500
          );
        }
      }

      // -----------------------------------------------
      // Unknown admin endpoint
      // -----------------------------------------------

      return json(
        {
          error:
            "Admin API Not Found",
        },
        404
      );
    }
    
    
// =====================================================
// 公开网站 API
// =====================================================

// -----------------------------------------------
// Public Status
// -----------------------------------------------

if (url.pathname === "/api/status") {

  if (request.method !== "GET") {
    return json(
      {
        error: "Method Not Allowed",
      },
      405
    );
  }

  try {

    if (!env.AFTERAIN_SITE) {
      console.error(
        "AFTERAIN_SITE KV binding missing"
      );

      return json(
        {
          error: "网站内容服务未配置。",
        },
        500
      );
    }

    const stored =
      await env.AFTERAIN_SITE.get(
        STATUS_KEY,
        "json"
      );

    return json({
      status: stored || null,
    });

  } catch (error) {

    console.error(
      "Public status API error:",
      error
    );

    return json(
      {
        error: "读取状态失败。",
      },
      500
    );
  }
}


// =====================================================
// 公开网站动态
// =====================================================

if (url.pathname === "/api/moments") {

  if (request.method !== "GET") {
    return json(
      {
        error: "Method Not Allowed",
      },
      405
    );
  }

  try {
    if (!env.AFTERAIN_SITE) {
      console.error(
        "AFTERAIN_SITE KV binding missing"
      );

      return json(
        {
          error: "网站内容服务未配置。",
        },
        500
      );
    }

    const moments =
      await env.AFTERAIN_SITE.get(
        MOMENTS_KEY,
        "json"
      );

    return json({
      moments: Array.isArray(moments)
        ? moments
        : [],
    });

  } catch (error) {

    console.error(
      "Moments API error:",
      error
    );

    return json(
      {
        error: "读取动态失败。",
      },
      500
    );
  }
}



    // =====================================================
    // Static assets
    // =====================================================

    return env.ASSETS.fetch(
      request
    );
  },
};