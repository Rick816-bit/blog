"use strict";
/**
 * 认证：scrypt 密码哈希 + 内存会话。零依赖（仅 Node 内置 crypto）。
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "config.json");

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
    return { config: JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")), generatedPassword: null };
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
  return { config, generatedPassword: generated };
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/* ----- 内存会话 ----- */
const sessions = new Map(); // sid -> { exp, csrf }
const SESSION_MS = 1000 * 60 * 60 * 12; // 12 小时

function createSession() {
  const sid = crypto.randomBytes(24).toString("hex");
  const csrf = crypto.randomBytes(16).toString("hex");
  sessions.set(sid, { exp: Date.now() + SESSION_MS, csrf });
  return { sid, csrf };
}

function getSession(sid) {
  if (!sid) return null;
  const s = sessions.get(sid);
  if (!s) return null;
  if (s.exp < Date.now()) { sessions.delete(sid); return null; }
  return s;
}

function destroySession(sid) {
  if (sid) sessions.delete(sid);
}

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
