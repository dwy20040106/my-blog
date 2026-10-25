# 宝塔面板部署指南（Node + MySQL + Nginx）

> 目标：**不用 Vercel、不用 Supabase**。VitePress 构建出的静态站交给 Nginx，
> 评论 / 备忘录走本机 Node 接口，数据存本机 MySQL。

---

## 0. 改造后的项目结构

```
my-blog/
├── docs/                        # VitePress 源码，构建产物在 docs/.vitepress/dist
│   └── .vitepress/
│       ├── config/              # 站点配置
│       └── theme/
│           ├── api.ts           # 评论 / 备忘录接口客户端
│           └── components/      # Comment / CommentItem / NotePanel 调用 api.ts
├── server/                      # ★ 新增：Node 接口服务
│   ├── app.js                   # 入口（Express）
│   ├── config.js                # 读取 server/.env
│   ├── db.js                    # mysql2 连接池
│   ├── routes/
│   │   ├── comments.js          # 评论接口（记录 IP，只能删自己的）
│   │   ├── notes.js             # 备忘录接口
│   │   └── likes.js             # 点赞接口（IP 去重 + 每日上限）
│   ├── middleware/              # 限流、可选管理员令牌
│   ├── sql/schema.sql           # ★ MySQL 建表脚本
│   ├── .env                     # ★ 数据库配置（已在 .gitignore，不会提交）
│   ├── .env.example             # 配置模板
│   └── package.json
└── package.json                 # 已移除 @supabase/supabase-js
```

接口一览：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查（会 ping 一次数据库） |
| GET | `/api/comments?article_key=/posts/xxx` | 评论列表（含 `is_mine`，不返回 IP） |
| POST | `/api/comments` | 发表评论 / 回复（记录来源 IP） |
| DELETE | `/api/comments/:id` | 删除评论（只能删本 IP 的，管理员令牌除外） |
| GET | `/api/notes?article_key=/note` | 备忘录列表（自动过滤软删除） |
| POST | `/api/notes` | 新增备忘录 |
| PATCH | `/api/notes/:id` | 修改星级 / 软删除 / 内容 |
| POST | `/api/notes/batch-delete` | 批量软删除 |
| GET | `/api/likes?article_key=/posts/xxx` | 点赞数 / 当前 IP 是否已赞 / 今日已赞次数 |
| POST | `/api/likes` | 点赞（同 IP 同文章仅一次，每 IP 每天最多 10 次） |

---

## 1. 服务器环境准备

宝塔面板 → 软件商店，确认已安装：

- **Node.js 版本管理器**：安装 Node **18 或 20 LTS**（接口用到 ESM，Node ≥ 18）
- **MySQL**：5.7 或 8.0
- **Nginx**
- （推荐）**PM2 管理器**

> 代码建议放在 `/www/wwwroot/my-blog`。

---

## 2. 创建数据库并导入表

### 2.1 建库

宝塔 → **数据库** → **添加数据库**：

| 项 | 值 |
| --- | --- |
| 数据库名 | `my_blog` |
| 用户名 | `my_blog` |
| 密码 | 自己生成一个强密码（记下来） |
| 访问权限 | 本地服务器（若后端连不上，改为「所有人」或额外添加 `127.0.0.1`） |
| 字符集 | **utf8mb4** |

### 2.2 导入表结构

两种方式任选：

**方式 A：phpMyAdmin**
宝塔 → 数据库 → 点 `my_blog` 的「管理」打开 phpMyAdmin → 选中 `my_blog` → 导入 →
上传 `server/sql/schema.sql` → 执行。

**方式 B：命令行**
```bash
mysql -u my_blog -p my_blog < /www/wwwroot/my-blog/server/sql/schema.sql
```

执行完会得到三张表：

- `comments`：评论（`id` / `article_key` / `author` / `ip` / `content` / `parent_id` / `root_id` / `created_at`）
- `notes`：备忘录（`id` / `article_key` / `category` / `content` / `rating` / `is_deleted` / `created_at`）
- `likes`：点赞（`id` / `article_key` / `ip` / `created_at`，`(article_key, ip)` 唯一）

> 如果之前已经部署过旧版（只有 `comments`、`notes`），执行一次
> `server/sql/migrate-add-ip-likes.sql` 升级即可；新装库直接用 `schema.sql`。
> 升级前的旧评论 `ip` 为空，只有配置了 `ADMIN_TOKEN` 的管理员能删除。

> 字符集必须是 `utf8mb4`，否则评论里的 emoji 会报错或变问号。

---

## 3. 配置 `server/.env`

文件已经生成：`server/.env`，只需要改 MySQL 那几行：

