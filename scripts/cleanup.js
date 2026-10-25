/**
 * 项目清理脚本
 *
 * 用法（在项目根目录）：
 *   node scripts/cleanup.js          # 删除无用文件 + 旧构建产物
 *   node scripts/cleanup.js --deps   # 额外删掉 node_modules（之后需要重新 pnpm install）
 *
 * 只会删除下面 TARGETS 里列出的路径，不会碰源码、文章、图片素材。
 * 建议先停掉 `pnpm run docs:dev` 再运行。
 */
import { existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

/** 需要清理的路径（相对项目根目录） */
const TARGETS = [
  // ---- 已下线的 Supabase 相关 ----
  'supabase',
  'docs/.vitepress/theme/supabase.ts',

  // ---- 已下线的相册功能 ----
  'docs/gallery.md',
  'docs/gallery',
  'scripts/new-gallery.js',
  'docs/.vitepress/theme/components/GalleryViewer.vue',
  'docs/.vitepress/theme/gallery.data.mts',

  // ---- 未被引用的组件 / 工具 ----
  'docs/.vitepress/theme/components/Comment-Giscus.vue',
  'docs/.vitepress/theme/utils/createSideBar.ts',
  'docs/.vitepress/config/site.ts',

  // ---- 未被引用的图片 ----
  'docs/public/images/hand-in-hand.jpg',

  // ---- 旧构建产物 / 缓存（构建时会自动重新生成）----
  'docs/.vitepress/cache',
  'docs/.vitepress/dist',
]

if (process.argv.includes('--deps')) {
  TARGETS.push('node_modules')
}

console.log('项目根目录:', root)
console.log('待清理项:', TARGETS.length, '\n')

let removed = 0
let skipped = 0

for (const relative of TARGETS) {
  const absolute = path.resolve(root, relative)

  // 安全检查：只允许删除项目目录内的路径
  if (absolute !== root && !absolute.startsWith(root + path.sep)) {
    console.warn('⚠️ 跳过（不在项目目录内）:', relative)
    skipped++
    continue
  }

  if (!existsSync(absolute)) {
    console.log('跳过（不存在）:', relative)
    skipped++
    continue
  }

  try {
    rmSync(absolute, { recursive: true, force: true })
    console.log('已删除:', relative)
    removed++
  } catch (error) {
    console.error('删除失败:', relative, '-', error.message)
    skipped++
  }
}

console.log(`\n完成：删除 ${removed} 项，跳过 ${skipped} 项。`)

if (process.argv.includes('--deps')) {
  console.log('node_modules 已删除，请重新安装依赖：pnpm install')
} else {
  console.log('提示：outDir(dist) 被清掉了，需要重新 pnpm build 才能部署。')
  console.log('     如需连 node_modules 一起清理：node scripts/cleanup.js --deps && pnpm install')
}
