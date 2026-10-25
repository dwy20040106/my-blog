<template>
    <div class="memo-layout">

        <!-- ================= 左侧侧边栏 ================= -->
        <aside class="memo-sidebar">
            <div class="sidebar-title">分类导航</div>

            <div v-for="c in Object.keys(groupedNotes)" :key="c" class="sidebar-item"
                :class="{ active: c === activeCategory }" @click="scrollToCategory(c)">
                {{ c }}
            </div>
        </aside>

        <!-- ================= 主内容 ================= -->
        <div class="memo-wrapper">

            <!-- 输入区 -->
            <div class="memo-form">
                <div class="form-row">

                    <button class="switch-btn" @click="isNew = !isNew">
                        {{ isNew ? '选择分类' : '+ 新分类' }}
                    </button>

                    <select v-if="!isNew" v-model="category" class="form-select">
                        <option v-for="c in categories" :key="c">{{ c }}</option>
                    </select>

                    <input v-else v-model="newCategory" class="form-input" placeholder="输入新分类" />
                </div>

                <textarea v-model="content" class="form-textarea" placeholder="写下你的备注..."
                    @keydown.enter.prevent="submit" />

                <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

                <div class="form-actions">
                    <button class="submit-btn" @click="submit">
                        添加备注
                    </button>

                    <button v-if="selectedIds.length" class="danger-btn" @click="batchDelete">
                        删除选中 ({{ selectedIds.length }})
                    </button>
                </div>
            </div>

            <!-- 空状态 -->
            <div v-if="notes.length === 0" class="empty">
                暂无备注～
            </div>

            <!-- 列表 -->
            <div v-else class="memo-list">

                <div v-for="(items, cat) in groupedNotes" :key="cat" class="memo-section" :id="`cat-${cat}`"
                    :data-cat="cat">

                    <h2 class="memo-title">{{ cat }}</h2>

                    <ul>
                        <li v-for="item in items" :key="item.id" class="memo-item">

                            <input type="checkbox" v-model="selectedIds" :value="item.id" />

                            <!-- ⭐ 星级 -->
                            <span class="stars">
                                <span v-for="i in 5" :key="i" class="star" :class="{ active: i <= item.rating }"
                                    @click="setRating(item, i)">
                                    ★
                                </span>
                            </span>

                            <span class="content">{{ item.content }}</span>

                            <button class="delete-btn" @click="deleteOne(item.id)">
                                删除
                            </button>

                        </li>
                    </ul>

                </div>
            </div>

        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vitepress'
import {
    fetchNotes as fetchNoteList,
    createNote,
    updateNote,
    batchDeleteNotes
} from '../api'

const route = useRoute()
const pagePath = route.path
    .replace(/\/$/, '')     // 去掉末尾 /

const notes = ref([])
const categories = ref([])

const category = ref('')
const content = ref('')
const newCategory = ref('')
const isNew = ref(false)

const selectedIds = ref([])
const activeCategory = ref('')
const errorMessage = ref('')

/* ================= 获取数据 ================= */
const fetchNotes = async () => {
    try {
        const data = await fetchNoteList(pagePath)
        notes.value = data
    } catch (error) {
        console.error('[NotePanel] 加载备忘录失败:', error)
        notes.value = []
        errorMessage.value = '加载失败，请检查接口服务是否正常'
    }

    categories.value = [...new Set(notes.value.map(n => n.category))]

    if (!category.value && categories.value.length) {
        category.value = categories.value[0]
    }
}

/* ================= 分组 ================= */
const groupedNotes = computed(() => {
    const groups = {}

    notes.value.forEach(n => {
        if (!groups[n.category]) groups[n.category] = []
        groups[n.category].push(n)
    })

    Object.keys(groups).forEach(cat => {
        groups[cat].sort((a, b) => b.rating - a.rating)
    })

    return groups
})

/* ================= 添加 ================= */
const submit = async () => {
    const finalCategory = isNew.value
        ? newCategory.value.trim()
        : category.value

    if (!finalCategory || !content.value.trim()) return

    errorMessage.value = ''

    try {
        await createNote({
            article_key: pagePath,
            category: finalCategory,
            content: content.value.trim(),
            rating: 5
        })

        content.value = ''
        newCategory.value = ''
        isNew.value = false
    } catch (error) {
        console.error('[NotePanel] 添加备忘录失败:', error)
        errorMessage.value = error instanceof Error ? error.message : '添加失败，请稍后再试'
        return
    }

    fetchNotes()
}

/* ================= ⭐ 星级 ================= */
const setRating = async (item, value) => {
    item.rating = value

    try {
        await updateNote(item.id, { rating: value })
    } catch (error) {
        console.error('[NotePanel] 修改星级失败:', error)
    }

    fetchNotes()
}

