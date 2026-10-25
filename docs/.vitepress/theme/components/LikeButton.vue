<template>
  <div v-if="isPost" class="like-bar">
    <button
      class="like-btn"
      :class="{ 'is-liked': liked }"
      :disabled="liked || loading"
      :aria-pressed="liked"
      @click="submit"
    >
      <span class="like-icon">{{ liked ? '❤️' : '🤍' }}</span>
      <span class="like-label">{{ liked ? '已点赞' : '点赞' }}</span>
      <span class="like-count">{{ count }}</span>
    </button>
    <span v-if="tip" class="like-tip">{{ tip }}</span>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'
import { fetchLikes, likeArticle } from '../api'

const route = useRoute()

// 只在文章页显示，关于/备忘录等页面不出现
const isPost = computed(() => route.path.startsWith('/posts/'))
const pagePath = computed(() => route.path)

const count = ref(0)
const liked = ref(false)
const loading = ref(false)
const tip = ref('')

const load = async () => {
  if (!isPost.value) return
  try {
    const data = await fetchLikes(pagePath.value)
    count.value = data.count
    liked.value = data.liked
    tip.value = ''
  } catch (error) {
    console.error('[Like] 加载点赞状态失败:', error)
  }
}

const submit = async () => {
  if (liked.value || loading.value) return
  loading.value = true
  tip.value = ''

  try {
    const data = await likeArticle(pagePath.value)
    count.value = data.count
    liked.value = true
  } catch (error) {
    tip.value = error instanceof Error ? error.message : '点赞失败，请稍后再试'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(pagePath, load)
</script>

<style scoped>
.like-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 40px 0 8px;
}

.like-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 20px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: rgba(255, 255, 255, 0.65);
  color: var(--vp-c-text-1);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.dark .like-btn {
  background: rgba(255, 255, 255, 0.05);
}

.like-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-brand-soft);
}

.like-btn.is-liked {
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  cursor: default;
}

.like-icon {
  font-size: 16px;
  line-height: 1;
}

.like-count {
  min-width: 1.5em;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  font-variant-numeric: tabular-nums;
}

.like-tip {
  font-size: 12px;
  color: var(--vp-c-danger-1);
}
</style>
