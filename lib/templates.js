"use strict";
/** 服务端渲染所有页面，复用 Fuwari / Mizuki 风格。零依赖。 */
const { mdToHtml } = require("./markdown");
const store = require("./store");

/* ===== 站点信息：想改站名 / 作者 / 简介 / 横幅，只改这里一处即可 ===== */
const SITE = {
  name: "Rick's Blog",                          // 站名（导航栏、网页标题、页脚、RSS 都用它）
  author: "Rick",                               // 作者名（头像首字母、资料卡、页脚）
  bio: "白天写代码，晚上写字。<br />相信好工具与清晰思考的力量。", // 资料卡简介（可含 <br /> 等 HTML）
  bannerTitle: "你好，我是 Rick 👋",              // 首页大横幅标题
  bannerSub: "记录技术、思考与生活里值得写下的瞬间", // 首页横幅副标题（也用作网站默认描述）
  since: "2026-06-03",                          // 建站日期（首页侧栏"运行天数"用）
  github: "https://github.com/Rick816-bit",     // 你的 GitHub 主页；留空字符串则隐藏该按钮
  email: "1018577791@qq.com",                   // 你的邮箱；留空字符串则隐藏该按钮
  rss: "/rss.xml"                               // 本站自动生成的订阅源，无需修改
};

const ICON = {
  palette: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
  sun: '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
  moon: '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.27a11 11 0 0 0-3.48 21.46c.55.09.73-.24.73-.53v-1.85c-3.03.66-3.67-1.46-3.67-1.46-.5-1.26-1.21-1.6-1.21-1.6-.99-.67.07-.66.07-.66 1.1.08 1.67 1.13 1.67 1.13.97 1.66 2.55 1.18 3.17.9.1-.7.38-1.18.69-1.45-2.42-.28-4.96-1.21-4.96-5.38 0-1.19.42-2.16 1.13-2.92-.11-.28-.49-1.39.11-2.9 0 0 .92-.29 3.01 1.12a10.5 10.5 0 0 1 5.48 0c2.09-1.41 3.01-1.12 3.01-1.12.6 1.51.22 2.62.11 2.9.7.76 1.13 1.73 1.13 2.92 0 4.18-2.55 5.1-4.98 5.37.39.34.74 1 .74 2.02v3c0 .29.18.63.74.52A11 11 0 0 0 12 1.27"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>',
  rss: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'
};

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xmlEsc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function navbar(active) {
  function link(href, label, key) {
    return '<a href="' + href + '" class="nav-link' + (active === key ? " active" : "") + '">' + label + "</a>";
  }
  return [
    '<nav class="navbar" id="navbar"><div class="navbar-inner">',
    '<a class="nav-brand" href="/"><span class="brand-dot"></span>' + esc(SITE.name) + "</a>",
    '<div class="nav-menu">',
    link("/", "首页", "home"),
    link("/archive", "归档", "archive"),
    link("/about", "关于", "about"),
    "</div>",
    '<div class="nav-actions">',
    '<a class="icon-btn" href="/admin" title="管理后台" aria-label="管理后台">' + ICON.lock + "</a>",
    '<button class="icon-btn" id="hueBtn" aria-label="主题色" title="主题色">' + ICON.palette + "</button>",
    '<button class="icon-btn" id="themeBtn" aria-label="深浅模式" title="深浅模式">' + ICON.sun + ICON.moon + "</button>",
    '<button class="icon-btn nav-menu-toggle" id="menuBtn" aria-label="菜单" title="菜单">' + ICON.menu + "</button>",
    '<div class="hue-panel" id="huePanel"><div class="hue-row"><span>主题色相</span><span id="hueValue">250</span></div>',
    '<input type="range" min="0" max="360" value="250" id="hueSlider" class="hue-slider" aria-label="主题色相" /></div>',
    "</div></div></nav>"
  ].join("");
}

