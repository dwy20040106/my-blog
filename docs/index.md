---
layout: page
editLink: false
lastUpdated: false
---

<div class="home-dash">
<div class="dash-grid">

<!-- 左列：个人卡 + 时钟 -->
<div class="dash-col dash-left">
<section class="dash-card hi-card">
<img class="hi-avatar" src="/images/my-head.jpg" alt="YuJian" />
<div class="hi-greet"><span class="hi-dot"></span>{{ greeting }}</div>
<h1 class="hi-name">YuJian</h1>
<p class="hi-bio">记录技术、生活与思考，也收藏平凡日子里的小事。</p>
<nav class="hi-links">
<a href="/archive">文章</a>
<a href="/note">备忘录</a>
<a href="/about">关于我</a>
</nav>
<div class="hi-memo"><span class="hi-heart">❤️</span>很早很早之前</div>
</section>

<section class="dash-card clock-card">
<div class="clock-time">{{ clockTime }}</div>
<div class="clock-date"><span>{{ clockDate }}</span><span>{{ clockWeek }}</span></div>
</section>
</div>

<!-- 中列：生活碎片 + 最新文章 -->
<div class="dash-col dash-center">
<section class="dash-card photo-card">
<div class="card-head"><h2 class="card-title">生活碎片</h2><span class="card-sub">随手记录</span></div>
<Carousel :slides="carouselSlides" />
<TextCarousel :items="textCarouselItems" :interval="3500" />
</section>

<section class="dash-card posts-card">
<div class="card-head"><h2 class="card-title">最新文章</h2><a class="card-more" href="/archive">全部文章 →</a></div>
<div v-for="post in recentPosts" :key="post.url" class="post-item">
<span class="post-date">{{ fmtDate(post.date.time) }}</span>
<a class="post-title" :href="post.url">{{ post.title }}</a>
<span class="post-tags">
<em v-for="tag in (post.tags || []).slice(0, 2)" :key="tag">#{{ tag }}</em>
<em v-if="(post.tags || []).length > 2">+{{ post.tags.length - 2 }}</em>
</span>
<button
class="post-like"
:class="{ 'is-liked': likeOf(post.url).liked }"
:disabled="likeOf(post.url).liked || likeBusy === post.url"
:aria-label="`点赞：${post.title}`"
@click="likePost(post)"
>
<span class="post-like-icon">{{ likeOf(post.url).liked ? '❤️' : '🤍' }}</span>
<span class="post-like-count">{{ likeOf(post.url).count }}</span>
</button>
</div>
<div v-if="recentPosts.length === 0" class="post-empty">
<div class="post-empty-icon">📝</div>
<p>还没有文章</p>
<span>写下第一篇之后，它会出现在这里</span>
</div>
<p v-if="likeTip" class="like-tip">{{ likeTip }}</p>
</section>
</div>

<!-- 右列：日历 + 关于 + 小站 + 标签 -->
<div class="dash-col dash-right">
<section class="dash-card calendar-card">
<div class="card-head"><h2 class="card-title">{{ calTitle }}</h2><span class="cal-today">今天</span></div>
<div class="cal-week"><span v-for="w in weekLabels" :key="w">{{ w }}</span></div>
<div class="cal-grid">
<span v-for="(d, i) in calendarCells" :key="i" class="cal-day" :class="{ 'is-today': d.today, 'is-blank': !d.day }">{{ d.day }}</span>
</div>
</section>

<section class="dash-card about-card">
<div class="card-head"><h2 class="card-title">关于</h2></div>
<p class="about-text">这里记录技术、生活与思考。<br />不高产，但认真。</p>
<div class="stat-grid">
<div class="stat"><strong>{{ posts.length }}</strong><span>篇文章</span></div>
<div class="stat"><strong>{{ tags.length }}</strong><span>个标签</span></div>
</div>
<a class="about-link" href="/about">了解更多 →</a>
</section>

<section class="dash-card home-gallery-card">
<div class="card-head"><h2 class="card-title">相册</h2><a class="card-more" href="/gallery">全部 →</a></div>
<div class="home-gallery-grid">
<a v-for="album in recentAlbums" :key="album.url" class="home-gallery-item" :href="album.url" :title="album.title">
<img :src="album.cover" :alt="album.title" loading="lazy" />
<span>{{ album.title }}</span>
</a>
<a v-for="n in emptyGallerySlots" :key="`slot-${n}`" class="home-gallery-slot" href="/gallery" aria-label="查看全部相册">＋</a>
</div>
<p class="home-gallery-meta">{{ galleries.length }} 本相册 · {{ galleryPhotoCount }} 张照片</p>
</section>

