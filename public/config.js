/*
  Afterain 网站配置（已扩展）
*/
window.SITE_CONFIG = {
  avatarUrl: "/assets/avatar-placeholder.svg",

  // Profile for homepage module
  profile: {
    name: "Afterain",
    title: "个人空间 / Builder",
    bio: "一个正在慢慢构建自己世界的人。这里记录一些关于我、我的生活和想法。",
    location: "Somewhere",
    email: ""
  },

  // About text for the About module
  about: "这是我的个人空间。比起社交平台，我更想让这里保持一点安静、自由和真实。这里记录一些我正在做的事、想法与片段。",

  // Social links to render in the Social module
  socials: [
    { name: "GitHub", url: "https://github.com/Aftera1n" }
    // 可按需加入更多链接，例如：{ name: "Twitter", url: "https://twitter.com/..." }
  ],

  // 匿名信后端地址。部署同一个 Worker 时保持 "/api/letter" 即可。
  letterApi: "/api/letter",

  status: {
    title: "正在专心做自己的事情",
    detail: "此刻正在更新这个网站，也在思考下一步要做什么。",
    updatedAt: "2026-08-19 14:00"
  },

  moments: [
    {
      date: "2026-08-19",
      title: "新的个人空间",
      description: "从今天开始，把一些值得留下的东西放在这里。",
      image: ""
    },
    {
      date: "2026-08-01",
      title: "一个夏天的片段",
      description: "这里换成你自己的照片说明。",
      image: ""
    }
  ]
};
