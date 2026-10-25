<template>
  <div class="gallery-page">
    <header class="gallery-head">
      <div class="gallery-heading">
        <h1>相册</h1>
        <p>把日子装进照片里 · {{ galleries.length }} 本相册 / {{ totalPhotos }} 张照片</p>
      </div>
      <a class="gallery-home" href="/">← 回到首页</a>
    </header>

    <div v-if="galleries.length" class="gallery-filters">
      <button
        class="gallery-filter"
        :class="{ active: activeCategory === '全部' }"
        @click="activeCategory = '全部'"
      >
        全部 <span>{{ galleries.length }}</span>
      </button>
      <button
        v-for="cat in categories"
        :key="cat"
        class="gallery-filter"
        :class="{ active: activeCategory === cat }"
        @click="activeCategory = cat"
      >
        {{ cat }} <span>{{ countOf(cat) }}</span>
      </button>
    </div>

    <div v-if="filtered.length" class="gallery-grid">
      <a
        v-for="album in filtered"
        :key="album.url"
        class="gallery-card"
        :href="album.url"
      >
        <div class="gallery-cover">
          <img
            v-if="album.cover"
            :src="album.cover"
            :alt="album.title"
            loading="lazy"
          />
          <div v-else class="gallery-cover-placeholder">📷</div>
          <span class="gallery-count">{{ album.photoCount }} 张</span>
          <span class="gallery-category">{{ album.category }}</span>
        </div>
        <div class="gallery-body">
          <h2 class="gallery-title">{{ album.title }}</h2>
          <div class="gallery-meta">{{ album.date.string }}</div>
          <p v-if="album.excerpt" class="gallery-excerpt">{{ cleanExcerpt(album) }}</p>
        </div>
      </a>
    </div>

    <div v-else-if="!galleries.length" class="gallery-empty">
      <div class="gallery-empty-icon">🖼️</div>
      <p>还没有相册</p>
      <span>
        运行 <code>pnpm new:gallery "相册标题" --image-dir "images/你的文件夹"</code>
        创建第一本
      </span>
    </div>

    <div v-else class="gallery-empty">
      <div class="gallery-empty-icon">🖼️</div>
      <p>这个分类下还没有相册</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { data as galleries } from '../gallery.data.mts'

const activeCategory = ref('全部')

const categories = computed(() =>
  [...new Set(galleries.map((album) => album.category))].sort((a, b) =>
    a.localeCompare(b, 'zh-Hans'),
  ),
)

const filtered = computed(() =>
  activeCategory.value === '全部'
    ? galleries
    : galleries.filter((album) => album.category === activeCategory.value),
)

const totalPhotos = computed(() =>
  galleries.reduce((sum, album) => sum + album.photoCount, 0),
)

const countOf = (category: string) =>
  galleries.filter((album) => album.category === category).length

/** 兼容 excerpt 为 HTML 的情况，并去掉开头重复的相册标题 */
function cleanExcerpt(album: { title: string; excerpt?: string }) {
  let text = String(album.excerpt || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&ZeroWidthSpace;/g, ' ')
    .replace(/&[a-zA-Z]+;/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (text.startsWith(album.title)) {
    text = text.slice(album.title.length).trim()
  }

  return text
}
</script>

<style scoped>
.gallery-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 36px 24px 80px;
}

.gallery-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.gallery-heading h1 {
  margin: 0;
  font-size: 2rem;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
}

.gallery-heading p {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.gallery-home {
  flex-shrink: 0;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.dark .gallery-home {
  background: rgba(255, 255, 255, 0.05);
}

.gallery-home:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-brand-soft);
}

.gallery-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}

.gallery-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: rgba(255, 255, 255, 0.6);
  color: var(--vp-c-text-2);
  font-size: 12px;
  cursor: pointer;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.dark .gallery-filter {
  background: rgba(255, 255, 255, 0.05);
}

.gallery-filter span {
  opacity: 0.6;
}

.gallery-filter:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-brand-soft);
}

.gallery-filter.active {
  color: #ffffff;
  border-color: transparent;
  background: linear-gradient(135deg, var(--fresh-brand), var(--fresh-cyan));
  box-shadow: 0 10px 22px -14px rgba(31, 169, 146, 0.9);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.gallery-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 26px;
  background: var(--fresh-card);
  border: 1px solid var(--fresh-card-border);
  box-shadow: 0 26px 60px -52px rgba(31, 111, 100, 0.55);
  text-decoration: none;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.dark .gallery-card {
  background: rgba(20, 38, 39, 0.55);
  border-color: rgba(120, 220, 200, 0.1);
}

.gallery-card:hover {
  transform: translateY(-4px);
  border-color: var(--vp-c-brand-2);
  box-shadow: 0 32px 70px -50px rgba(31, 111, 100, 0.6);
}

.gallery-cover {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(53, 191, 171, 0.18), rgba(31, 201, 231, 0.12));
}

.gallery-cover img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.gallery-card:hover .gallery-cover img {
  transform: scale(1.04);
}

.gallery-cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 42px;
  opacity: 0.6;
}

.gallery-count {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(8, 45, 40, 0.42);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #ffffff;
  font-size: 11px;
}

.gallery-category {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 1;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--fresh-brand-deep);
  font-size: 11px;
}

.dark .gallery-category {
  background: rgba(20, 38, 39, 0.7);
  color: #7feadd;
}

.gallery-body {
  padding: 16px 18px 18px;
}

.gallery-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.gallery-card:hover .gallery-title {
  color: var(--vp-c-brand-1);
}

.gallery-meta {
  font-size: 11px;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}

.gallery-excerpt {
  display: -webkit-box;
  overflow: hidden;
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.gallery-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 70px 20px;
  border-radius: 26px;
  border: 1px dashed var(--vp-c-divider);
  background: rgba(255, 255, 255, 0.35);
  text-align: center;
  color: var(--vp-c-text-3);
}

.dark .gallery-empty {
  background: rgba(255, 255, 255, 0.03);
}

.gallery-empty-icon {
  margin-bottom: 10px;
  font-size: 40px;
}

.gallery-empty p {
  margin: 0 0 6px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.gallery-empty span {
  font-size: 12px;
}

.gallery-empty code {
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

@media (max-width: 640px) {
  .gallery-page {
    padding: 20px 14px 60px;
  }

  .gallery-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .gallery-heading h1 {
    font-size: 1.6rem;
  }

  .gallery-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}
</style>
