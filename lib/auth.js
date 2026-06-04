"use strict";
/**
 * 认证：scrypt 密码哈希 + 内存会话。零依赖（仅 Node 内置 crypto）。
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = process.env.CONFIG_PATH || path.join(__dirname, "..", "config.json");

/* 会话签名密钥：取自 config.sessionSecret，由 loadOrInitConfig 填充（带文件兜底） */
let SECRET = null;
function ensureSecret() {
  if (SECRET) return SECRET;
  try { SECRET = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")).sessionSecret; } catch (e) {}
  return SECRET;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(String(password), salt, 64).toString("hex");
  const a = Buffer.from(test, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** 读取配置；若不存在则用随机密码自动创建并返回明文（仅首启提示一次） */
function loadOrInitConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    SECRET = config.sessionSecret;
    return { config: config, generatedPassword: null };
  }
  const generated = process.env.ADMIN_PASSWORD || crypto.randomBytes(6).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) || "rickblog";
  const { salt, hash } = hashPassword(generated);
  const config = {
    salt,
    hash,
    sessionSecret: crypto.randomBytes(32).toString("hex"),
    createdAt: new Date().toISOString()
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  SECRET = config.sessionSecret;
  return { config, generatedPassword: generated };
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/* ----- 无状态会话：用 sessionSecret 做 HMAC 签名，重启 / 多实例仍有效 ----- */
const SESSION_MS = 1000 * 60 * 60 * 12; // 12 小时

function sign(body) {
  return crypto.createHmac("sha256", ensureSecret() || "").update(body).digest("base64url");
}

function createSession() {
  const payload = { csrf: crypto.randomBytes(16).toString("hex"), exp: Date.now() + SESSION_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { sid: body + "." + sign(body), csrf: payload.csrf };
}

function getSession(token) {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(body));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch (e) { return null; }
  if (!payload || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  return { csrf: payload.csrf };
}

/* 无状态会话无需服务端销毁：登出时清除浏览器 Cookie 即可 */
function destroySession() {}

module.exports = {
  CONFIG_PATH,
  hashPassword,
  verifyPassword,
  loadOrInitConfig,
  saveConfig,
  createSession,
  getSession,
  destroySession
};
