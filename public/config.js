/*
  Afterain 网站配置
  1. 把头像放到 public/assets/avatar.jpg，并把 avatarUrl 改成 "/assets/avatar.jpg"
  2. R2 图片：给 R2 绑定一个公开自定义域名，例如 https://img.example.com
  3. 在 moments 中填入图片 URL、日期、标题和说明
  4. status 可直接修改为你现在的现实状态
*/
window.SITE_CONFIG = {
  avatarUrl: "/assets/avatar-placeholder.jpeg",

  // 匿名信后端地址。部署同一个 Worker 时保持 "/api/letter" 即可。
  letterApi: "/api/letter",

  status: {
    title: "正在专心做自己的事情",
    detail: "此刻正在更新这个网站，也在思考下一步要做什么。",
    updatedAt: "2026-08-19 14:00"
  },
  
  
  async function loadRemoteStatus() {

  try {

    const response =
      await fetch("/api/status", {
        cache: "no-store"
      });

    if (!response.ok) {
      throw new Error("状态读取失败");
    }

    const data =
      await response.json();

    const status =
      data.status;

    if (!status) {
      return;
    }

    const title =
      document.getElementById(
        "status-title"
      );

    const detail =
      document.getElementById(
        "status-detail"
      );

    const time =
      document.getElementById(
        "status-time"
      );

    if (title) {
      title.textContent =
        status.title || "";
    }

    if (detail) {
      detail.textContent =
        status.detail || "";
    }

    if (time) {
      time.textContent =
        status.updatedAt || "";
    }

  } catch (error) {

    console.error(
      "Failed to load remote status:",
      error
    );

  }

},

  moments: [
    {
      date: "2026-08-19",
      title: "新的个人空间",
      description: "从今天开始，把一些值得留下的东西放在这里。",
      image: "" // 例如：https://img.example.com/2026/08/19/site.jpg
    },
    {
      date: "2026-08-01",
      title: "一个夏天的片段",
      description: "这里换成你自己的照片说明。",
      image: ""
    }
  ]
};



