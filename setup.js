"use strict";
/**
 * 设置 / 重置管理员密码。
 *   用法:  node setup.js 你的新密码
 *   或:    set ADMIN_PASSWORD=你的密码 && node setup.js   (Windows CMD)
 */
const fs = require("fs");
const auth = require("./lib/auth");

const pw = process.argv[2] || process.env.ADMIN_PASSWORD;

if (!pw) {
  console.log("\n用法:  node setup.js 你的新密码\n");
  console.log("例如:  node setup.js MyS3cret!\n");
  process.exit(1);
}
if (String(pw).length < 4) {
  console.log("\n密码太短了，至少 4 位。\n");
  process.exit(1);
}

let existing = {};
if (fs.existsSync(auth.CONFIG_PATH)) {
  try { existing = JSON.parse(fs.readFileSync(auth.CONFIG_PATH, "utf8")); } catch (e) {}
}

const { salt, hash } = auth.hashPassword(pw);
const crypto = require("crypto");
const config = {
  salt: salt,
  hash: hash,
  sessionSecret: existing.sessionSecret || crypto.randomBytes(32).toString("hex"),
  createdAt: existing.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
auth.saveConfig(config);

console.log("\n✅ 管理员密码已设置。现在运行  node server.js  并到 /admin 用新密码登录。\n");
