import { type ThemeConfig } from 'vitepress-theme-sakura/.vitepress/config'
import { defineConfigWithTheme } from 'vitepress'
import fixKatex from 'vitepress-theme-sakura/.vitepress/fix-katex'

export default defineConfigWithTheme<ThemeConfig>({
  lang: 'zh-CN',
  title: 'RiB',
  head: [
    // 字体支持
    ['link', { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0/css/regular.min.css' }],
    ['link', { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0/css/all.min.css' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css?family=Noto+Serif+SC' }],
    // waline
    ['script', { src: 'https://cdn.jsdelivr.net/npm/@waline/client@1.5.4/dist/Waline.min.js' }],
    // katex
    ['script', { src: 'https://cdn.jsdelivr.net/npm/katex@0.15.2/dist/katex.min.js' }],
    ['script', { src: 'https://cdn.jsdelivr.net/npm/katex@0.15.2/dist/contrib/auto-render.min.js' }],
    ['link', { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/katex@0.15.2/dist/katex.min.css' }],
  ],
  markdown: {
    theme: 'github-light',
    lineNumbers: true,
    config: md => { md.use(fixKatex) },
  },
  themeConfig: {
    name: 'Rick',
    cover: 'https://flaribbit.github.io/vitepress-theme-sakura/60651947_p0.jpg',
    hello: 'Welcome to RiB',
    motto: 'Have some RiBs!',
    social: [
      { icon: 'fa-github', url: 'https://github.com/Rick816-bit' },
    ],
  },
})