function shell(opts) {
  const banner = opts.banner || "";
  return [
    "<!DOCTYPE html>",
    '<html lang="zh-CN" data-theme="light"><head>',
    '<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    "<title>" + esc(opts.title ? opts.title + " · " + SITE.name : SITE.name) + "</title>",
    '<meta name="description" content="' + esc(opts.desc || SITE.bannerSub) + '" />',
    '<link rel="stylesheet" href="/style.css" />',
    '<link rel="alternate" type="application/rss+xml" title="' + esc(SITE.name) + ' RSS" href="/rss.xml" />',
    "<script>window.RICK_SITE=" + JSON.stringify({ since: SITE.since }) + ";</script>",
    "<script>(function(){try{var t=localStorage.getItem('rick-blog-theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;var h=localStorage.getItem('rick-blog-hue');if(h)document.documentElement.style.setProperty('--hue',h);}catch(e){}})();</script>",
    "</head><body>",
    navbar(opts.active),
    banner,
    opts.body,
    '<footer class="footer"><p>© ' + new Date().getFullYear() + " " + esc(SITE.author) + " · " + esc(SITE.name) + "</p>",
    '<p>参考 <a href="https://paresta.top" target="_blank" rel="noopener">paresta.top</a>（Fuwari / Mizuki 设计）· Node 自建后台，零依赖</p></footer>',
    '<button class="to-top" id="toTop" aria-label="回到顶部" title="回到顶部">' + ICON.up + "</button>",
    '<script src="/theme.js"></script>',
    opts.tailScript || "",
    "</body></html>"
  ].join("\n");
}

function bannerBig(title, sub) {
  return '<header class="banner"><h1 class="banner-title">' + title + "</h1>" +
    (sub ? '<p class="banner-sub">' + sub + "</p>" : "") + "</header>";
}
function bannerSmall(title, sub) {
  return '<header class="banner banner-sm"><h1 class="banner-title">' + esc(title) + "</h1>" +
    (sub ? '<p class="banner-sub">' + esc(sub) + "</p>" : "") + "</header>";
}

function socials() {
  const out = [];
  if (SITE.github) out.push('<a class="social-btn" href="' + esc(SITE.github) + '" target="_blank" rel="noopener" title="GitHub" aria-label="GitHub">' + ICON.github + "</a>");
  if (SITE.email)  out.push('<a class="social-btn" href="mailto:' + esc(SITE.email) + '" title="给我发邮件" aria-label="给我发邮件">' + ICON.mail + "</a>");
  if (SITE.rss)    out.push('<a class="social-btn" href="' + esc(SITE.rss) + '" title="RSS 订阅" aria-label="RSS 订阅">' + ICON.rss + "</a>");
  return '<div class="socials">' + out.join("") + "</div>";
}

function profileCard(d, bio) {
  return '<div class="card profile-card onload" style="--d:' + (d || 0) + '">' +
    '<div class="avatar">' + esc((SITE.author || "R").slice(0, 1).toUpperCase()) + "</div>" +
    '<div class="profile-name">' + esc(SITE.author) + "</div>" +
    '<div class="profile-bio">' + (bio || SITE.bio) + "</div>" +
    socials() + "</div>";
}

function sidebarPublic() {
  const s = store.stats();
  const cats = Object.keys(s.cats).map(function (c) {
    return '<li><a href="/category/' + encodeURIComponent(c) + '"><span>' + esc(c) + '</span><span class="count">' + s.cats[c] + "</span></a></li>";
  }).join("");
  const tags = Object.keys(s.tags).map(function (t) {
    return '<a class="tag" href="/tag/' + encodeURIComponent(t) + '" title="' + esc(t) + " · " + s.tags[t] + ' 篇">' + esc(t) + "</a>";
  }).join("") || '<span class="form-note">还没有标签</span>';

  return '<aside class="sidebar">' +
    profileCard(0) +
    '<div class="card widget onload" style="--d:1"><div class="widget-title">公告</div>' +
    '<p class="announcement">欢迎来到我的博客 ☕<br />右上角可切换深浅色、拖动滑块换主题色。</p></div>' +
    '<div class="card widget onload" style="--d:2"><div class="widget-title">分类</div>' +
    '<ul class="cat-list">' + (cats || '<li><span class="form-note">暂无</span></li>') + "</ul></div>" +
    '<div class="card widget onload" style="--d:3"><div class="widget-title">标签</div>' +
    '<div class="tag-cloud">' + tags + "</div></div>" +
    '<div class="card widget onload" style="--d:4"><div class="widget-title">本站资料</div>' +
    '<ul class="stat-list">' +
    '<li><span>文章</span><span>' + s.count + "</span></li>" +
    '<li><span>分类</span><span>' + Object.keys(s.cats).length + "</span></li>" +
    '<li><span>标签</span><span>' + Object.keys(s.tags).length + "</span></li>" +
    '<li><span>运行</span><span id="runDays">—</span></li>' +
    "</ul></div></aside>";
}