```dotenv
PORT=3001
HOST=0.0.0.0

DB_HOST=127.0.0.1          # 数据库和网站同一台服务器就用 127.0.0.1
DB_PORT=3306
DB_NAME=my_blog            # 第 2 步创建的库名
DB_USER=my_blog            # 第 2 步创建的用户名
DB_PASSWORD=你的数据库密码   # ★ 必须改
DB_CONNECTION_LIMIT=10

CORS_ORIGIN=               # 同域部署留空即可
ADMIN_TOKEN=               # 可选：配置后管理员可删任意评论（X-Admin-Token）
WRITE_RATE_WINDOW_MS=60000 # 每个 IP 每分钟最多写 20 次
WRITE_RATE_MAX=20
LIKE_DAILY_LIMIT=10        # 每个 IP 每天最多点赞次数
SERVE_STATIC=false
STATIC_DIR=../docs/.vitepress/dist
```

> `.env` 已被 `.gitignore` 忽略，不会进仓库。首次克隆代码后如果文件不存在，
> 执行 `cp .env.example .env` 再改。
>
> 密码里如果带 `#`、空格、引号等特殊字符，用引号包起来，例如 `DB_PASSWORD="a#b 123"`。

---

## 4. 安装依赖并本地试跑

```bash
cd /www/wwwroot/my-blog/server
npm install --omit=dev
node app.js
```

看到下面两行说明启动成功：

```
[api] 已启动: http://0.0.0.0:3001
[api] 数据库: 127.0.0.1:3306/my_blog
```

另开一个终端验证：

```bash
curl http://127.0.0.1:3001/api/health
# {"ok":true,"time":"..."}   ← 说明 MySQL 连通
```

确认无误后 `Ctrl + C` 停掉，交给 PM2 托管。

---

## 5. 用宝塔托管 Node 接口

宝塔 → **网站** → **Node 项目** → **添加 Node 项目**：

| 项 | 值 |
| --- | --- |
| 项目名称 | `my-blog-api` |
| 项目目录 | `/www/wwwroot/my-blog/server` |
| 启动选项 | `app.js`（或启动命令 `npm start`） |
| 项目端口 | `3001` |
| 运行方式 | **PM2** |
| Node 版本 | 18 / 20 |

保存后看项目日志，应出现 `[api] 已启动`。

也可以用命令行：

```bash
cd /www/wwwroot/my-blog/server
pm2 start ecosystem.config.cjs   # 已附带 PM2 配置（单实例、日志、自动重启）
pm2 save
```

> 端口必须是 `3001`（和 `.env` 的 `PORT`、Nginx 反代目标一致）。
> 宝塔「安全」里**不需要**放行 3001，Nginx 走内网访问即可。
>
> 限流是进程内存实现，所以 PM2 保持**单实例**（`instances: 1`），
> 多实例时限流会各算各的，但功能不受影响。

---

## 6. 构建前端静态站

```bash
cd /www/wwwroot/my-blog
pnpm install       # 或 npm install
pnpm build         # 等价于 vitepress build docs
```

构建产物：`docs/.vitepress/dist`（里面有 `index.html`、`feed.xml`、`sitemap.xml` 等）。

> 仓库里的 `pnpm-lock.yaml` 还是改动前的（已移除 `@supabase/supabase-js`），
> 所以**第一次安装不要加 `--frozen-lockfile`**，让包管理器自动同步即可。
> 服务器内存小于 1G 时构建可能 OOM，可先加 swap，或：
> `NODE_OPTIONS=--max-old-space-size=2048 pnpm build`。

---

## 7. 配置 Nginx（关键）

宝塔 → 网站 → 你的站点 → **设置** → **配置文件**，把 `server { ... }` 里的 `root` 改成产物目录，
并加上 `/api/` 反代：

```nginx
server {
    listen 80;
    server_name www.your-domain.com;

    # ★ 指向构建产物，不要指向 docs/
    root /www/wwwroot/my-blog/docs/.vitepress/dist;
    index index.html;

    # VitePress 的 cleanUrls：/posts/foo → /posts/foo.html
    location / {
        try_files $uri $uri.html $uri/ =404;
    }

    # ★ 评论 / 备忘录接口反代到 Node
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # 静态资源缓存（可选）
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|webp|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public";
    }
}
```

保存后 **重载 Nginx**。

> 注意：`proxy_pass` 结尾不要带 `/`，否则 `/api/comments` 会被改写成 `/comments`。
> 宝塔站点配置里默认自带的 `root` 行只改一次，不要重复添加。
> 如果配置里已经存在 `location ~* \.(js|css|png...)$` 之类的静态资源缓存规则，
> 合并保留一份即可，不必重复写。
>
> 不想改配置文件的话，也可以用图形界面：
> **网站 → 设置 → 反向代理 → 添加反向代理**，代理名称填 `api`，
> 目标 URL 填 `http://127.0.0.1:3001`，发送域名填 `$host`（代理目录默认为 `/`，
> 生成的规则与上面的 `location /api/` 等价）。

---

## 8. 绑定域名 + HTTPS

1. 宝塔 → 网站 → 设置 → **域名管理**，绑定你的域名并解析。
2. 设置 → **SSL** → Let's Encrypt 申请证书 → 开启**强制 HTTPS**。
3. 前端用的是相对路径 `/api/...`，切换 https 后无需重新构建。

