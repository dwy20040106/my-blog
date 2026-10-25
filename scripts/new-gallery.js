#!/usr/bin/env node
/**
 * 新建相册
 *
 * 用法：
 *   pnpm new:gallery "相册标题"
 *   pnpm new:gallery "公园散步" --category "日常" --image-dir "images/gallery/公园散步"
 *   pnpm new:gallery "生日" --photos "/images/birthday/1.jpg,/images/birthday/2.jpg"
 *
 * 选项：
 *   --category "分类"     相册分类（默认：未分类）
 *   --image-dir "路径"    自动扫描 docs/public/<路径> 下的图片
 *   --photos "a,b"        手动指定图片路径（以 / 开头的 public 路径）
 *   --date "2026-10-26"   指定日期（默认今天）
 *   --force               文件已存在时覆盖
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.svg',
  '.avif',
])

let title = ''
let category = '未分类'
let imageDir = ''
let photos = []
let date = ''
let force = false

const args = process.argv.slice(2)
for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--category') {
    category = args[++i] || category
  } else if (arg === '--image-dir') {
    imageDir = args[++i] || ''
  } else if (arg === '--photos') {
    photos = (args[++i] || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  } else if (arg === '--date') {
    date = args[++i] || ''
  } else if (arg === '--force') {
    force = true
  } else if (!arg.startsWith('--')) {
    title = arg
  }
}

if (!title) {
  console.error('❌ 请提供相册标题')
  console.error('\n用法: pnpm new:gallery "相册标题" [选项]')
  console.error('\n示例:')
  console.error('  pnpm new:gallery "公园散步"')
  console.error('  pnpm new:gallery "公园散步" --category "日常" --image-dir "images/gallery/公园散步"')
  console.error('  pnpm new:gallery "生日" --photos "/images/birthday/1.jpg,/images/birthday/2.jpg"')
  process.exit(1)
}

const now = new Date()
const pad = (n) => String(n).padStart(2, '0')
const defaultDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

function safeName(value, fallback) {
  const name = String(value || '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .trim()
  return name.slice(0, 100) || fallback
}

function toPublicPath(value) {
  const cleaned = String(value || '').replace(/\\/g, '/').trim()
  if (!cleaned) return ''
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`
}

let photoNames = []

// 扫描 docs/public 下的图片目录
if (imageDir) {
  const relativeDir = imageDir.replace(/^\/+/, '')
  const publicDir = path.join(root, 'docs', 'public', relativeDir)

  if (!fs.existsSync(publicDir)) {
    console.error(`❌ 图片目录不存在: ${publicDir}`)
    console.error(`   请先把图片放到 docs/public/${relativeDir}/ 下`)
    process.exit(1)
  }

  const files = fs
    .readdirSync(publicDir)
    .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  if (!files.length) {
    console.error(`❌ 目录里没有图片: ${publicDir}`)
    process.exit(1)
  }

  photos = files.map((file) => toPublicPath(`${relativeDir}/${file}`))
  photoNames = files.map((file) => path.basename(file, path.extname(file)))

  console.log(`📸 扫描到 ${photos.length} 张图片：`)
  files.forEach((file) => console.log(`   ${file}`))
}

photos = photos.map(toPublicPath).filter(Boolean)

if (!photoNames.length && photos.length) {
  photoNames = photos.map((photo) => path.basename(photo, path.extname(photo)))
}

const categorySafe = safeName(category, '未分类')
const titleSafe = safeName(title, '未命名相册')
const targetDir = path.join(root, 'docs', 'gallery', categorySafe)
const filePath = path.join(targetDir, `${titleSafe}.md`)

if (fs.existsSync(filePath) && !force) {
  console.error(`❌ 相册已存在: ${path.relative(root, filePath)}`)
  console.error('   如需覆盖，请加 --force')
  process.exit(1)
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
  console.log(`📁 创建目录: ${path.relative(root, targetDir)}`)
}

const photosYaml = photos.length
  ? photos.map((photo) => `  - ${JSON.stringify(photo)}`).join('\n')
  : '  # 在这里添加图片路径，每行一个\n  # - /images/gallery/你的相册/1.jpg'

const bodyImages = photos.length
  ? `\n\n## 照片\n\n${photos
      .map((photo, index) => `![${photoNames[index] || ''}](${photo})`)
      .join('\n\n')}\n`
  : '\n<!-- 把图片放到 docs/public/images/gallery/...，再把路径填到 photos 字段 -->\n'

const content = `---
title: ${JSON.stringify(title)}
date: ${date || defaultDate}
category: ${JSON.stringify(category)}
isNoComment: true
photos:
${photosYaml}
---

# ${title}

在这里写下这本相册的故事…

<!-- more -->${bodyImages}
`

fs.writeFileSync(filePath, content, 'utf8')

console.log('\n✅ 相册创建成功')
console.log(`📄 文件: ${path.relative(root, filePath).replace(/\\/g, '/')}`)
console.log(`📷 图片: ${photos.length} 张`)

if (!photos.length) {
  console.log('\n💡 还没有图片，两种方式：')
  console.log('   1. 把图片放到 docs/public/images/gallery/你的相册/，然后：')
  console.log(`      pnpm new:gallery "${title}" --category "${category}" --image-dir "images/gallery/你的相册" --force`)
  console.log('   2. 直接编辑文件，在 photos 字段里逐行添加图片路径')
}

console.log('\n下一步：pnpm run docs:dev 预览相册')
