import { defineConfig, type SiteConfig } from 'vitepress'
// 自动导入 TDesign 
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { TDesignResolver } from 'unplugin-vue-components/resolvers';

import { createRssFileZH } from "../theme/utils/rss";
import { handleHeadMeta } from "../theme/utils/handleHeadMeta";
import { search as zhSearch } from './zh';

/**
 * 本地搜索的中文分词：中文按「单字 + 二元组」切分，英文/数字按整词。
 * 默认分词器不切中文（整句一个 token），"评论" 这类关键词会搜不到。
 * 注意：该函数会被序列化后注入浏览器，必须自包含，不能引用外部变量。
 */
function tokenizeCJK(text: string): string[] {
  const cjk = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/
  const words = String(text)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
  const tokens: string[] = []

  for (const word of words) {
    if (!cjk.test(word)) {
      tokens.push(word)
      continue
    }
    const chars = Array.from(word)
    for (let i = 0; i < chars.length; i++) {
      tokens.push(chars[i])
      if (i < chars.length - 1) tokens.push(chars[i] + chars[i + 1])
    }
  }

  return tokens
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: true,
  sitemap: {
    hostname: 'https://codeflagai.top'
  },
  lang: "en-US",
  head: [
    ["script", { async: "", src: "https://www.googletagmanager.com/gtag/js?id=G-MB7XVBG1TQ" }],
    [
      "script",
      {},
      `window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-MB7XVBG1TQ');`,
    ],

    [
      "link",
      {
        rel: "icon",
        href: "/images/ava.jpg",
      },
    ],
  ],
  // https://vitepress.dev/reference/site-config#transformhead
  async transformHead(context) {
    return handleHeadMeta(context)
  },
  buildEnd: (config: SiteConfig) => {
    createRssFileZH(config);
  },


  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    outline: [2, 4],

    // 本地搜索（自托管，不依赖 Algolia，索引在构建时生成）
    search: {
      provider: 'local',
      options: {
        translations: zhSearch.translations,
        miniSearch: {
          options: {
            tokenize: tokenizeCJK,
          },
        },
      },
    },
    externalLinkIcon: true,
  },

  markdown: {
    math: true,
  },

  vite: {
    // 只注入 VITE_ 前缀的环境变量（Supabase 已移除，不再需要 NEXT_PUBLIC_）
    envPrefix: ['VITE_'],
    server: {
      // 本地开发时把 /api 代理到本地 Node 接口，行为与线上 Nginx 反代一致
      proxy: {
        '/api': {
          target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:3001',
          changeOrigin: true,
        },
      },
    },
    plugins: [
      // ...
      AutoImport({
        resolvers: [TDesignResolver({
          library: 'vue-next'
        })],
      }),
      Components({
        resolvers: [TDesignResolver({
          library: 'vue-next'
        })],
      }),
    ],
    ssr: {
      noExternal: ['tdesign-vue-next', 'tdesign-icons-vue-next']
    }
  },
})
