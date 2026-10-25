import { Router } from 'express'
import { query } from '../db.js'
import { config } from '../config.js'
import { wrap } from '../utils/wrap.js'
import { getClientIp } from '../utils/ip.js'
import { parseArticleKey, toPositiveId, trimText } from '../utils/validate.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { isAdminRequest } from '../middleware/admin.js'

const router = Router()
const writeLimit = rateLimit(config.writeRateLimit)

const MAX_CONTENT = 1000
const MAX_AUTHOR = 50

const COMMENT_FIELDS = 'id, article_key, author, content, parent_id, root_id, created_at'

/**
 * GET /api/comments?article_key=/posts/xxx
 * 返回该文章下的全部评论（前端自己组装成树）。
 * 不返回 ip，只返回 is_mine（是否是当前请求 IP 发的），用于决定是否显示删除按钮。
 */
router.get(
  '/',
  wrap(async (req, res) => {
    const articleKey = parseArticleKey(req.query.article_key)
    if (!articleKey) {
      return res.status(400).json({ error: 'article_key 参数不合法' })
    }

    const ip = getClientIp(req)
    const admin = isAdminRequest(req)

    const rows = await query(
      `SELECT ${COMMENT_FIELDS}, (ip = ?) AS is_mine
         FROM comments
        WHERE article_key = ?
        ORDER BY created_at ASC, id ASC`,
      [ip, articleKey],
    )

    res.json(
      rows.map((row) => ({
        ...row,
        is_mine: admin || row.is_mine === 1,
      })),
    )
  }),
)

/**
 * POST /api/comments
 * body: { article_key, content, author?, parent_id?, root_id? }
 * 会记录请求来源 IP。
 */
router.post(
  '/',
  writeLimit,
  wrap(async (req, res) => {
    const body = req.body || {}
    const articleKey = parseArticleKey(body.article_key)
    const content = trimText(body.content)
    const author = trimText(body.author).slice(0, MAX_AUTHOR) || '匿名'
    const parentId = toPositiveId(body.parent_id)
    const rootId = toPositiveId(body.root_id)
    const ip = getClientIp(req)

    if (!articleKey) return res.status(400).json({ error: 'article_key 不合法' })
    if (!content) return res.status(400).json({ error: '评论内容不能为空' })
    if (content.length > MAX_CONTENT) {
      return res.status(400).json({ error: `评论内容最多 ${MAX_CONTENT} 字` })
    }

    // 回复时校验父评论 / 根评论确实存在，避免脏数据
    if (parentId) {
      const parent = await query('SELECT id FROM comments WHERE id = ?', [parentId])
      if (!parent.length) return res.status(400).json({ error: '父评论不存在' })
    }
    if (rootId) {
      const root = await query('SELECT id FROM comments WHERE id = ?', [rootId])
      if (!root.length) return res.status(400).json({ error: '根评论不存在' })
    }

    const result = await query(
      `INSERT INTO comments (article_key, author, ip, content, parent_id, root_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [articleKey, author, ip, content, parentId, rootId],
    )

    const rows = await query(`SELECT ${COMMENT_FIELDS} FROM comments WHERE id = ?`, [
      result.insertId,
    ])

    res.status(201).json({ ...rows[0], is_mine: true })
  }),
)

/**
 * DELETE /api/comments/:id
 * 只能删除「本 IP 发布的评论」；配置了 ADMIN_TOKEN 时管理员也可以删。
 * 子评论通过外键 ON DELETE CASCADE 一起删除
 */
router.delete(
  '/:id',
  writeLimit,
  wrap(async (req, res) => {
    const id = toPositiveId(req.params.id)
    if (!id) return res.status(400).json({ error: 'id 不合法' })

    const rows = await query('SELECT ip FROM comments WHERE id = ?', [id])
    if (!rows.length) return res.status(404).json({ error: '评论不存在' })

    const ip = getClientIp(req)
    if (!isAdminRequest(req) && rows[0].ip !== ip) {
      return res.status(403).json({ error: '只能删除自己发表的评论' })
    }

    await query('DELETE FROM comments WHERE id = ?', [id])
    res.json({ ok: true, id })
  }),
)

export default router
