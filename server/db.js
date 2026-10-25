import mysql from 'mysql2/promise'
import { config } from './config.js'

let pool = null

/**
 * 惰性创建连接池：
 * 进程启动时不会立刻连接数据库，避免数据库暂时没启动时 PM2 无限重启。
 */
export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...config.db,
      decimalNumbers: true,
    })
  }
  return pool
}

/**
 * 统一的查询入口，全部使用占位符（?）防止 SQL 注入。
 */
export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params)
  return rows
}

export async function closePool() {
  if (pool) {
    const current = pool
    pool = null
    await current.end()
  }
}