<section v-if="tags.length" class="dash-card tags-card">
<div class="card-head"><h2 class="card-title">标签</h2></div>
<div class="tag-list">
<a v-for="tag in tags" :key="tag.name" href="/archive">#{{ tag.name }} <em>{{ tag.count }}</em></a>
</div>
</section>
</div>

</div>
</div>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { data as posts } from '.vitepress/theme/posts.data.mts'
import { data as galleries } from '.vitepress/theme/gallery.data.mts'
import { fetchLikeSummary, likeArticle } from '.vitepress/theme/api'
import Carousel from '.vitepress/theme/components/Carousel.vue'
import TextCarousel from '.vitepress/theme/components/TextCarousel.vue'

/* ---------------- 轮播配置 ---------------- */
const carouselSlides = [
  { image: '/images/ava.jpg', text: '📚 记录技术与生活' },
  { image: '/images/my.jpg', text: '☀️ 保持好奇，持续学习' },
  { image: '/images/you.jpg', text: '🌱 一起慢慢成长' },
  { image: '/images/we.jpg', text: '🎂 把平凡的日子过得有趣' },
]

const textCarouselItems = [
  { text: '记录技术，也记录生活里的小事' },
  { text: '把学到的东西写下来，才算真的学会' },
  { text: '慢慢写，慢慢整理，慢慢长大' },
  { text: '保持好奇，保持耐心，保持热爱' },
  { text: '愿这里的文字，能给你一点帮助' },
  { text: '想到什么就写什么，不必完美' },
]

/* ---------------- 文章列表 ---------------- */
const recentPosts = computed(() => posts.slice(0, 6))

const recentAlbums = computed(() => galleries.filter((album) => album.cover).slice(0, 3))
const galleryPhotoCount = computed(() =>
  galleries.reduce((sum, album) => sum + album.photoCount, 0),
)
const emptyGallerySlots = computed(() => Math.max(0, 3 - recentAlbums.value.length))

const pad = (n) => String(n).padStart(2, '0')

const fmtDate = (time) => {
  const d = new Date(time)
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

const tags = computed(() => {
  const map = new Map()
  posts.forEach((post) => {
    ;(post.tags || []).forEach((tag) => {
      map.set(tag, (map.get(tag) || 0) + 1)
    })
  })
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))
})

/* ---------------- 首页点赞 ---------------- */
const likeInfo = ref({})
const likeBusy = ref('')
const likeTip = ref('')

const likeOf = (url) => likeInfo.value[url] || { count: 0, liked: false }

const loadLikes = async () => {
  const keys = recentPosts.value.map((post) => post.url)
  if (!keys.length) return

  try {
    const data = await fetchLikeSummary(keys)
    likeInfo.value = data.items || {}
  } catch (error) {
    console.error('[Home] 加载点赞数失败:', error)
  }
}

const likePost = async (post) => {
  const current = likeOf(post.url)
  if (current.liked || likeBusy.value) return

  likeBusy.value = post.url
  likeTip.value = ''

  try {
    const data = await likeArticle(post.url)
    likeInfo.value = {
      ...likeInfo.value,
      [post.url]: { count: data.count, liked: true },
    }
  } catch (error) {
    const err = error as Error & { status?: number }
    if (err?.status === 409) {
      await loadLikes()
    } else {
      likeTip.value = err instanceof Error ? err.message : '点赞失败，请稍后再试'
    }
  } finally {
    likeBusy.value = ''
  }
}

/* ---------------- 时钟 ---------------- */
const clockTime = ref('--:--:--')
const clockDate = ref('加载中…')
const clockWeek = ref('')
const greeting = ref('你好')

const greetOf = (hour) => {
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 22) return '晚上好'
  return '夜深了'
}

/* ---------------- 日历 ---------------- */
const weekLabels = ['一', '二', '三', '四', '五', '六', '日']
const calTitle = ref('日历')
const calDays = ref([])
const calKey = ref('')

const calendarCells = computed(() =>
  calDays.value.length ? calDays.value : Array.from({ length: 42 }, () => ({ day: '' })),
)

const buildCalendar = (now) => {
  const key = `${now.getFullYear()}-${now.getMonth()}`
  if (key === calKey.value) return
  calKey.value = key

  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push({ day: '' })
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, today: d === now.getDate() })
  }
  while (cells.length % 7 !== 0) cells.push({ day: '' })

  calDays.value = cells
  calTitle.value = `${year}年 ${month + 1}月`
}

let timer = null

const tick = () => {
  const now = new Date()
  clockTime.value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  clockDate.value = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
  clockWeek.value = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()]
  greeting.value = greetOf(now.getHours())
  buildCalendar(now)
}

onMounted(() => {
  tick()
  loadLikes()
  timer = setInterval(tick, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
