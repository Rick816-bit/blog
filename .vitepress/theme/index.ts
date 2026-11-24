import { type EnhanceAppContext } from 'vitepress'
// @ts-ignore
import Layout from 'vitepress-theme-sakura'

export default {
  Layout,
  NotFound: () => 'custom 404',
  enhanceApp({ app, router, siteData }: EnhanceAppContext) {
    // app is the Vue 3 app instance from `createApp()`. router is VitePress'
    // custom router. `siteData` is a `ref` containing site-level metadata.
  },
}