function metaRow(post) {
  return '<div class="post-meta">' +
    "<span>" + ICON.cal + esc(post.date) + "</span>" +
    "<span>" + ICON.folder + esc(post.category) + "</span>" +
    "<span>" + ICON.clock + "约 " + store.readingMinutes(post.content) + " 分钟</span>" +
    "</div>";
}

function postCard(post, idx) {
  const a = (idx * 120) % 360;
  return '<a class="card post-card onload" style="--d:' + (idx + 2) + '" href="/post/' + encodeURIComponent(post.slug) + '">' +
    '<span class="post-bar"></span><div class="post-body">' +
    '<h2 class="post-title">' + esc(post.title) + "</h2>" +
    metaRow(post) +
    '<p class="post-excerpt">' + esc(post.excerpt) + "</p></div>" +
    '<div class="post-thumb" style="--a:' + a + "; --b:" + (a + 46) + '"></div></a>';
}

/* ---------- 分页工具 ---------- */
const PER_PAGE = 8;
function paginate(items, page) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const cur = Math.min(Math.max(1, parseInt(page, 10) || 1), pages);
  return { slice: items.slice((cur - 1) * PER_PAGE, cur * PER_PAGE), cur: cur, pages: pages, total: total };
}
function pagerHtml(cur, pages, base) {
  if (pages <= 1) return "";
  function href(n) { return n <= 1 ? base : base + (base.indexOf("?") > -1 ? "&" : "?") + "page=" + n; }
  let out = '<nav class="pagination">';
  out += '<a class="page-btn' + (cur <= 1 ? " disabled" : "") + '" href="' + href(cur - 1) + '" aria-label="上一页">‹</a>';
  for (let n = 1; n <= pages; n++) {
    out += '<a class="page-btn' + (n === cur ? " active" : "") + '" href="' + href(n) + '">' + n + "</a>";
  }
  out += '<a class="page-btn' + (cur >= pages ? " disabled" : "") + '" href="' + href(cur + 1) + '" aria-label="下一页">›</a>';
  return out + "</nav>";
}

/* ---------- 公开页面 ---------- */

function home(posts, page) {
  const pg = paginate(posts, page);
  const cards = pg.total
    ? pg.slice.map(postCard).join("") + pagerHtml(pg.cur, pg.pages, "/")
    : '<div class="card widget"><p class="admin-empty">还没有文章。登录 <a href="/admin">/admin</a> 写下第一篇吧。</p></div>';
  const body =
    '<div class="main-wrapper"><div class="main-grid">' +
    sidebarPublic() +
    '<main class="content"><div class="list-head onload" style="--d:1">最新文章</div>' +
    cards + "</main></div></div>";
  return shell({ title: "", active: "home", banner: bannerBig(SITE.bannerTitle, SITE.bannerSub), body: body });
}

