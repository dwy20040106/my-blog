<template>
	<div v-if="!frontmatter.isNoComment" class="comments-section">
		<h3 class="comments-title">💬 评论区</h3>

		<!-- 评论表单 -->
		<div class="comment-form">
			<div class="form-row">
				<!-- <input v-model="form.author" type="text" placeholder="昵称 *" class="form-input"
					:class="{ error: errors.author }" /> -->
				<!-- <input v-model="form.email" type="email" placeholder="邮箱（可选，用于头像）" class="form-input" /> -->
			</div>
			<textarea v-model="form.content" placeholder="写下你想说的话..." rows="4" class="form-textarea"
				:class="{ error: errors.content }"></textarea>
			<div class="form-actions">
				<p v-if="submitError" class="form-error">{{ submitError }}</p>
				<button v-if="replyTo" class="cancel-reply-btn" @click="cancelReply">
					取消回复 @{{ replyTo.author }}
				</button>
				<button class="submit-btn" @click="submitComment" :disabled="loading">
					{{ loading ? '提交中...' : '发表评论' }}
				</button>
			</div>
		</div>

		<!-- 评论列表 -->
		<div v-if="loadingComments" class="comments-loading">
			加载评论中...
		</div>
		<div v-else-if="comments.length === 0" class="comments-empty">
			暂无评论，来说两句吧～
		</div>
		<div v-else class="comments-list">
			<CommentItem v-for="comment in comments" :key="comment.id" :comment="comment" :depth="0"
				:page-path="pagePath" @reply="fetchComments" @delete="handleDelete" />
		</div>
	</div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useData, useRoute } from 'vitepress'
import CommentItem from './CommentItem.vue'
import { fetchComments as fetchCommentList, createComment, deleteComment } from '../api'

const route = useRoute()
const { frontmatter } = useData()

const pagePath = computed(() => route.path)


const comments = ref([])
const loading = ref(false)
const loadingComments = ref(true)
const replyTo = ref(null)

const form = ref({
	content: ''
})

const errors = ref({
	content: false
})

// 发表失败的提示（例如接口 500、限流 429）
const submitError = ref('')

/**
 * 构建评论树（核心优化）
 */
const buildTree = (list) => {
	const map = {}
	const roots = []

	list.forEach(c => {
		map[c.id] = { ...c, replies: [] }
	})

	list.forEach(c => {
		if (c.parent_id) {
			map[c.parent_id]?.replies.push(map[c.id])
		} else {
			roots.push(map[c.id])
		}
	})

	return roots
}

/**
 * 获取评论（一次性）
 */
const fetchComments = async () => {
	loadingComments.value = true

	try {
		const data = await fetchCommentList(pagePath.value)
		comments.value = buildTree(data)
	} catch (error) {
		console.error('[Comment] 加载评论失败:', error)
		comments.value = []
	} finally {
		loadingComments.value = false
	}
}

/**
 * 提交评论
 */
const submitComment = async () => {
	errors.value.content = !form.value.content.trim()
	if (errors.value.content) return

	loading.value = true
	submitError.value = ''

	try {
		await createComment({
			article_key: pagePath.value,
			content: form.value.content.trim(),
			parent_id: null,
			root_id: null
		})

		form.value.content = ''
		await fetchComments()
	} catch (error) {
		console.error('[Comment] 发表评论失败:', error)
		submitError.value =
			error instanceof Error ? error.message : '发表失败，请稍后再试'
	} finally {
		loading.value = false
	}
}

/**
 * 回复
 */
const handleReply = (comment) => {
	replyTo.value = comment
	document.querySelector('.comment-form')?.scrollIntoView({ behavior: 'smooth' })
}

/**
 * 删除评论
 */
const handleDelete = async (id) => {
	try {
		await deleteComment(id)
		await fetchComments()
	} catch (error) {
		console.error('[Comment] 删除评论失败:', error)
	}
}

/**
 * 监听路由
 */
watch(pagePath, fetchComments)

onMounted(fetchComments)
</script>

<style scoped>
.comments-section {
	margin-top: 60px;
	padding-top: 32px;
	border-top: 1px solid var(--vp-c-divider);
}

.comments-title {
	font-size: 1.25rem;
	font-weight: 600;
	margin-bottom: 24px;
	color: var(--vp-c-text-1);
}

/* 表单样式 */
.comment-form {
	background: var(--vp-c-bg-soft);
	border-radius: 12px;
	padding: 20px;
	margin-bottom: 32px;
	border: 1px solid var(--vp-c-divider);
}

.form-row {
	display: flex;
	gap: 16px;
	margin-bottom: 16px;
}

.form-input {
	flex: 1;
	padding: 10px 14px;
	background: var(--vp-c-bg);
	border: 1px solid var(--vp-c-divider);
	border-radius: 8px;
	font-size: 0.9rem;
	color: var(--vp-c-text-1);
	transition: all 0.2s;
}

.form-input:focus {
	outline: none;
	border-color: var(--vp-c-brand-1);
}

.form-input.error {
	border-color: #e5484d;
}

.form-textarea {
	width: 100%;
	padding: 10px 14px;
	background: var(--vp-c-bg);
	border: 1px solid var(--vp-c-divider);
	border-radius: 8px;
	font-size: 0.9rem;
	color: var(--vp-c-text-1);
	resize: vertical;
	font-family: inherit;
}

.form-textarea:focus {
	outline: none;
	border-color: var(--vp-c-brand-1);
}

.form-textarea.error {
	border-color: #e5484d;
}

.form-actions {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
	margin-top: 16px;
}

.form-error {
	margin: 0 auto 0 0;
	color: #e5484d;
	font-size: 0.85rem;
}

.submit-btn {
	padding: 8px 20px;
	background: var(--vp-c-brand-1);
	color: white;
	border: none;
	border-radius: 20px;
	font-size: 0.875rem;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s;
}

.submit-btn:hover {
	background: var(--vp-c-brand-2);
	transform: translateY(-1px);
}

.submit-btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
	transform: none;
}

.cancel-reply-btn {
	padding: 8px 16px;
	background: transparent;
	color: var(--vp-c-text-2);
	border: 1px solid var(--vp-c-divider);
	border-radius: 20px;
	font-size: 0.875rem;
	cursor: pointer;
	transition: all 0.2s;
}

.cancel-reply-btn:hover {
	border-color: var(--vp-c-brand-1);
	color: var(--vp-c-brand-1);
}

/* 评论列表 */
.comments-loading,
.comments-empty {
	text-align: center;
	padding: 40px;
	color: var(--vp-c-text-2);
	font-size: 0.9rem;
}

.comments-list {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

/* 深色模式适配 */
html.dark .comment-form {
	background: var(--vp-c-bg-soft);
}

@media (max-width: 640px) {
	.form-row {
		flex-direction: column;
		gap: 12px;
	}

	.comments-section {
		margin-top: 40px;
		padding-top: 24px;
	}
}
</style>