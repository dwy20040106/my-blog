/** 文章路径：必须以 / 开头，最长 255（和表结构一致） */
export function parseArticleKey(value) {
  if (typeof value !== 'string') return null
  const key = value.trim()
  if (!key || key.length > 255 || !key.startsWith('/')) return null
  return key
}

/** 正整数 id，非法值统一返回 null */
export function toPositiveId(value) {
  if (value === null || value === undefined || value === '') return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

/** 取字符串并去掉首尾空白，非字符串返回 '' */
export function trimText(value) {
  return typeof value === 'string' ? value.trim() : ''
}