function archive(posts) {
  const byYear = {};
  posts.forEach(function (p) {
    const y = (p.date || "").slice(0, 4) || "其他";
    (byYear[y] = byYear[y] || []).push(p);
  });
  const years = Object.keys(byYear).sort().reverse();
  const inner = years.map(function (y) {
    const items = byYear[y].map(function (p) {
      return '<li><span class="t-date">' + esc((p.date || "").slice(5)) + '</span>' +
        '<a href="/post/' + encodeURIComponent(p.slug) + '">' + esc(p.title) + "</a></li>";
    }).join("");
    return '<div class="archive-year">' + y + '</div><ul class="timeline">' + items + "</ul>";
  }).join("") || '<p class="admin-empty">还没有文章。</p>';

  const body = '<div class="main-wrapper"><div class="main-grid">' + sidebarPublic() +
    '<main class="content"><article class="card archive-card onload" style="--d:1">' + inner + "</article></main></div></div>";
  return shell({ title: "归档", active: "archive", banner: bannerSmall("归档", "共 " + posts.length + " 篇文章"), body: body });
}

function about() {
  const body = '<div class="main-wrapper"><div class="main-grid">' + sidebarPublic() +
    '<main class="content"><article class="card article onload" style="--d:1">' +
    '<header class="article-head"><h1 class="article-title">关于我</h1></header><div class="prose">' +
    "<p>嗨，我是 Rick。一个喜欢折腾、也喜欢把事情想明白的人。</p>" +
    "<p>白天写代码，晚上写字。这个博客既是我的笔记本，也是我和世界对话的窗口。</p>" +
    "<h2>关于这个博客</h2>" +
    "<p>界面参考 <a href=\"https://paresta.top\" target=\"_blank\" rel=\"noopener\">paresta.top</a> 的 Fuwari / Mizuki 风格，后端是我用 Node 自建的——访客只能浏览，<strong>只有登录后台的我能发文、改文、删文</strong>。" +
    "整套零第三方依赖，文章存成本地文件，完全在我自己掌控之中。</p>" +
    "<h2>联系我</h2><p>邮箱：<a href=\"mailto:" + SITE.email + "\">" + esc(SITE.email) + "</a></p>" +
    "</div></article></main></div></div>";
  return shell({ title: "关于", active: "about", banner: bannerSmall("关于"), body: body });
}

function postPage(post) {
  const tagsHtml = (post.tags || []).length
    ? '<span>' + ICON.tag + (post.tags || []).map(function (t) {
        return '<a href="/tag/' + encodeURIComponent(t) + '">' + esc(t) + "</a>";
      }).join(" / ") + "</span>"
    : "";
  const sidebar = '<aside class="sidebar">' +
    '<div class="card widget onload" style="--d:0"><div class="widget-title">目录</div><nav class="toc" id="toc"></nav></div>' +
    profileCard(1, "白天写代码，晚上写字。") + "</aside>";

  const body = '<div class="main-wrapper"><div class="main-grid">' + sidebar +
    '<main class="content"><article class="card article onload" style="--d:1">' +
    '<a class="back-link" href="/">← 返回首页</a>' +
    '<header class="article-head"><h1 class="article-title">' + esc(post.title) + "</h1>" +
    '<div class="post-meta"><span>' + ICON.cal + esc(post.date) + "</span>" +
    "<span>" + ICON.folder + esc(post.category) + "</span>" +
    "<span>" + ICON.clock + "约 " + store.readingMinutes(post.content) + " 分钟</span>" +
    tagsHtml + "</div></header>" +
    '<div class="prose">' + mdToHtml(post.content) + "</div></article></main></div></div>";

  return shell({ title: post.title, active: "", desc: post.excerpt,
    banner: bannerSmall(post.title, post.date + " · " + post.category), body: body });
}

function notFound() {
  const body = '<div class="main-wrapper"><div class="main-grid"><main class="content" style="margin:0 auto">' +
    '<article class="card article" style="text-align:center"><h1 class="article-title">404</h1>' +
    '<p class="prose">页面不存在。<a href="/">返回首页 →</a></p></article></main></div></div>';
  return shell({ title: "404", active: "", banner: bannerSmall("404", "页面不存在"), body: body });
}

/* ---------- 后台页面 ---------- */

