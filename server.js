"use strict";
/**
 * Rick's Blog — 自建博客服务器（零 npm 依赖，仅 Node 内置模块）。
 * 访客可浏览；只有用密码登录后台的你能发文 / 改文 / 删文。
 *   启动:  node server.js
 *   改密:  node setup.js 你的新密码
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const url = require("url");
const querystring = require("querystring");
const crypto = require("crypto");

const auth = require("./lib/auth");
const store = require("./lib/store");
const T = require("./lib/templates");

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(PUBLIC_DIR, "uploads");

/** 校验上传文件名后缀，只放行常见图片格式（杜绝上传可执行 / SVG 等风险文件） */
function safeImageExt(name) {
  const m = /\.(png|jpe?g|gif|webp)$/i.exec(String(name || ""));
  if (!m) return "";
  const e = m[1].toLowerCase();
  return "." + (e === "jpeg" ? "jpg" : e);
}

const { config, generatedPassword } = auth.loadOrInitConfig();

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8"
};

/* 简单暴力破解防护：按 IP 记录失败次数 */
const failed = new Map();
function tooMany(ip) {
  const rec = failed.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.first > 10 * 60 * 1000) { failed.delete(ip); return false; }
  return rec.count >= 8;
}
function noteFail(ip) {
  const rec = failed.get(ip) || { count: 0, first: Date.now() };
  rec.count++; failed.set(ip, rec);
}

