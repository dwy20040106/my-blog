import { Router } from 'express'
import { query } from '../db.js'
import { config } from '../config.js'
import { wrap } from '../utils/wrap.js'
import { parseArticleKey, toPositiveId, trimText } from '../utils/validate.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { requireAdmin } from '../middleware/admin.js'

const router = Router()
const writeLimit = rateLimit(config.writeRateLimit)

const MAX_CONTENT = 2000
const MAX_CATEGORY = 50
const MAX_BATCH = 100

const NOTE_FIELDS =
  'id, article_key, category, content, rating, is_deleted, created_at'

/**
 * GET /api/notes?article_key=/note
 * 只返回未删除的备忘录；排序：星级从高到低，同级按创建时间正序
 */
router.get(
  '/',
  wrap(async (req, res) => {
    const articleKey = parseArticleKey(req.query.article_key)
    if (!articleKey) {
      return res.status(400).json({ error: 'article_key 参数不合法' })
    }

    const rows = await query(
      `SELECT ${NOTE_FIELDS}
         FROM notes
        WHERE article_key = ? AND is_deleted = 0
        ORDER BY rating DESC, created_at ASC, id ASC`,
      [articleKey],
    )

    res.json(rows)
  }),
)

/**
 * POST /api/notes
 * body: { article_key, category, content, rating? }
 */
router.post(
  '/',
  writeLimit,
  wrap(async (req, res) => {
    const body = req.body || {}
    const articleKey = parseArticleKey(body.article_key)
    const category = trimText(body.category)
    const content = trimText(body.content)
    const rating = body.rating === undefined ? 5 : Number(body.rating)

    if (!articleKey) return res.status(400).json({ error: 'article_key 不合法' })
    if (!category) return res.status(400).json({ error: '请选择或填写分类' })
    if (category.length > MAX_CATEGORY) {
      return res.status(400).json({ error: `分类名最多 ${MAX_CATEGORY} 个字符` })
    }
    if (!content) return res.status(400).json({ error: '备注内容不能为空' })
    if (content.length > MAX_CONTENT) {
      return res.status(400).json({ error: `备注内容最多 ${MAX_CONTENT} 字` })
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: '评分必须是 1~5 的整数' })
    }

    const result = await query(
      `INSERT INTO notes (article_key, category, content, rating, is_deleted)
       VALUES (?, ?, ?, ?, 0)`,
      [articleKey, category, content, rating],
    )

    const rows = await query(`SELECT ${NOTE_FIELDS} FROM notes WHERE id = ?`, [
      result.insertId,
    ])

    res.status(201).json(rows[0])
  }),
)

/**
 * POST /api/notes/batch-delete
 * body: { ids: [1, 2, 3] }  —— 软删除（is_deleted = 1）
 */
router.post(
  '/batch-delete',
  writeLimit,
  requireAdmin,
  wrap(async (req, res) => {
    const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : []
    const ids = [...new Set(rawIds.map(toPositiveId).filter(Boolean))]

    if (!ids.length) return res.status(400).json({ error: '请选择要删除的备忘录' })
    if (ids.length > MAX_BATCH) {
      return res.status(400).json({ error: `一次最多删除 ${MAX_BATCH} 条` })
    }

    const placeholders = ids.map(() => '?').join(', ')
    const result = await query(
      `UPDATE notes SET is_deleted = 1 WHERE id IN (${placeholders}) AND is_deleted = 0`,
      ids,
    )

    res.json({ ok: true, affected: result.affectedRows })
  }),
)

/**
 * PATCH /api/notes/:id
 * body: { rating?, is_deleted?, content?, category? }
 */
router.patch(
  '/:id',
  writeLimit,
  wrap(async (req, res) => {
    const id = toPositiveId(req.params.id)
    if (!id) return res.status(400).json({ error: 'id 不合法' })

    const body = req.body || {}
    const sets = []
    const params = []

    if ('rating' in body) {
      const rating = Number(body.rating)
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: '评分必须是 1~5 的整数' })
      }
      sets.push('rating = ?')
      params.push(rating)
    }

    if ('is_deleted' in body) {
      // 软删除对所有人开放（和原 Supabase 行为一致）
      sets.push('is_deleted = ?')
      params.push(body.is_deleted ? 1 : 0)
    }

    if ('content' in body) {
      const content = trimText(body.content)
      if (!content) return res.status(400).json({ error: '备注内容不能为空' })
      if (content.length > MAX_CONTENT) {
        return res.status(400).json({ error: `备注内容最多 ${MAX_CONTENT} 字` })
      }
      sets.push('content = ?')
      params.push(content)
    }

    if ('category' in body) {
      const category = trimText(body.category)
      if (!category) return res.status(400).json({ error: '分类不能为空' })
      if (category.length > MAX_CATEGORY) {
        return res.status(400).json({ error: `分类名最多 ${MAX_CATEGORY} 个字符` })
      }
      sets.push('category = ?')
      params.push(category)
    }

    if (!sets.length) return res.status(400).json({ error: '没有需要更新的字段' })

    params.push(id)
    await query(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`, params)

    // UPDATE 的 affectedRows 在「新旧值相同」时是 0，所以这里再用 SELECT 判断是否存在
    const rows = await query(`SELECT ${NOTE_FIELDS} FROM notes WHERE id = ?`, [id])
    if (!rows.length) return res.status(404).json({ error: '备忘录不存在' })

    res.json(rows[0])
  }),
)

export default router
