"use strict";
/**
 * 文章存储：data/posts.json（零依赖）。
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { stripMd } = require("./markdown");

const DATA_DIR = path.join(__dirname, "..", "data");
const POSTS_PATH = path.join(DATA_DIR, "posts.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(POSTS_PATH)) fs.writeFileSync(POSTS_PATH, "[]");
}

/* 内存缓存：靠文件 mtime 失效，既避免每次请求重复读盘解析，
   又能感知外部手改 posts.json。 */
let cache = null;
let cacheMtime = -1;

function readAll() {
  ensureFile();
  let mtime = 0;
  try { mtime = fs.statSync(POSTS_PATH).mtimeMs; } catch (e) {}
  if (cache && mtime === cacheMtime) return cache;
  try {
    const arr = JSON.parse(fs.readFileSync(POSTS_PATH, "utf8"));
    cache = Array.isArray(arr) ? arr : [];
  } catch (e) {
    cache = [];
  }
  cacheMtime = mtime;
  return cache;
}

/** 原子写入：先写临时文件再 rename，避免写到一半进程崩溃损坏数据。 */
function writeAll(posts) {
  ensureFile();
  const tmp = POSTS_PATH + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(posts, null, 2));
  fs.renameSync(tmp, POSTS_PATH);
  cache = posts.slice();
  try { cacheMtime = fs.statSync(POSTS_PATH).mtimeMs; } catch (e) { cacheMtime = -1; }
}

/** 按日期倒序（同日按 updated 倒序） */
function getAll() {
  return readAll().slice().sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.updated || "") < (a.updated || "") ? -1 : 1;
  });
}

function getBySlug(slug) {
  return readAll().find(function (p) { return p.slug === slug; }) || null;
}

function getById(id) {
  return readAll().find(function (p) { return p.id === id; }) || null;
}

function slugify(title, existingId) {
  let base = String(title || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w一-龥]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  if (!base) base = "post-" + Date.now();
  // 含中文时退化为短随机串，保证 URL 友好
  if (/[一-龥]/.test(base)) base = "p-" + crypto.randomBytes(3).toString("hex");
  let slug = base;
  let n = 2;
  const all = readAll();
  while (all.some(function (p) { return p.slug === slug && p.id !== existingId; })) {
    slug = base + "-" + n++;
  }
  return slug;
}

function makeExcerpt(content, excerpt) {
  const e = (excerpt || "").trim();
  if (e) return e;
  const text = stripMd(content);
  return text.length > 90 ? text.slice(0, 90) + "…" : text;
}

/** 新建或更新，返回保存后的文章 */
function upsert(data) {
  // 复制一份再改，写入成功（writeAll）才更新缓存，避免半路失败让缓存与磁盘不一致
  const all = readAll().map(function (p) { return Object.assign({}, p); });
  const now = new Date().toISOString();
  let post;
  if (data.id) {
    post = all.find(function (p) { return p.id === data.id; });
  }
  const tags = (Array.isArray(data.tags) ? data.tags : String(data.tags || "").split(/[,，\s]+/))
    .map(function (t) { return t.trim(); })
    .filter(Boolean);

  if (post) {
    post.title = data.title;
    post.date = data.date || post.date;
    post.category = data.category || "随笔";
    post.tags = tags;
    post.content = data.content || "";
    post.excerpt = makeExcerpt(data.content, data.excerpt);
    post.updated = now;
    if (data.retitleSlug) post.slug = slugify(data.title, post.id);
  } else {
    post = {
      id: crypto.randomBytes(8).toString("hex"),
      slug: slugify(data.title),
      title: data.title,
      date: data.date || now.slice(0, 10),
      category: data.category || "随笔",
      tags: tags,
      content: data.content || "",
      excerpt: makeExcerpt(data.content, data.excerpt),
      created: now,
      updated: now
    };
    all.push(post);
  }
  writeAll(all);
  return post;
}

function remove(id) {
  const all = readAll().filter(function (p) { return p.id !== id; });
  writeAll(all);
}

/** 统计分类与标签数量 */
function stats() {
  const all = readAll();
  const cats = {};
  const tags = {};
  all.forEach(function (p) {
    cats[p.category] = (cats[p.category] || 0) + 1;
    (p.tags || []).forEach(function (t) { tags[t] = (tags[t] || 0) + 1; });
  });
  return { count: all.length, cats, tags };
}

function readingMinutes(content) {
  const len = stripMd(content).length;
  return Math.max(1, Math.round(len / 320));
}

module.exports = {
  POSTS_PATH,
  getAll,
  getBySlug,
  getById,
  upsert,
  remove,
  stats,
  readingMinutes,
  slugify
};