function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie;
  if (!h) return out;
  h.split(";").forEach(function (pair) {
    const idx = pair.indexOf("=");
    if (idx > -1) out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

function readBody(req) {
  return new Promise(function (resolve) {
    let data = "";
    let tooBig = false;
    req.on("data", function (c) {
      data += c;
      if (data.length > 1e6) { tooBig = true; req.destroy(); }
    });
    req.on("end", function () { resolve(tooBig ? {} : querystring.parse(data)); });
    req.on("error", function () { resolve({}); });
  });
}

/** 读取原始二进制请求体（用于图片上传），超过上限即拒绝 */
function readRawBody(req, maxBytes) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    let size = 0;
    req.on("data", function (c) {
      size += c.length;
      if (size > maxBytes) { reject(new Error("too big")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", function () { resolve(Buffer.concat(chunks)); });
    req.on("error", reject);
  });
}

function html(res, body, status) {
  res.writeHead(status || 200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
}
function redirect(res, location, cookie) {
  const headers = { Location: location };
  if (cookie) headers["Set-Cookie"] = cookie;
  res.writeHead(302, headers);
  res.end();
}

function sessionFromReq(req) {
  const sid = parseCookies(req).sid;
  const s = auth.getSession(sid);
  return s ? { sid: sid, csrf: s.csrf } : null;
}

function serveStatic(res, pathname) {
  const safe = path.normalize(pathname).replace(/^([/\\])+/, "");
  const file = path.join(PUBLIC_DIR, path.basename(safe)); // 仅取文件名，杜绝目录穿越
  fs.readFile(file, function (err, buf) {
    if (err) { html(res, T.notFound(), 404); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(buf);
  });
}

function serveUpload(res, pathname) {
  const file = path.join(UPLOADS_DIR, path.basename(pathname)); // 仅取文件名，杜绝目录穿越
  fs.readFile(file, function (err, buf) {
    if (err) { html(res, T.notFound(), 404); return; }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable"
    });
    res.end(buf);
  });
}

const SESSION_COOKIE = function (sid, secure) {
  return "sid=" + sid + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200" + (secure ? "; Secure" : "");
};
const CLEAR_COOKIE = function (secure) {
  return "sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" + (secure ? "; Secure" : "");
};

const server = http.createServer(async function (req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsed.pathname);
  const method = req.method;
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const proto = (req.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  const secure = proto === "https";
  const origin = proto + "://" + (req.headers.host || ("localhost:" + PORT));

  try {
    /* ---- 静态资源 ---- */
    if (method === "GET" && (pathname === "/style.css" || pathname === "/theme.js" || pathname.startsWith("/public/"))) {
      return serveStatic(res, pathname);
    }
    if (method === "GET" && pathname.startsWith("/uploads/")) {
      return serveUpload(res, pathname);
    }
    if (method === "GET" && pathname === "/favicon.ico") {
      res.writeHead(204); return res.end();
    }

    /* ---- 公开页面 ---- */
    if (method === "GET" && pathname === "/") return html(res, T.home(store.getAll(), parsed.query.page, origin));
    if (method === "GET" && pathname === "/archive") return html(res, T.archive(store.getAll(), origin));
    if (method === "GET" && pathname === "/about") return html(res, T.about(origin));
    if (method === "GET" && (pathname === "/rss.xml" || pathname === "/feed.xml")) {
      res.writeHead(200, { "Content-Type": "application/rss+xml; charset=utf-8" });
      return res.end(T.rssFeed(store.getAll(), origin));
    }
    if (method === "GET" && pathname === "/sitemap.xml") {
      res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
      return res.end(T.sitemap(store.getAll(), origin));
    }
    if (method === "GET" && pathname === "/robots.txt") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: " + origin + "/sitemap.xml\n");
    }
    if (method === "GET" && pathname.startsWith("/tag/")) {
      const tag = pathname.slice("/tag/".length).replace(/\/+$/, "");
      const list = store.getAll().filter(function (p) { return (p.tags || []).indexOf(tag) > -1; });
      return html(res, T.tagPage(tag, list, parsed.query.page, origin));
    }
    if (method === "GET" && pathname.startsWith("/category/")) {
      const cat = pathname.slice("/category/".length).replace(/\/+$/, "");
      const list = store.getAll().filter(function (p) { return p.category === cat; });
      return html(res, T.categoryPage(cat, list, parsed.query.page, origin));
    }
    if (method === "GET" && pathname.startsWith("/post/")) {
      const slug = pathname.slice("/post/".length).replace(/\/$/, "");
      const post = store.getBySlug(slug);
      return post ? html(res, T.postPage(post, origin)) : html(res, T.notFound(), 404);
    }

    /* ---- 登录 ---- */
    if (pathname === "/admin/login" && method === "POST") {
      if (tooMany(ip)) return html(res, T.login("尝试过于频繁，请 10 分钟后再试。"), 429);
      const body = await readBody(req);
      if (auth.verifyPassword(body.password || "", config.salt, config.hash)) {
        failed.delete(ip);
        const sess = auth.createSession();
        return redirect(res, "/admin", SESSION_COOKIE(sess.sid, secure));
      }
      noteFail(ip);
      return html(res, T.login("密码不正确。"), 401);
    }

    /* ---- 受保护：后台 ---- */
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      const sess = sessionFromReq(req);

      if (pathname === "/admin" && method === "GET") {
        return sess ? html(res, T.dashboard(store.getAll(), sess.csrf)) : html(res, T.login(null));
      }
      if (!sess) return redirect(res, "/admin"); // 未登录一律回登录页

      if (pathname === "/admin/logout" && method === "POST") {
        auth.destroySession(sess.sid);
        return redirect(res, "/", CLEAR_COOKIE(secure));
      }
      if (pathname === "/admin/new" && method === "GET") {
        return html(res, T.editor(null, sess.csrf));
      }
      if (pathname.startsWith("/admin/edit/") && method === "GET") {
        const post = store.getById(pathname.slice("/admin/edit/".length));
        return post ? html(res, T.editor(post, sess.csrf)) : html(res, T.notFound(), 404);
      }
      if (pathname === "/admin/upload" && method === "POST") {
        if ((req.headers["x-csrf-token"] || "") !== sess.csrf) {
          res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
          return res.end(JSON.stringify({ error: "会话已过期，请刷新后台重试。" }));
        }
        const ext = safeImageExt((parsed.query || {}).name);
        if (!ext) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          return res.end(JSON.stringify({ error: "只支持 png / jpg / gif / webp 图片。" }));
        }
        let buf;
        try {
          buf = await readRawBody(req, 5 * 1024 * 1024);
        } catch (e) {
          res.writeHead(413, { "Content-Type": "application/json; charset=utf-8" });
          return res.end(JSON.stringify({ error: "图片太大了（上限 5MB）。" }));
        }
        try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (e) {}
        const fname = Date.now().toString(36) + "-" + crypto.randomBytes(4).toString("hex") + ext;
        fs.writeFileSync(path.join(UPLOADS_DIR, fname), buf);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ url: "/uploads/" + fname }));
      }
      if (pathname === "/admin/save" && method === "POST") {
        const body = await readBody(req);
        if (body.csrf !== sess.csrf) return html(res, T.login("会话已过期，请重新登录。"), 403);
        if (!String(body.title || "").trim()) return redirect(res, "/admin/new");
        store.upsert({
          id: body.id || "",
          title: String(body.title).trim(),
          date: body.date,
          category: body.category,
          tags: body.tags,
          excerpt: body.excerpt,
          content: body.content || ""
        });
        return redirect(res, "/admin");
      }
      if (pathname === "/admin/delete" && method === "POST") {
        const body = await readBody(req);
        if (body.csrf !== sess.csrf) return html(res, T.login("会话已过期，请重新登录。"), 403);
        if (body.id) store.remove(body.id);
        return redirect(res, "/admin");
      }
    }

    /* ---- 兜底 ---- */
    return html(res, T.notFound(), 404);
  } catch (e) {
    console.error("[error]", e);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("500 Internal Server Error");
  }
});

function lanIPs() {
  const out = [];
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach(function (name) {
    (nets[name] || []).forEach(function (n) {
      if (n.family === "IPv4" && !n.internal) out.push(n.address);
    });
  });
  return out;
}

process.on("SIGTERM", function () { server.close(function () { process.exit(0); }); });

server.listen(PORT, HOST, function () {
  const line = "─".repeat(52);
  console.log("\n" + line);
  console.log("  🚀 Rick's Blog 已启动");
  console.log(line);
  console.log("  本机访问:   http://localhost:" + PORT);
  lanIPs().forEach(function (ip) {
    console.log("  局域网访问: http://" + ip + ":" + PORT + "   (同一 WiFi 下手机/别人可看)");
  });
  console.log("  管理后台:   http://localhost:" + PORT + "/admin");
  console.log(line);
  if (generatedPassword) {
    console.log("  🔑 首次启动，已生成管理员密码：  " + generatedPassword);
    console.log("     （请尽快用  node setup.js 你的新密码  修改）");
  } else {
    console.log("  🔐 管理员密码已设置（忘记可用  node setup.js 新密码  重置）");
  }
  console.log(line);
  console.log("  按 Ctrl+C 停止\n");
});