function adminShell(bodyInner, opts) {
  opts = opts || {};
  const body = '<div class="main-wrapper"><div class="main-grid"><main class="content" style="max-width:820px;margin:0 auto;width:100%">' +
    bodyInner + "</main></div></div>";
  return shell({ title: opts.title || "管理后台", active: "", banner: bannerSmall(opts.banner || "管理后台", opts.sub || ""), body: body, tailScript: opts.tailScript });
}

function login(error) {
  const inner = '<div class="card login-card onload">' +
    '<div class="lock">' + ICON.lock + "</div>" +
    "<h1>管理员登录</h1><p>只有你能进入后台发文，访客无需登录即可浏览。</p>" +
    (error ? '<div class="alert">' + esc(error) + "</div>" : "") +
    '<form method="POST" action="/admin/login">' +
    '<div class="field"><label>密码</label><input class="input" type="password" name="password" autofocus required /></div>' +
    '<div class="form-actions"><button class="btn btn-primary" type="submit" style="width:100%;justify-content:center">登录</button></div>' +
    "</form></div>";
  return adminShell(inner, { title: "登录", banner: "登录", sub: "管理后台" });
}

function dashboard(posts, csrf) {
  const rows = posts.length ? posts.map(function (p) {
    return '<div class="admin-row"><div class="row-main">' +
      '<div class="row-title">' + esc(p.title) + "</div>" +
      '<div class="row-meta">' + esc(p.date) + " · " + esc(p.category) +
      ((p.tags || []).length ? " · " + p.tags.map(esc).join(", ") : "") + "</div></div>" +
      '<div class="row-actions">' +
      '<a class="btn btn-ghost btn-sm" href="/post/' + encodeURIComponent(p.slug) + '" target="_blank">查看</a>' +
      '<a class="btn btn-sm" href="/admin/edit/' + p.id + '">' + ICON.edit + "改</a>" +
      '<form method="POST" action="/admin/delete" onsubmit="return confirm(\'确定删除《' + esc(p.title).replace(/'/g, "") + '》？此操作不可撤销。\')" style="display:inline">' +
      '<input type="hidden" name="id" value="' + p.id + '" /><input type="hidden" name="csrf" value="' + csrf + '" />' +
      '<button class="btn btn-danger btn-sm" type="submit">' + ICON.trash + "删</button></form>" +
      "</div></div>";
  }).join("") : '<div class="admin-empty">还没有文章，点右上角「新建文章」开始。</div>';

  const inner = '<div class="card admin-wrap onload">' +
    '<div class="admin-head"><div><h1>文章管理</h1><div class="muted">共 ' + posts.length + ' 篇 · 登录身份：管理员</div></div>' +
    '<div style="display:flex;gap:8px">' +
    '<a class="btn btn-primary" href="/admin/new">' + ICON.plus + "新建文章</a>" +
    '<form method="POST" action="/admin/logout" style="display:inline"><input type="hidden" name="csrf" value="' + csrf + '" />' +
    '<button class="btn btn-ghost" type="submit">' + ICON.out + "退出</button></form></div></div>" +
    '<div class="admin-list">' + rows + "</div></div>";
  return adminShell(inner, { title: "文章管理", banner: "管理后台", sub: "发文 / 改文 / 删文" });
}

function editor(post, csrf) {
  const p = post || { id: "", title: "", date: new Date().toISOString().slice(0, 10), category: "随笔", tags: [], content: "", excerpt: "" };
  const isNew = !post;
  const inner = '<div class="card admin-wrap onload">' +
    '<div class="admin-head"><h1>' + (isNew ? "新建文章" : "编辑文章") + "</h1>" +
    '<a class="btn btn-ghost" href="/admin">← 返回列表</a></div>' +
    '<form method="POST" action="/admin/save">' +
    '<input type="hidden" name="id" value="' + esc(p.id) + '" />' +
    '<input type="hidden" name="csrf" value="' + csrf + '" />' +
    '<div class="field"><label>标题</label><input class="input" type="text" name="title" id="f-title" value="' + esc(p.title) + '" required /></div>' +
    '<div class="field-row">' +
    '<div class="field"><label>日期</label><input class="input" type="date" name="date" value="' + esc(p.date) + '" /></div>' +
    '<div class="field"><label>分类</label><input class="input" type="text" name="category" value="' + esc(p.category) + '" /></div>' +
    "</div>" +
    '<div class="field"><label>标签（逗号分隔）</label><input class="input" type="text" name="tags" value="' + esc((p.tags || []).join(", ")) + '" placeholder="写作, 思考" /></div>' +
    '<div class="field"><label>摘要（可留空，自动生成）</label><input class="input" type="text" name="excerpt" value="' + esc(p.excerpt) + '" /></div>' +
    '<div class="field"><label>正文（Markdown：## 标题、**粗体**、`代码`、![图](url)、> 引用、- 列表、```代码块```）</label>' +
    '<div class="editor-toolbar"><button type="button" class="btn btn-ghost btn-sm" id="imgBtn">🖼 插入图片</button>' +
    '<input type="file" id="imgFile" accept="image/png,image/jpeg,image/gif,image/webp" hidden />' +
    '<span class="form-note">支持 png / jpg / gif / webp，≤ 5MB</span></div>' +
    '<div class="editor-grid split"><textarea class="textarea" name="content" id="f-content" required>' + esc(p.content) + "</textarea>" +
    '<div class="preview-pane"><div class="preview-label">实时预览</div><div class="prose" id="preview"></div></div></div></div>' +
    '<div class="form-actions"><button class="btn btn-primary" type="submit">保存并发布</button>' +
    '<a class="btn btn-ghost" href="/admin">取消</a></div></form></div>';

  // 轻量客户端预览（仅 UI，最终以服务端渲染为准）
  const tail = "<script>(function(){var t=document.getElementById('f-content'),o=document.getElementById('preview');if(!t||!o)return;" +
    "function e(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}" +
    "function r(md){var L=md.replace(/\\r\\n/g,'\\n').split('\\n'),h='',p=[],i=0;function f(){if(p.length){h+='<p>'+il(e(p.join(' ')))+'</p>';p=[];}}" +
    "function il(s){s=s.replace(/`([^`]+)`/g,'<code>$1</code>');s=s.replace(/!\\[([^\\]]*)\\]\\(([^)\\s]+)\\)/g,'<img src=\"$2\" alt=\"$1\" style=\"max-width:100%\" />');s=s.replace(/\\[([^\\]]+)\\]\\(([^)\\s]+)\\)/g,'<a>$1</a>');s=s.replace(/\\*\\*([^*]+)\\*\\*/g,'<strong>$1</strong>');s=s.replace(/(^|[^*])\\*([^*]+)\\*/g,'$1<em>$2</em>');return s;}" +
    "while(i<L.length){var l=L[i];if(/^```/.test(l)){f();i++;var c=[];while(i<L.length&&!/^```/.test(L[i])){c.push(L[i]);i++;}i++;h+='<pre><code>'+e(c.join('\\n'))+'</code></pre>';continue;}" +
    "if(/^\\s*$/.test(l)){f();i++;continue;}var m=l.match(/^(#{1,4})\\s+(.*)$/);if(m){f();h+='<h'+m[1].length+'>'+il(e(m[2]))+'</h'+m[1].length+'>';i++;continue;}" +
    "if(/^>\\s?/.test(l)){f();h+='<blockquote>'+il(e(l.replace(/^>\\s?/,'')))+'</blockquote>';i++;continue;}" +
    "if(/^\\s*[-*]\\s+/.test(l)){f();var it=[];while(i<L.length&&/^\\s*[-*]\\s+/.test(L[i])){it.push('<li>'+il(e(L[i].replace(/^\\s*[-*]\\s+/,'')))+'</li>');i++;}h+='<ul>'+it.join('')+'</ul>';continue;}" +
    "p.push(l);i++;}f();return h;}" +
    "function u(){o.innerHTML=r(t.value);}t.addEventListener('input',u);u();" +
    "var ib=document.getElementById('imgBtn'),f=document.getElementById('imgFile');" +
    "if(ib&&f){var csrf=(document.querySelector('input[name=csrf]')||{}).value||'';" +
    "ib.addEventListener('click',function(){f.click();});" +
    "f.addEventListener('change',function(){var file=f.files&&f.files[0];if(!file)return;var old=ib.textContent;ib.disabled=true;ib.textContent='上传中…';" +
    "fetch('/admin/upload?name='+encodeURIComponent(file.name),{method:'POST',headers:{'x-csrf-token':csrf,'Content-Type':'application/octet-stream'},body:file})" +
    ".then(function(r){return r.json();}).then(function(j){if(j&&j.url){var s=t.selectionStart||0,en=t.selectionEnd||0,ins='!['+file.name.replace(/\\.[^.]+$/,'')+']('+j.url+')';t.value=t.value.slice(0,s)+ins+t.value.slice(en);t.selectionStart=t.selectionEnd=s+ins.length;u();t.focus();}else{alert((j&&j.error)||'上传失败');}})" +
    ".catch(function(){alert('上传失败，请重试。');})" +
    ".then(function(){ib.disabled=false;ib.textContent=old;f.value='';});});}" +
    "})();</script>";

  return adminShell(inner, { title: isNew ? "新建" : "编辑", banner: isNew ? "新建文章" : "编辑文章", sub: "Markdown 编辑器", tailScript: tail });
}

/* ---------- 标签 / 分类 筛选页 ---------- */

function filterListPage(kind, value, posts, page) {
  const pg = paginate(posts, page);
  const base = (kind === "tag" ? "/tag/" : "/category/") + encodeURIComponent(value);
  const label = kind === "tag" ? "标签" : "分类";
  const cards = pg.total
    ? pg.slice.map(postCard).join("") + pagerHtml(pg.cur, pg.pages, base)
    : '<div class="card widget"><p class="admin-empty">没有相关文章，<a href="/">回首页</a>看看别的吧。</p></div>';
  const body = '<div class="main-wrapper"><div class="main-grid">' + sidebarPublic() +
    '<main class="content"><a class="back-link" href="/">← 返回首页</a>' +
    '<div class="list-head onload" style="--d:1">' + label + "：" + esc(value) + "</div>" +
    cards + "</main></div></div>";
  return shell({ title: label + "「" + value + "」", active: "",
    banner: bannerSmall(value, label + " · 共 " + pg.total + " 篇"), body: body });
}
function tagPage(tag, posts, page) { return filterListPage("tag", tag, posts, page); }
function categoryPage(cat, posts, page) { return filterListPage("category", cat, posts, page); }

/* ---------- RSS 订阅源 ---------- */

function rssFeed(posts, origin) {
  const items = posts.slice(0, 20).map(function (p) {
    const link = origin + "/post/" + encodeURIComponent(p.slug);
    const d = new Date((p.date || "1970-01-01") + "T00:00:00Z");
    return "<item>" +
      "<title>" + xmlEsc(p.title) + "</title>" +
      "<link>" + xmlEsc(link) + "</link>" +
      '<guid isPermaLink="true">' + xmlEsc(link) + "</guid>" +
      "<pubDate>" + d.toUTCString() + "</pubDate>" +
      (p.category ? "<category>" + xmlEsc(p.category) + "</category>" : "") +
      "<description>" + xmlEsc(p.excerpt || "") + "</description>" +
      "</item>";
  }).join("");
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0"><channel>' +
    "<title>" + xmlEsc(SITE.name) + "</title>" +
    "<link>" + xmlEsc(origin) + "</link>" +
    "<description>" + xmlEsc(SITE.bannerSub) + "</description>" +
    "<language>zh-CN</language>" +
    "<lastBuildDate>" + new Date().toUTCString() + "</lastBuildDate>" +
    items +
    "</channel></rss>";
}

module.exports = { home, archive, about, postPage, notFound, login, dashboard, editor, tagPage, categoryPage, rssFeed };
