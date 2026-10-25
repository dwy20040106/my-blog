import { Router } from 'express'
import { query } from '../db.js'
import { config } from '../config.js'
import { wrap } from '../utils/wrap.js'
import { getClientIp } from '../utils/ip.js'
import { parseArticleKey } from '../utils/validate.js'
import { rateLimit } from '../middleware/rateLimit.js'

const router = Router()
const writeLimit = rateLimit(config.writeRateLimit)

async function countForArticle(articleKey) {
  const rows = await query('SELECT COUNT(*) AS count FROM likes WHERE article_key = ?', [
    articleKey,
  ])
  return Number(rows[0]?.count || 0)
}

async function countToday(ip) {
  const rows = await query(
    'SELECT COUNT(*) AS count FROM likes WHERE ip = ? AND created_at >= CURDATE()',
    [ip],
  )
  return Number(rows[0]?.count || 0)
}

/**
 * GET /api/likes?article_key=/posts/xxx
 * 返回：总点赞数、当前 IP 是否已赞、今天已赞次数
 */
router.get(
  '/',
  wrap(async (req, res) => {
    const articleKey = parseArticleKey(req.query.article_key)
    if (!articleKey) {
      return res.status(400).json({ error: 'article_key 参数不合法' })
    }

    const ip = getClientIp(req)
    const liked = await query(
      'SELECT id FROM likes WHERE article_key = ? AND ip = ? LIMIT 1',
      [articleKey, ip],
    )

    res.json({
      article_key: articleKey,
      count: await countForArticle(articleKey),
      liked: liked.length > 0,
      dailyUsed: await countToday(ip),
      dailyLimit: config.likeDailyLimit,
    })
  }),
)

/**
 * GET /api/likes/summary?keys=["/posts/a","/posts/b"]
 * 首页批量获取多篇文章的点赞数 / 当前 IP 是否已赞，避免为每篇文章发一次请求。
 */
router.get(
  '/summary',
  wrap(async (req, res) => {
    let raw = []
    try {
      const parsed = JSON.parse(req.query.keys || '[]')
      if (Array.isArray(parsed)) raw = parsed
    } catch {
      raw = []
    }

    const keys = [...new Set(raw.map(parseArticleKey).filter(Boolean))].slice(0, 50)
    const ip = getClientIp(req)

    const items = {}
    keys.forEach((key) => {
      items[key] = { count: 0, liked: false }
    })

    if (keys.length) {
      const placeholders = keys.map(() => '?').join(', ')

      const counts = await query(
        `SELECT article_key, COUNT(*) AS count
           FROM likes
          WHERE article_key IN (${placeholders})
          GROUP BY article_key`,
        keys,
      )
      counts.forEach((row) => {
        if (items[row.article_key]) items[row.article_key].count = Number(row.count)
      })

      const mine = await query(
        `SELECT DISTINCT article_key
           FROM likes
          WHERE ip = ? AND article_key IN (${placeholders})`,
        [ip, ...keys],
      )
      mine.forEach((row) => {
        if (items[row.article_key]) items[row.article_key].liked = true
      })
    }

    res.json({
      items,
      dailyUsed: await countToday(ip),
      dailyLimit: config.likeDailyLimit,
    })
  }),
)

/**
 * POST /api/likes
 * body: { article_key }
 *
 * 规则：
 *   - 同一 IP 对同一篇文章只能赞一次
 *   - 同一 IP 每天最多赞 LIKE_DAILY_LIMIT 次（默认 10 次，按数据库 CURDATE() 分天）
 */
router.post(
  '/',
  writeLimit,
  wrap(async (req, res) => {
    const articleKey = parseArticleKey(req.body?.article_key)
    if (!articleKey) {
      return res.status(400).json({ error: 'article_key 不合法' })
    }

    const ip = getClientIp(req)

    const existing = await query(
      'SELECT id FROM likes WHERE article_key = ? AND ip = ? LIMIT 1',
      [articleKey, ip],
    )
    if (existing.length) {
      return res.status(409).json({
        error: '你已经赞过这篇文章了',
        liked: true,
        count: await countForArticle(articleKey),
      })
    }

    const dailyUsed = await countToday(ip)
    if (dailyUsed >= config.likeDailyLimit) {
      return res.status(429).json({
        error: `今天已经点赞 ${config.likeDailyLimit} 次啦，明天再来吧`,
        liked: false,
        count: await countForArticle(articleKey),
        dailyUsed,
        dailyLimit: config.likeDailyLimit,
      })
    }

    try {
      await query('INSERT INTO likes (article_key, ip) VALUES (?, ?)', [articleKey, ip])
    } catch (error) {
      // 并发下唯一索引兜底
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error: '你已经赞过这篇文章了',
          liked: true,
          count: await countForArticle(articleKey),
        })
      }
      throw error
    }

    res.status(201).json({
      article_key: articleKey,
      liked: true,
      count: await countForArticle(articleKey),
      dailyUsed: dailyUsed + 1,
      dailyLimit: config.likeDailyLimit,
    })
  }),
)

export default router
