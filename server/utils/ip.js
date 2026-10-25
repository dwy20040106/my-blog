/**
 * 取客户端 IP（部署在 Nginx 反代后面，app.js 已设置 trust proxy）。
 * - 去掉 IPv4-mapped IPv6 前缀（::ffff:1.2.3.4 → 1.2.3.4）
 * - 本地 ::1 统一成 127.0.0.1
 * - 列宽 45，足够存完整 IPv6
 */
export function getClientIp(req) {
  const raw = (req.ip || req.socket?.remoteAddress || '').trim()
  let ip = raw.startsWith('::ffff:') ? raw.slice(7) : raw

  if (ip === '::1') ip = '127.0.0.1'
  if (!ip) ip = '0.0.0.0'

  return ip.slice(0, 45)
}
