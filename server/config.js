import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 固定读取 server/.env：
// 宝塔的 Node 项目 / PM2 有时候工作目录不是 server，用绝对路径最稳。
dotenv.config({ path: path.join(__dirname, '.env') })

function toNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/**
 * CORS_ORIGIN 支持三种写法：
 *   留空 / *              → 允许所有来源（默认，API 本身是公开读接口）
 *   https://a.com,b.com   → 只允许列出的来源
 */
function parseOrigins(value) {
  if (!value || value.trim() === '*') return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const missing = []
if (!process.env.DB_NAME) missing.push('DB_NAME')
if (!process.env.DB_USER) missing.push('DB_USER')
if (missing.length) {
  console.warn(`[config] 缺少数据库配置：${missing.join(', ')}，请检查 server/.env`)
}

export const config = {
  port: toNumber(process.env.PORT, 3001),
  host: process.env.HOST || '0.0.0.0',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: toNumber(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: toNumber(process.env.DB_CONNECTION_LIMIT, 10),
    queueLimit: 0,
    timezone: process.env.DB_TIMEZONE || 'local',
  },

  corsOrigins: parseOrigins(process.env.CORS_ORIGIN),

  // 留空表示不校验，保持和原来 Supabase 的「人人可删」策略一致
  adminToken: (process.env.ADMIN_TOKEN || '').trim(),

  // true 时由 Node 直接托管 docs/.vitepress/dist（不想用 Nginx 托管静态文件时开启）
  serveStatic: process.env.SERVE_STATIC === 'true',
  staticDir: process.env.STATIC_DIR
    ? path.resolve(__dirname, process.env.STATIC_DIR)
    : path.resolve(__dirname, '../docs/.vitepress/dist'),

  writeRateLimit: {
    windowMs: toNumber(process.env.WRITE_RATE_WINDOW_MS, 60_000),
    max: toNumber(process.env.WRITE_RATE_MAX, 20),
  },

  // 每个 IP 每天最多点赞次数
  likeDailyLimit: toNumber(process.env.LIKE_DAILY_LIMIT, 10),
}
