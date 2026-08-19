# Afterain · 个人网站

一个部署在 Cloudflare Pages 上的单页个人网站，四个部分：
介绍（头像）、照片动态（时间链，接 R2）、匿名信（发邮件到你的邮箱）、此时状态。

设计主题是"雨后"：深蓝灰背景、雨丝动画、玻璃质感卡片、薄荷绿点缀。

---

## 目录结构

```
afterain-site/
├── index.html              页面结构
├── style.css                样式
├── script.js                前端逻辑
├── config.js                 ← 你主要改这个文件（名字/简介/头像/开关）
├── status.json                ← 此时状态，随时改随时发布
├── photos.json                照片时间链的备用数据（没接 R2 时用这个）
├── functions/
│   └── api/
│       ├── send-letter.js   匿名信发送接口（Cloudflare Pages Function）
│       └── photos.js        从 R2 自动读取照片列表的接口
└── assets/                  可以把头像图片放这里
```

---

## 本地预览

需要 Node.js。在项目目录下：

```bash
npx wrangler pages dev .
```

浏览器打开命令行提示的地址即可看到效果（Functions 接口在本地也能跑，
但没配置 R2/Resend 之前，照片会自动回退到 photos.json，匿名信会提示"服务尚未配置"）。

---

## 部署到 Cloudflare Pages

### 方式一：网页控制台（最简单）
1. 把这个文件夹推到一个 GitHub 仓库。
2. 登录 Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git。
3. 选择仓库，构建命令留空，输出目录填 `/`（根目录），直接部署。

### 方式二：命令行
```bash
npx wrangler pages deploy . --project-name=afterain
```

首次会引导你登录 Cloudflare 账号并创建 Pages 项目。

部署完成后，Cloudflare 会给一个 `xxx.pages.dev` 的地址，之后可以在
Pages 项目设置里绑定自己的域名。

---

## 1. 设置头像和介绍文字

打开 `config.js`：

```js
window.SITE_CONFIG = {
  name: "Afterain",
  bio: "写你想说的介绍文字",
  avatarUrl: "assets/avatar.jpg",   // 把头像图片放进 assets/ 文件夹，改这里的文件名即可
  links: [
    { label: "GitHub", url: "https://github.com/yourname", icon: "⌁" },
  ],
  ...
};
```

`avatarUrl` 也可以直接填一个图片链接（比如 R2 的公开链接），不一定要放在本地。
留空字符串则显示圆形占位符（自动取名字首字母）。

---

## 2. 照片动态接入 Cloudflare R2

### 第一步：创建 R2 存储桶
Cloudflare Dashboard → R2 → Create bucket，起个名字，比如 `afterain-photos`。

### 第二步：开启公开访问
桶的 Settings → Public access，开启 "Allow public access"，会得到一个
`https://pub-xxxxxxxx.r2.dev` 的地址（也可以绑定自定义域名）。

### 第三步：把桶绑定到 Pages 项目
Pages 项目 → Settings → Functions → R2 bucket bindings → Add binding：
- Variable name：`PHOTOS`
- R2 bucket：选择你刚建的桶

同时在 Settings → Environment variables 加一个变量：
- `R2_PUBLIC_BASE_URL` = 你第二步拿到的那个公开访问地址（不要带结尾的斜杠）

### 第四步：上传照片，并附上说明文字和日期
上传时给每个对象加两个自定义元数据（customMetadata）：`caption`（说明）
和 `date`（日期，如 `2026-08-01`）。用 wrangler 上传最方便：

```bash
wrangler r2 object put afterain-photos/2026-08-01-beach.jpg \
  --file=./beach.jpg \
  --custom-metadata '{"caption":"海边的傍晚","date":"2026-08-01"}'
```

配置好之后，`/api/photos` 会自动读取桶里所有图片、按日期排序，
前端的时间链会自动更新，不需要再手动改代码。

### 不想接 R2？
直接编辑根目录的 `photos.json`，格式：

```json
[
  { "url": "图片链接", "caption": "说明文字", "date": "2026-08-01" }
]
```

并把 `config.js` 里的 `usePhotoApi` 改成 `false`，网站就只读这个文件。

---

## 3. 匿名信接入邮箱（Resend）

这里用 [Resend](https://resend.com) 做发信服务，免费额度对个人网站够用。

1. 注册 Resend，拿到一个 API Key。
2. （可选但推荐）在 Resend 里验证自己的域名，这样发件地址能用
   `letters@yourdomain.com`；不验证的话可以先用 Resend 提供的测试地址
   `onboarding@resend.dev`，但只能发到你注册 Resend 时用的那个邮箱。
3. 在 Pages 项目 → Settings → Environment variables 添加：
   - `RESEND_API_KEY` = 你的 API Key
   - `TO_EMAIL` = 你想接收匿名信的邮箱
   - `FROM_EMAIL`（可选）= 验证过域名后的发件地址，如
     `Afterain 匿名信 <letters@yourdomain.com>`

保存后重新部署一次（改环境变量需要重新部署才会生效）。之后表单提交的信件
会通过邮件发送到 `TO_EMAIL`，前端已经做了防刷（隐藏蜜罐字段 + 简单限流）。

想换成其他邮件服务（Mailchannels、SendGrid 等）也可以，只需要改
`functions/api/send-letter.js` 里调用邮件 API 的那一段。

---

## 4. 更新"此时状态"

直接编辑根目录的 `status.json`：

```json
{
  "text": "在写一点代码，等雨停。",
  "detail": "地点：书桌前 · 心情：平静",
  "updatedAt": "2026-08-19T12:00:00+08:00"
}
```

改完提交、重新部署即可（或者以后接入 Cloudflare KV 做成不用重新部署
就能更新的版本，当前版本先用最简单的方式）。

---

## 小提示

- 所有可调的开关都在 `config.js`，不用去改 `script.js` 里的逻辑。
- 想关闭雨滴动画/减少动效：浏览器/系统开启"减少动态效果"会自动生效。
- 想换配色：改 `style.css` 顶部 `:root` 里的 CSS 变量即可，主色是
  `--accent`（薄荷绿），背景是 `--bg-0/1/2`。
