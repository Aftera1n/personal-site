/**
 * GET /api/photos
 *
 * 从绑定的 R2 存储桶里列出所有图片，读取每个对象的自定义元数据
 * （caption / date）拼成时间链需要的数据。
 *
 * 部署前需要：
 * 1. 在 Cloudflare Pages 项目 → Settings → Functions → R2 bucket bindings
 *    添加一个绑定，变量名填 PHOTOS，选择你的 R2 存储桶。
 * 2. 给存储桶开启公开访问（Public Development URL，或绑定自定义域名），
 *    并把那个公开访问的根地址填到环境变量 R2_PUBLIC_BASE_URL 里，
 *    例如：https://pub-xxxxxxxx.r2.dev  或  https://media.yourdomain.com
 * 3. 上传图片时，给对象加两个自定义元数据（customMetadata）：
 *      caption  -> 这张照片的说明文字
 *      date     -> 拍摄/发布日期，如 2026-08-01
 *    如果用 wrangler 上传，可以这样写：
 *      wrangler r2 object put your-bucket/2026-08-01-beach.jpg \
 *        --file=./beach.jpg \
 *        --custom-metadata '{"caption":"海边的傍晚","date":"2026-08-01"}'
 *
 * 如果还没做这些配置，前端会自动回退读取仓库里的 photos.json，
 * 网站不会因此报错。
 */

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.PHOTOS) {
    return json({ error: "R2 尚未绑定" }, 501);
  }

  try {
    const listed = await env.PHOTOS.list({ include: ["customMetadata"] });
    const base = (env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");

    const photos = listed.objects
      .filter((obj) => /\.(jpe?g|png|gif|webp|avif)$/i.test(obj.key))
      .map((obj) => {
        const meta = obj.customMetadata || {};
        return {
          url: base ? `${base}/${obj.key}` : `/r2/${obj.key}`,
          caption: meta.caption || "",
          date: meta.date || (obj.uploaded ? obj.uploaded.toString() : ""),
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return json(photos);
  } catch (err) {
    console.error("photos api error:", err);
    return json({ error: "读取失败" }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
