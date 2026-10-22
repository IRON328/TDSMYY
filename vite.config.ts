import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

/**
 * 沙箱工作台 —— 只依赖 agent-platform 既有接口，零后端改动。
 *
 * 代理是必需品不是优化：agent-platform 未开放 CORS，
 * 浏览器直连 :8080 会被跨域拦死，所以前端一律写相对路径。
 * preview 也必须配同一份 proxy，否则预览构建产物时接口全 404。
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_TARGET || 'http://localhost:8080'

  const proxyOptions = {
    '/api': { target: backendTarget, changeOrigin: true },
    '/agui': { target: backendTarget, changeOrigin: true },
    /**
     * 首页题库封面：后端由 ProblemCoverController 生成、落在 workspace/hero-covers/，
     * 经 WebConfig 的静态映射暴露在 /covers/**。不代理的话 dev 下会去 public/ 找 → 404。
     * 不必带鉴权：后端那条路由在 /api 之外，本来就免鉴权。
     */
    '/covers': { target: backendTarget, changeOrigin: true },
  }

  return {
    plugins: [vue()],
    base: './',
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5181,
      strictPort: true,
      open: true,
      host: true,
      proxy: proxyOptions,
    },
    preview: {
      port: 5181,
      strictPort: true,
      proxy: proxyOptions,
    },
    build: {
      assetsInlineLimit: 4096,
      chunkSizeWarningLimit: 2048,
    },
  }
})
