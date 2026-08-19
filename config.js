/**
 * ============================================
 *  Afterain 个人网站 · 配置文件
 *  只需要改这个文件，就能调整大部分内容
 * ============================================
 */
window.SITE_CONFIG = {

  // ---------- 介绍 ----------
  name: "Afterain",
  bio: "雨停了，空气还留着水汽。这里是我存放介绍、影像、悄悄话与此刻状态的地方。",

  // 头像图片地址。留空字符串 "" 则显示占位符（一个字）。
  // 可以是相对路径（比如 "assets/avatar.jpg"），也可以是 R2 的公开链接。
  avatarUrl: "",

  // 社交链接，留空数组则不显示。icon 可填任意短文字/emoji。
  links: [
    // { label: "GitHub", url: "https://github.com/yourname", icon: "⌁" },
    // { label: "邮箱",   url: "mailto:you@example.com",        icon: "✉" },
  ],

  // ---------- 照片动态 ----------
  // 是否优先从后端接口 /api/photos 拉取（该接口读取 Cloudflare R2 的图片列表）。
  // 如果还没有部署 Functions / 绑定 R2，会自动回退使用下面的 photos.json 文件。
  usePhotoApi: true,

  // ---------- 匿名信 ----------
  // 是否启用发送功能（对应 functions/api/send-letter.js）。
  // 部署前记得在 Cloudflare Pages 的环境变量里配置 RESEND_API_KEY 和 TO_EMAIL。
  enableLetter: true,

  // ---------- 此时状态 ----------
  // 同样可以选择从 /api/status（如果你自建了）或本地 status.json 读取。
  // 默认直接读取根目录下的 status.json，手动改那个文件最简单。
  statusSource: "status.json",
};
