import path from 'node:path'
import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { query, closePool } from './db.js'
import commentsRouter from './routes/comments.js'
import notesRouter from './routes/notes.js'
import likesRouter from './routes/likes.js'

const app = express()

// 部署在 Nginx 反向代理后面，让 req.ip 拿到真实客户端 IP（限流依赖它）
app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use(express.json({ limit: '64kb' }))
app.use(
  cors({
    // 列表为空时允许所有来源；填了就只允许列出的域名
    origin: config.corsOrigins.length ? config.corsOrigins : true,
  }),
)

/* ============================ 健康检查 ============================ */
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1')
    res.json({ ok: true, time: new Date().toISOString() })
  } catch (err) {
    console.error('[health] 数据库连接失败:', err.message)
    res.status(500).json({ ok: false, error: '数据库连接失败' })
  }
})

/* ============================== 业务接口 ============================== */
app.use('/api/comments', commentsRouter)
app.use('/api/notes', notesRouter)
app.use('/api/likes', likesRouter)

/* ======================= 可选：由 Node 托管静态站 ======================= */
if (config.serveStatic) {
  console.log(`[api] 同时托管静态站点: ${config.staticDir}`)
  app.use(
    express.static(config.staticDir, {
      extensions: ['html'],
      index: ['index.html'],
      maxAge: '1h',
    }),
  )

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.status(404).sendFile(path.join(config.staticDir, '404.html'), (err) => {
      if (err) res.status(404).send('Not Found')
    })
  })
}

/* ============================ 404 / 错误处理 ============================ */
app.use('/api', (req, res) => {
  res.status(404).json({ error: '接口不存在' })
})

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[api]', err)
  const status = err.status || 500
  res.status(status).json({
    error: err.expose && err.message ? err.message : '服务器内部错误',
  })
})

/* ================================ 启动 ================================ */
const server = app.listen(config.port, config.host, () => {
  console.log(`[api] 已启动: http://${config.host}:${config.port}`)
  console.log(
    `[api] 数据库: ${config.db.host}:${config.db.port}/${config.db.database || '(未配置)'}`,
  )
  if (config.adminToken) {
    console.log('[api] 已开启管理员令牌校验：删除接口需要请求头 X-Admin-Token')
  }
})

async function shutdown(signal) {
  console.log(`[api] 收到 ${signal}，正在关闭…`)
  server.close(async () => {
    await closePool()
    process.exit(0)
  })
  // 兜底，防止连接池卡住导致 PM2 杀不掉进程
  setTimeout(() => process.exit(1), 5000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
