<template>
    <div class="comment-item" :data-id="comment.id">
        <div class="comment-avatar">
            <img :src="avatarUrl" :alt="comment.author || '匿名'" />
        </div>

        <div class="comment-content">
            <div class="comment-header">
                <span class="comment-author">
                    {{ comment.author || '匿名' }}
                </span>
                <span class="comment-time">
                    {{ formatTime(comment.created_at) }}
                </span>
            </div>

            <div class="comment-body">
                {{ comment.content }}
            </div>

            <div class="comment-actions">
                <button class="action-btn reply-btn" @click="toggleReply">
                    💬 回复
                </button>

                <button v-if="canDelete" class="action-btn delete-btn" @click="emit('delete', comment.id)">
                    🗑️ 删除
                </button>
            </div>

            <!-- ✅ 回复框 -->
            <div v-if="showReply" class="reply-box">
                <textarea ref="textareaRef" v-model="replyContent" placeholder="写下你的回复..."
                    @keydown.enter.prevent="submitReply" />

                <div class="reply-actions">
                    <button class="cancel-btn" @click="cancelReply">
                        取消
                    </button>
                    <button class="submit-btn" @click="submitReply">
                        回复
                    </button>
                </div>
            </div>

            <!-- 子评论 -->
            <div v-if="comment.replies?.length" class="comment-replies">
                <CommentItem v-for="reply in comment.replies" :key="reply.id" :comment="reply" :page-path="pagePath"
                    :depth="depth + 1" @reply="emit('reply')" @delete="emit('delete', $event)" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, nextTick } from 'vue'
import { createComment } from '../api'

// props
const props = defineProps({
    comment: Object,
    pagePath: String,
    depth: Number
})

// emit
const emit = defineEmits(['reply', 'delete'])

// 状态
const showReply = ref(false)
const replyContent = ref('')
const textareaRef = ref(null)

// 头像
const avatarUrl = computed(() => {
    const isYou = props.depth % 2 === 0
    return `/images/${isYou ? 'you-head.jpg' : 'my-head.jpg'}`
})

// 删除权限：只允许删除本 IP 发表的评论（后端同时会校验）
const canDelete = computed(() => props.comment?.is_mine === true)

// 切换回复框
const toggleReply = async () => {
    showReply.value = !showReply.value

    if (showReply.value) {
        await nextTick()
        textareaRef.value?.focus()
    }
}

// 提交回复
const submitReply = async () => {
    const content = replyContent.value.trim()
    if (!content) return

    try {
        await createComment({
            article_key: props.pagePath,
            content,
            parent_id: props.comment.id,
            root_id: props.comment.root_id || props.comment.id
        })

        replyContent.value = ''
        showReply.value = false
        emit('reply') // 通知父组件刷新
    } catch (error) {
        console.error('[CommentItem] 回复失败:', error)
    }
}

// 取消回复
const cancelReply = () => {
    showReply.value = false
    replyContent.value = ''
}

// 时间格式
const formatTime = (dateStr) => {
    if (!dateStr) return '刚刚'

    const date = new Date(dateStr)
    const diff = Date.now() - date.getTime()

    const m = Math.floor(diff / 60000)
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(diff / 86400000)

    if (m < 1) return '刚刚'
    if (m < 60) return `${m}分钟前`
    if (h < 24) return `${h}小时前`
    if (d < 7) return `${d}天前`

    return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.comment-item {
    display: flex;
    gap: 14px;
    padding: 16px 0;
    border-bottom: 1px solid var(--vp-c-divider);
}

.comment-avatar img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
}

.comment-content {
    flex: 1;
}

.comment-author {
    font-weight: 600;
    color: var(--vp-c-brand-1);
}

.comment-time {
    font-size: 0.7rem;
    color: var(--vp-c-text-3);
}

.comment-body {
    margin: 6px 0;
}

.reply-box {
    margin-top: 10px;
}

.reply-box textarea {
    width: 100%;
    min-height: 60px;
    padding: 8px;
    border-radius: 6px;
}

.reply-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.submit-btn {
    background: var(--vp-c-brand-1);
    color: white;
    border: none;
    padding: 4px 12px;
    border-radius: 6px;
}

.cancel-btn {
    border: 1px solid var(--vp-c-divider);
    padding: 4px 10px;
    border-radius: 6px;
}

.comment-replies {
    margin-top: 12px;
    padding-left: 20px;
    border-left: 2px solid var(--vp-c-divider);
}
</style>