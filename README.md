# YuJian 博客

个人博客：VitePress 静态站点 + 自建 Node 接口 + MySQL 存评论 / 备忘录，部署在自己的服务器（宝塔）上，不依赖 Vercel、Supabase。

## 技术栈

- **站点**：VitePress 2 + Vue 3 + TDesign，本地搜索（构建时生成索引，不依赖 Algolia）
- **接口**：Node.js 18+ / Express 4 / mysql2（`server/`）
- **数据库**：MySQL 5.7 / 8.0，两张表 `comments`、`notes`

## 目录结构

```
my-blog/
├── docs/                        # 站点内容
│   ├── posts/YYYY/MM/DD/        # 文章（Markdown）
│   ├── gallery/                 # 相册（每本一个 Markdown）
│   ├── public/images/           # 图片（/images/...）
│   ├── .vitepress/              # 配置 + 主题 + 组件
│   ├── index.md                 # 首页
│   ├── gallery.md               # 相册列表
│   ├── archive.md               # 归档
│   ├── note.md                  # 备忘录
│   └── about.md                 # 关于
├── server/                      # 评论 / 备忘录接口
│   ├── app.js                   # 入口
│   ├── .env                     # MySQL 配置（不入库）
│   ├── .env.example             # 配置模板
│   └── sql/schema.sql           # 建表脚本
├── scripts/
│   ├── new-post.js              # pnpm new 用的建文章脚本
│   ├── new-gallery.js           # pnpm new:gallery 用的建相册脚本
│   └── cleanup.js               # 清理无用文件 / 旧构建产物
├── DEPLOY-BT.md                 # 宝塔部署指南
└── package.json
```

## 本地开发

```bash
pnpm install
pnpm run docs:dev        # http://localhost:5173
```

需要评论 / 备忘录时再启动接口：

```bash
cd server
cp .env.example .env     # Windows: copy .env.example .env
# 编辑 .env 里的 MySQL 连接信息
npm install
node app.js              # http://localhost:3001
```

`docs:dev` 会把 `/api` 代理到 `127.0.0.1:3001`，前端不需要额外配置。

## 写文章

```bash
pnpm new "文章标题"
```

会在 `docs/posts/年份/月/日/` 下生成 Markdown，frontmatter 模板：

```yaml
---
title: 文章标题
date: 2026-10-25
tags:
  - 日记
---

# 文章标题

<!-- DESC SEP -->

这里是首页列表显示的摘要

<!-- DESC SEP -->
```

图片：安装 VS Code 插件 `Paste Image`（配置见 `.vscode/settings.json`），
粘贴后图片会放到 `docs/public/images/<文章名>/`，引用路径为 `/images/<文章名>/xxx.png`。

## 相册

相册页在 `/gallery`，会按分类筛选；卡片封面取相册 `photos` 里的第一张。

1. 把图片放到 `docs/public/images/gallery/<相册名>/`
2. 运行：

```bash
pnpm new:gallery "公园散步" --category "日常" --image-dir "images/gallery/公园散步"
```

会生成 `docs/gallery/日常/公园散步.md`，自动写入 `photos` 字段和正文图片。

也可以手动指定图片：

```bash
pnpm new:gallery "生日" --category "生活" --photos "/images/gallery/生日/1.jpg,/images/gallery/生日/2.jpg"
```

生成后编辑 Markdown 里的描述、日期即可；首页「生活碎片」卡片底部会自动显示相册入口和最近相册封面。

> 仓库里附带了一个示例相册 `docs/gallery/日常/日常碎片.md`，可以直接修改或删除。

## 构建

```bash
pnpm run docs:build      # 产物：docs/.vitepress/dist
pnpm run docs:preview    # 本地预览构建结果
```

## 数据库

建表用 [server/sql/schema.sql](server/sql/schema.sql)，会创建三张表：

- `comments`：评论（记录发表者 IP，服务端据此判断「只能删除自己的评论」）
- `notes`：备忘录
- `likes`：文章点赞（同一 IP 对同一篇文章只能赞一次，每个 IP 每天最多 10 次）

已经部署过旧版（只有 comments/notes）的数据库，执行一次
[server/sql/migrate-add-ip-likes.sql](server/sql/migrate-add-ip-likes.sql) 升级。

MySQL 连接信息写在 [server/.env](server/.env)：

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=my_blog
DB_USER=my_blog
DB_PASSWORD=改成你的数据库密码
```

## 部署

完整的宝塔面板部署步骤（建库、Node 项目、Nginx 反代、SSL）见 [DEPLOY-BT.md](DEPLOY-BT.md)。

## 清理

```bash
node scripts/cleanup.js          # 删除无用文件与旧构建产物
node scripts/cleanup.js --deps   # 连 node_modules 一起删，之后重新 pnpm install
```