/* ================= 删除 ================= */
const deleteOne = async (id) => {
    try {
        await updateNote(id, { is_deleted: true })
    } catch (error) {
        console.error('[NotePanel] 删除备忘录失败:', error)
    }

    fetchNotes()
}

const batchDelete = async () => {
    try {
        await batchDeleteNotes(selectedIds.value)
        selectedIds.value = []
    } catch (error) {
        console.error('[NotePanel] 批量删除失败:', error)
        errorMessage.value = error instanceof Error ? error.message : '删除失败，请稍后再试'
    }

    fetchNotes()
}

/* ================= 滚动导航 ================= */
const scrollToCategory = async (cat) => {
    activeCategory.value = cat

    await nextTick()

    const el = document.getElementById(`cat-${cat}`)
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
}

const handleScroll = () => {
    const sections = document.querySelectorAll('.memo-section')

    let current = ''

    sections.forEach(sec => {
        const rect = sec.getBoundingClientRect()
        if (rect.top <= 120) {
            current = sec.dataset.cat
        }
    })

    if (current) activeCategory.value = current
}

onMounted(() => {
    fetchNotes()
    window.addEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.memo-layout {
    display: flex;
    gap: 20px;
}

/* ========== sidebar ========== */
.memo-sidebar {
    width: 180px;
    position: sticky;
    top: 20px;
    height: fit-content;
    background: var(--vp-c-bg-soft);
    border: 1px solid var(--vp-c-divider);
    border-radius: 12px;
    padding: 12px;
}

.sidebar-title {
    font-weight: bold;
    margin-bottom: 10px;
}

.sidebar-item {
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    color: var(--vp-c-text-2);
}

.sidebar-item:hover {
    background: var(--vp-c-bg-mute);
}

.sidebar-item.active {
    background: var(--vp-c-brand-soft);
    color: var(--vp-c-brand-1);
}

/* ========== main ========== */
.memo-wrapper {
    flex: 1;
}

.memo-form {
    background: var(--vp-c-bg-soft);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 30px;
    border: 1px solid var(--vp-c-divider);
}

.form-row {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
}

.form-input,
.form-select {
    padding: 8px;
    border-radius: 6px;
    border: 1px solid var(--vp-c-divider);
}

.form-textarea {
    width: 100%;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid var(--vp-c-divider);
    margin-top: 10px;
}

.form-error {
    color: #e5484d;
    font-size: 13px;
    margin: 8px 0 0;
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
}

.submit-btn {
    background: var(--vp-c-brand-1);
    color: white;
    border: none;
    padding: 6px 16px;
    border-radius: 20px;
}

.danger-btn {
    background: #e5484d;
    color: white;
    border: none;
    padding: 6px 16px;
    border-radius: 20px;
}

/* ========== list ========== */
.memo-section {
    margin-bottom: 24px;
}

.memo-title {
    font-size: 1.1rem;
    margin-bottom: 10px;
}

.memo-item {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
}

.star {
    cursor: pointer;
    color: #aaa;
}

.star.active {
    color: gold;
}

.delete-btn {
    margin-left: auto;
    font-size: 12px;
    color: #e5484d;
}
/* ================= 手机适配 ================= */
@media (max-width: 768px) {

    .memo-layout {
        flex-direction: column;
        gap: 10px;
    }

    /* sidebar 变成横向滚动栏 */
    .memo-sidebar {
        width: 100%;
        position: sticky;
        top: 0;
        display: flex;
        gap: 8px;
        overflow-x: auto;
        white-space: nowrap;
        padding: 8px;
    }

    .sidebar-title {
        display: none;
    }

    .sidebar-item {
        flex-shrink: 0;
        padding: 6px 10px;
        font-size: 13px;
        border-radius: 20px;
    }

    /* 表单更紧凑 */
    .memo-form {
        padding: 12px;
    }

    .form-row {
        flex-direction: column;
    }

    .form-input,
    .form-select {
        width: 100%;
    }

    .form-textarea {
        font-size: 14px;
    }

    /* 列表优化 */
    .memo-item {
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 6px;
        padding: 6px 0;
    }

    .content {
        flex: 1;
        font-size: 14px;
        word-break: break-word;
    }

    .stars {
        font-size: 14px;
    }

    .delete-btn {
        margin-left: auto;
        font-size: 12px;
    }
}

/* ================= 超小屏（iPhone SE） ================= */
@media (max-width: 380px) {

    .sidebar-item {
        font-size: 12px;
        padding: 5px 8px;
    }

    .memo-title {
        font-size: 1rem;
    }

    .form-textarea {
        font-size: 13px;
    }
}
</style>