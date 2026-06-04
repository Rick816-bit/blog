# Rick's Blog

一个**自建后台**的个人博客：**访客只能浏览，只有登录后台的你能发文、改文、删文**。
界面沿用 [paresta.top](https://paresta.top) 的 Fuwari / Mizuki 风格；后端用 **Node.js 内置模块**手写，**零 npm 依赖、无需 `npm install`**。

## 🚀 快速开始

```powershell
cd my_blog
node server.js
```

然后打开浏览器：

- 浏览（人人可看）：<http://localhost:3000>
- 管理后台（仅你）：<http://localhost:3000/admin>
- 同一 WiFi 下，手机/别人可用 `http://你的局域网IP:3000` 访问（启动时控制台会打印）

> **首次启动**会自动生成一个随机管理员密码并打印在控制台。请尽快改成你自己的：
> ```powershell
> node setup.js 你的新密码
> ```

## ✍️ 怎么发文章

1. 浏览器进 `/admin` → 输入密码登录。
2. 点「**新建文章**」，填标题、日期、分类、标签，正文用 **Markdown** 书写（右侧有实时预览）。
3. 点「**保存并发布**」，文章立即出现在首页和归档。
4. 列表里可随时「改」或「删」。

访客没有这些按钮，访问 `/admin` 只会看到登录框 —— 写权限完全在服务端校验，安全。

## 🔒 安全说明

- 登录是**服务端校验**：密码以 `scrypt` 加盐哈希存于 `config.json`，从不外泄明文。
- 登录后用 **HttpOnly + SameSite=Strict 的会话 Cookie**，后台所有写操作还带 **CSRF 令牌**。
- 自带简单的失败次数限制（防暴力破解）。
- `config.json`（密码）默认已写入 `.gitignore`，不会被提交。

## 📁 结构

```
my_blog/
├── server.js            HTTP 服务器 + 路由 + 鉴权（入口）
├── setup.js             设置/重置管理员密码
├── package.json         npm start / npm run setup
├── lib/
│   ├── auth.js          scrypt 哈希 + 内存会话
│   ├── store.js         文章读写（data/posts.json）
│   ├── markdown.js      极简 Markdown → HTML
│   └── templates.js     所有页面的服务端渲染（Fuwari 风格）
├── public/
│   ├── style.css        样式（含后台样式）
│   └── theme.js         前端交互（深浅色/主题色/目录/回顶）
├── data/
│   └── posts.json       你的文章（自动读写）
├── config.json          管理员密码哈希（首次启动自动生成；勿提交）
├── legacy-static/       旧的纯静态版本（备份，双击可开）
└── README.md
```

## ⚙️ 常用命令

| 操作 | 命令 |
|---|---|
| 启动 | `node server.js` 或 `npm start` |
| 改密码 | `node setup.js 新密码` |
| 换端口 | `set PORT=8080 && node server.js`（Windows CMD） |
| 停止 | 在运行窗口按 `Ctrl + C` |

## 🔧 环境变量（部署 / 进阶用）

| 变量 | 作用 | 默认 |
|---|---|---|
| `PORT` | 监听端口 | `3000` |
| `ADMIN_PASSWORD` | **首次启动**时用它设管理员密码；部署到云上务必设置，否则密码会随机生成且只出现在日志里 | 随机生成 |
| `DATA_DIR` | 文章 `posts.json` 所在目录 | `./data` |
| `UPLOADS_DIR` | 上传图片目录 | `./public/uploads` |
| `CONFIG_PATH` | 管理员密码配置文件路径 | `./config.json` |

> 部署到 **Render / Railway**：设 `ADMIN_PASSWORD` 即可稳定登录（会话用 `sessionSecret` 签名，重启 / 重新部署都不掉线）。想让「网页后台写的文章和图不丢」，挂一个持久卷，并把 `DATA_DIR`、`UPLOADS_DIR`、`CONFIG_PATH` 都指到卷里。生产环境（HTTPS 反代）下登录 Cookie 会自动带 `Secure`。站点信息（站名 / 作者 / 简介 / 分享图等）集中在 `lib/templates.js` 顶部的 `SITE`。

## 🌐 之后想公开上网

当前为本地/局域网。想让任何人访问时，两条常见路径：

1. **内网穿透**（最快）：用 Cloudflare Tunnel 或 ngrok 把本机 3000 端口映射成公网网址。
2. **部署到云**：上传到 Render / Railway / 一台 VPS，跑 `node server.js`。
   - 注意：文章存在本地 `data/posts.json`，部署到「无持久磁盘」的平台时要挂载持久存储，并用上面的 `DATA_DIR` / `UPLOADS_DIR` / `CONFIG_PATH` 指过去（否则重新部署会丢内容）。
   - 公网走 HTTPS 即可：会话 Cookie 在 HTTPS 反代下会自动加 `Secure`，会话本身也已用密钥签名（重启不掉线）。
   - 已内置 `/sitemap.xml`、`/robots.txt`、RSS 与 Open Graph 分享卡片，利于被搜索引擎收录、分享有缩略图。

需要时我可以帮你接上其中一种。