---

## 9. 上线验证清单

- [ ] `https://你的域名/` 首页、文章、归档正常（相册已下线）
- [ ] 文章底部能发表评论，刷新后仍在（`SELECT * FROM comments;` 有数据）
- [ ] 自己发的评论有删除按钮，别人的评论没有；换个网络/IP 后自己的旧评论也不可删
- [ ] 回复评论能折叠显示，删除父评论后子评论一起消失
- [ ] 文章点赞按钮显示数量；同一 IP 再点显示「已点赞」，当天第 11 次会提示上限
- [ ] `/note` 页能新增备忘录、点星星改评分、删除后不再出现
- [ ] `https://你的域名/api/health` 返回 `{"ok":true}`
- [ ] 手机端评论区 / 备忘录布局正常

---

## 10. 修改站点域名 / 站名

目前全站品牌已统一为 **YuJian**、域名 **https://codeflagai.top**。
以后换域名 / 换站名时，改这几处：

- `docs/.vitepress/config/zh.ts` → `title`、页脚 `footer.message`
- `docs/.vitepress/config/shared.ts` → `sitemap.hostname`
- `docs/.vitepress/theme/utils/rss.ts` → `hostname`、`copyright`、作者名
- `docs/.vitepress/theme/utils/handleHeadMeta.ts` → `addBase()` 里的 `host`
- `package.json` → `name`

改完重新 `pnpm build`。

---

## 11. 日常更新流程

```bash
cd /www/wwwroot/my-blog
git pull
pnpm install        # 依赖有变化时才需要
pnpm build          # 重新生成 dist
```

后端代码有改动时，在宝塔 Node 项目里点**重启**（或 `pm2 restart my-blog-api`）。

建议把上面三行做成一个 `deploy.sh`，以后一键更新。

---

## 12. 常见问题

| 现象 | 原因 / 解决 |
| --- | --- |
| 页面 502 | Node 没启动或端口不对：`pm2 logs my-blog-api`；确认 `.env` 的 `PORT=3001` |
| 评论一直「加载评论中…」或 404 | Nginx 没配 `/api/` 反代；确认 `location /api/` 且 `proxy_pass` 结尾无 `/` |
| `Access denied for user` | 密码错，或数据库用户只允许 `localhost`。宝塔数据库里把权限改成「所有人」，或确认 `DB_HOST=127.0.0.1` |
| `Unknown database 'my_blog'` | 库名和 `.env` 不一致，或没导入 `schema.sql` |
| emoji 变 `???` | 库 / 表 / 连接字符集不是 utf8mb4；重导 `schema.sql`，连接串已固定 utf8mb4 |
| 删除评论返回 403 | `server/.env` 配了 `ADMIN_TOKEN`，但前端没配 `VITE_ADMIN_TOKEN`（见下节） |
| 发表评论提示 429 | 触发了限流，调大 `.env` 的 `WRITE_RATE_MAX` 或等一分钟 |
| 想迁移旧 Supabase 评论 | Supabase 控制台导出 `comments` / `notes` 为 CSV，在 phpMyAdmin 里导入到 MySQL 同名表即可；MySQL 表没有的 `author` 字段会默认「匿名」 |
| 构建 OOM | 加 swap，或 `NODE_OPTIONS=--max-old-space-size=2048 pnpm build` |

---

## 13. 可选：前端环境变量

只有「前后端不同域名」或「开启管理员令牌」时才需要。在**项目根目录**新建 `.env`（构建时注入，改完要重新 build）：

```dotenv
# 接口地址；同域部署留空即可（默认走 /api）
VITE_API_BASE_URL=

# 与 server/.env 的 ADMIN_TOKEN 保持一致；不开启就留空
VITE_ADMIN_TOKEN=
```

> ⚠️ `VITE_*` 会被打进前端 JS，任何人都能在浏览器里看到。
> `ADMIN_TOKEN` 只能挡住随手删评论的人，真要防恶意删除，建议在 Nginx 层对
> `DELETE /api/comments` 做 IP 白名单，或直接不用公开删除按钮。

---

## 14. 可选：只跑一个 Node 项目（不用 Nginx 托管静态文件）

不想分别配置静态目录和反代时，可以让 Node 同时托管 `dist`：

```dotenv
# server/.env
SERVE_STATIC=true
STATIC_DIR=../docs/.vitepress/dist
```

然后 Nginx 只需要一条：

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

性能不如 Nginx 直接托管静态文件，个人博客够用。

---

## 15. 安全与备份建议

1. **每天备份数据库**：宝塔 → 计划任务 → 备份数据库 `my_blog`，保留 7 天。
2. **不要提交 `.env`**：已加入 `.gitignore`。
3. **MySQL 不要对公网开放 3306**（宝塔默认只监听本地即可）。
4. 定期 `pnpm update` + 重启接口，修补依赖漏洞。
5. 如果评论被刷，除限流外可在 Nginx 加 `limit_req`，或换成 giscus 等第三方评论。
