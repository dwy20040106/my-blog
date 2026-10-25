import crypto from 'node:crypto'
import { config } from '../config.js'

function safeEqual(a, b) {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * 是否带了正确的管理员令牌（没配置 ADMIN_TOKEN 时永远为 false）。
 */
export function isAdminRequest(req) {
  if (!config.adminToken) return false
  const token = req.get('x-admin-token') || ''
  return Boolean(token) && safeEqual(token, config.adminToken)
}

/**
 * 管理员令牌校验（可选）。
 * ADMIN_TOKEN 为空时直接放行；
 * 配置后，只允许带正确 X-Admin-Token 的请求。
 */
export function requireAdmin(req, res, next) {
  if (!config.adminToken) return next()
  if (isAdminRequest(req)) return next()

  return res.status(403).json({ error: '没有操作权限' })
}
