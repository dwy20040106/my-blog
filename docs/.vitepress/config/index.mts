import { defineConfig } from 'vitepress'

import shared from './shared'
import zh from './zh'

// 站点仅保留中文版本，不再使用 locales 多语言
export default defineConfig({
  ...shared,
  ...zh,
})
