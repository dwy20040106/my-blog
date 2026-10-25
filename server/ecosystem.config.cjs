// PM2 配置（CommonJS，因为 server/package.json 是 "type": "module"）
// 用法：
//   cd /www/wwwroot/my-blog/server
//   pm2 start ecosystem.config.cjs
//   pm2 save
//
// 注意：限流是进程内存实现，这里固定单实例（instances: 1）。
module.exports = {
  apps: [
    {
      name: 'my-blog-api',
      script: 'app.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
      // 日志默认在 ~/.pm2/logs，宝塔 PM2 管理器里也能看到
      merge_logs: true,
      time: true,
    },
  ],
}
