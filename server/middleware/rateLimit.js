/**
 * 极简的按 IP 限流（内存版）。
 * 目的只是挡住脚本刷评论，不依赖 Redis，够个人博客用。
 * 注意：PM2 多实例时每个实例各算各的，单实例部署没有这个问题。
 */
export function rateLimit({ windowMs = 60_000, max = 20 } = {}) {
  /** @type {Map<string, number[]>} */
  const buckets = new Map()

  return function limiter(req, res, next) {
    const key = req.ip || req.socket?.remoteAddress || 'unknown'
    const now = Date.now()

    const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs)
    if (hits.length >= max) {
      res.set('Retry-After', String(Math.ceil(windowMs / 1000)))
      return res.status(429).json({ error: '操作太频繁了，请稍后再试' })
    }

    hits.push(now)
    buckets.set(key, hits)

    // 偶尔清理一下过期 bucket，防止内存无限增长
    if (buckets.size > 5000) {
      for (const [ip, times] of buckets) {
        if (!times.some((t) => now - t < windowMs)) buckets.delete(ip)
      }
    }

    next()
  }
}
