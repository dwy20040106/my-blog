/**
 * 包装 async 路由，把异常交给 Express 的全局错误处理中间件。
 * （Express 4 不会自动捕获 async 函数里抛出的错误）
 */
export const wrap = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next)
