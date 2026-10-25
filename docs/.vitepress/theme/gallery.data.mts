import { createContentLoader } from 'vitepress'

export interface Gallery {
  title: string
  url: string
  date: {
    time: number
    string: string
    year: string
    monthDay: string
  }
  category: string
  photos: string[]
  cover?: string
  photoCount: number
  excerpt: string | undefined
}

export declare const data: Gallery[]

/**
 * 取相册正文里的第一段文字作为卡片简介。
 * 生成脚本会在描述后插入 <!-- more -->，这里也兼容没有标记的旧文件。
 */
function excerptFn(file: { content?: string; excerpt?: string }) {
  const content = String(file.content || '').replace(/^---[\s\S]*?---\s*/, '')
  const before = content.split('<!-- more -->')[0]
  const text = before
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

  file.excerpt = text || undefined
}

function formatDate(raw: string | undefined): Gallery['date'] {
  const date = new Date(raw || Date.now())
  date.setUTCHours(12)
  return {
    time: +date,
    string: date.toLocaleDateString('zh-Hans', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }),
    year: date.toLocaleDateString('zh-Hans', { year: 'numeric' }),
    monthDay: date.toLocaleDateString('zh-Hans', {
      month: '2-digit',
      day: '2-digit',
    }),
  }
}

export default createContentLoader('gallery/**/*.md', {
  excerpt: excerptFn,
  transform(raw): Gallery[] {
    return raw
      .filter(({ frontmatter }) => frontmatter.layout !== 'page')
      .map(({ url, frontmatter, excerpt }) => {
        const photos: string[] = Array.isArray(frontmatter.photos)
          ? frontmatter.photos
          : []

        return {
          title: frontmatter.title || '未命名相册',
          url,
          excerpt,
          date: formatDate(frontmatter.date),
          category: frontmatter.category || '未分类',
          photos,
          cover: frontmatter.cover || photos[0],
          photoCount: photos.length,
        }
      })
      .sort((a, b) => b.date.time - a.date.time)
  },
})
