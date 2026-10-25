/**
 * 评论 / 备忘录接口客户端
 *
 * 数据不再直连 Supabase，而是请求自建 Node 接口：
 *   浏览器 → Nginx（/api 反向代理）→ Node(server/) → MySQL
 *
 * 环境变量（都是可选的，同域部署时一个都不需要配）：
 *   VITE_API_BASE_URL  接口根地址，默认空（同域，走 /api）
 *   VITE_ADMIN_TOKEN   与 server/.env 的 ADMIN_TOKEN 一致时才需要
 */

const rawBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''
const API_BASE = rawBase.replace(/\/+$/, '')
const ADMIN_TOKEN = (import.meta.env.VITE_ADMIN_TOKEN as string | undefined) || ''

const REQUEST_TIMEOUT = 15000

export interface CommentRow {
	id: number
	article_key: string
	author: string
	content: string
	parent_id: number | null
	root_id: number | null
	created_at: string
	/** 是否是当前 IP 发的评论（服务端计算，不暴露 IP） */
	is_mine?: boolean
}

export interface NoteRow {
	id: number
	article_key: string
	category: string
	content: string
	rating: number
	is_deleted: number
	created_at: string
}

export interface CreateCommentPayload {
	article_key: string
	content: string
	author?: string
	parent_id?: number | null
	root_id?: number | null
}

export interface CreateNotePayload {
	article_key: string
	category: string
	content: string
	rating?: number
}

export interface UpdateNotePayload {
	rating?: number
	is_deleted?: boolean | number
	content?: string
	category?: string
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

	try {
		const res = await fetch(`${API_BASE}${path}`, {
			...init,
			signal: init.signal ?? controller.signal,
			headers: {
				...(init.body ? { 'Content-Type': 'application/json' } : {}),
				...(ADMIN_TOKEN ? { 'X-Admin-Token': ADMIN_TOKEN } : {}),
				...(init.headers as Record<string, string> | undefined),
			},
		})

		const text = await res.text()
		let data: unknown = null

		if (text) {
			try {
				data = JSON.parse(text)
			} catch {
				data = text
			}
		}

		if (!res.ok) {
			const message =
				data && typeof data === 'object' && 'error' in data
					? String((data as { error: unknown }).error)
					: `请求失败（HTTP ${res.status}）`
			const error = new Error(message) as Error & { status?: number }
			error.status = res.status
			throw error
		}

		return data as T
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') {
			throw new Error('请求超时，请检查网络或服务是否正常')
		}
		throw error
	} finally {
		clearTimeout(timer)
	}
}

/* ============================== 评论 ============================== */

export function fetchComments(articleKey: string): Promise<CommentRow[]> {
	return request<CommentRow[]>(`/api/comments?article_key=${encodeURIComponent(articleKey)}`)
}

export function createComment(payload: CreateCommentPayload): Promise<CommentRow> {
	return request<CommentRow>('/api/comments', {
		method: 'POST',
		body: JSON.stringify(payload),
	})
}

export function deleteComment(id: number): Promise<{ ok: boolean; id: number }> {
	return request<{ ok: boolean; id: number }>(`/api/comments/${id}`, {
		method: 'DELETE',
	})
}

/* ============================== 备忘录 ============================== */

export function fetchNotes(articleKey: string): Promise<NoteRow[]> {
	return request<NoteRow[]>(`/api/notes?article_key=${encodeURIComponent(articleKey)}`)
}

export function createNote(payload: CreateNotePayload): Promise<NoteRow> {
	return request<NoteRow>('/api/notes', {
		method: 'POST',
		body: JSON.stringify(payload),
	})
}

export function updateNote(id: number, payload: UpdateNotePayload): Promise<NoteRow> {
	return request<NoteRow>(`/api/notes/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(payload),
	})
}

export function batchDeleteNotes(ids: number[]): Promise<{ ok: boolean; affected: number }> {
	return request<{ ok: boolean; affected: number }>('/api/notes/batch-delete', {
		method: 'POST',
		body: JSON.stringify({ ids }),
	})
}

/* ============================== 点赞 ============================== */

export interface LikeStatus {
	article_key: string
	count: number
	liked: boolean
	dailyUsed: number
	dailyLimit: number
}

export function fetchLikes(articleKey: string): Promise<LikeStatus> {
	return request<LikeStatus>(`/api/likes?article_key=${encodeURIComponent(articleKey)}`)
}

export function likeArticle(articleKey: string): Promise<LikeStatus> {
	return request<LikeStatus>('/api/likes', {
		method: 'POST',
		body: JSON.stringify({ article_key: articleKey }),
	})
}

export interface LikeSummary {
	items: Record<string, { count: number; liked: boolean }>
	dailyUsed: number
	dailyLimit: number
}

/** 首页批量读取点赞数（一次请求） */
export function fetchLikeSummary(articleKeys: string[]): Promise<LikeSummary> {
	return request<LikeSummary>(
		`/api/likes/summary?keys=${encodeURIComponent(JSON.stringify(articleKeys))}`,
	)
}
