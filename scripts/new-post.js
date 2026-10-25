#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 获取命令行参数
const args = process.argv.slice(2)
let title = ''

// 解析参数
for (let i = 0; i < args.length; i++) {
  if (!args[i].startsWith('--')) {
    title = args[i]
  }
}

// 如果没有提供标题，提示用户
if (!title) {
  console.error('❌ 请提供日记标题')
  console.error('用法: npm run new-post "日记标题"')
  console.error('示例:')
  console.error('  npm run new-post "第一次约会"')
  process.exit(1)
}

// 获取当前日期
const now = new Date()
const year = now.getFullYear()
const month = String(now.getMonth() + 1).padStart(2, '0')
const day = String(now.getDate()).padStart(2, '0')
const dateStr = `${year}-${month}-${day}`

const postsBaseDir = path.join(
  __dirname,
  '..',
  'docs',
  'posts',
)

const targetDir = path.join(
  postsBaseDir,
  year.toString(),
  month.toString(),
  day.toString(),
)

// 创建目录
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
  console.log(
    `📁 创建目录: ${path.relative(process.cwd(), targetDir)}`,
  )
}

// 处理文件名（将标题转换为合法的文件名）
const sanitizeTitle = (str) => {
  return str
    .replace(/[\\/:*?"<>|]/g, '') // 移除非法字符
    .replace(/\s+/g, '-') // 空格转连字符
    .substring(0, 100) // 限制长度
}

const fileName = `${sanitizeTitle(title)}.md`
const filePath = path.join(targetDir, fileName)

// 检查文件是否已存在
if (fs.existsSync(filePath)) {
  console.error(
    `❌ 文件已存在: ${path.relative(process.cwd(), filePath)}`,
  )
  process.exit(1)
}

// 生成 Frontmatter
const getTags = () => {
  // 可以扩展：从命令行读取 tags
  return ['日记']
}

const frontmatter = `---
title: ${title}
date: ${dateStr}
tags:
${getTags()
  .map((tag) => `  - ${tag}`)
  .join('\n')}
---

# ${title}

<!-- DESC SEP -->

简介

<!-- DESC SEP -->

---

## 

`
// 写入文件
fs.writeFileSync(filePath, frontmatter, 'utf8')
console.log(
  `✅ 创建文件: ${path.relative(process.cwd(), filePath)}`,
)
console.log(`📝 打开编辑: ${filePath}`)
