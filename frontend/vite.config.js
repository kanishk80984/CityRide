import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { fetchSeoData, resolvePublicAssetUrl } from './src/ssr/fetchSeoData.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isProd = process.env.NODE_ENV === 'production'
const rrEnv = isProd ? 'production' : 'development'

function reactRouterSsrFixPlugin() {
  return {
    name: 'react-router-ssr-fix',
    enforce: 'pre',
    resolveId(source, importer, options) {
      if (options.ssr) {
        if (source === 'react-router-dom') {
          return path.resolve(__dirname, 'node_modules/react-router-dom/dist/index.mjs')
        }
        if (source === 'react-router/dom') {
          return path.resolve(__dirname, `node_modules/react-router/dist/${rrEnv}/dom-export.mjs`)
        }
        if (source === 'react-router') {
          return path.resolve(__dirname, `node_modules/react-router/dist/${rrEnv}/index.mjs`)
        }
      }
      return null
    }
  }
}

function viteDevSsrPlugin() {
  return {
    name: 'vite-dev-ssr',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url
        const pathPart = url.split('?')[0]

        const method = req.method
        if (method !== 'GET') {
          return next()
        }

        const accept = req.headers.accept || ''
        const isDoc = accept.includes('text/html') || req.headers['sec-fetch-dest']?.includes('document')
        if (!isDoc) {
          return next()
        }

        const isApiOrAsset = url.startsWith('/api') || url.startsWith('/uploads') || url.startsWith('/assets') || url.startsWith('/@') || url.startsWith('/node_modules/')
        const hasFileExt = /\.[a-zA-Z0-9]{2,4}$/.test(pathPart)
        if (isApiOrAsset || hasFileExt) {
          return next()
        }

        const PRIVATE_PREFIXES = [
          '/dashboard', '/users', '/drivers', '/vehicles', 
          '/popular-locations', '/advertisements', '/withdrawals', 
          '/user-withdrawals', '/help', '/subscriptions', '/ride-config', 
          '/wallet', '/owner', '/login', '/register'
        ]
        if (PRIVATE_PREFIXES.some(p => pathPart.startsWith(p))) {
          return next()
        }

        try {
          const ssrData = await fetchSeoData(url)

          if (ssrData && ssrData.status === 301 && ssrData.redirectUrl) {
            res.statusCode = 301
            res.setHeader('Location', ssrData.redirectUrl)
            res.end()
            return
          }

          let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8')
          template = await server.transformIndexHtml(url, template)
          template = template.replace(/<title>[^<]*<\/title>/i, '')

          const ssrModule = await server.ssrLoadModule('/src/entry-server.jsx')
          const render = ssrModule.render

          globalThis.__SSR_HOST__ = req.headers.host
          globalThis.__SSR_PROTOCOL__ = req.connection.encrypted ? 'https' : 'http'

          let { html: appHtml } = render(url, ssrData || {})
          appHtml = appHtml.replace(/<link rel="preload"[^>]*>/g, '')

          const seoData = ssrData?.seoData || {
            title: 'CityRide - Your City. Your Ride. | Book Bike, Auto and Car Rides',
            description: 'Fast, reliable and affordable rides in your city with CityRide.',
            canonical: (ssrData?.siteUrl || 'http://localhost:3019') + pathPart
          }

          const ogImage = resolvePublicAssetUrl(seoData.image, ssrData?.siteUrl || 'http://localhost:3019')
          const escHtml = (str) => String(str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

          let seoHead = `
  <title>${escHtml(seoData.title)}</title>
  <meta name="description" content="${escHtml(seoData.description)}" />
  ${seoData.keywords ? `<meta name="keywords" content="${escHtml(seoData.keywords)}" />` : ''}
  <link rel="canonical" href="${escHtml(seoData.canonical)}" />
  <meta property="og:title" content="${escHtml(seoData.title)}" />
  <meta property="og:description" content="${escHtml(seoData.description)}" />
  <meta property="og:url" content="${escHtml(seoData.canonical)}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:site_name" content="CityRide" />
  <meta name="theme-color" content="#fcc111" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escHtml(seoData.title)}" />
  <meta name="twitter:description" content="${escHtml(seoData.description)}" />
  <meta name="twitter:image" content="${ogImage}" />`

          if (ssrData?.jsonLd) {
            seoHead += `\n  <script type="application/ld+json">${JSON.stringify(ssrData.jsonLd)}</script>`
          }

          const safeData = JSON.stringify(ssrData || {}).replace(/</g, '\\u003c')
          seoHead += `\n  <script>window.__SSR_DATA__ = ${safeData};</script>`

          const html = template
            .replace('<!--ssr-head-->', seoHead)
            .replace('<!--ssr-body-->', appHtml)

          res.statusCode = ssrData?.status === 404 ? 404 : 200
          res.setHeader('Content-Type', 'text/html')
          res.end(html)
        } catch (err) {
          console.error(`[Vite Dev SSR] Render error for ${url}:`, err)
          let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8')
          template = await server.transformIndexHtml(url, template)
          res.statusCode = 500
          res.setHeader('Content-Type', 'text/html')
          res.end(template)
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), reactRouterSsrFixPlugin(), viteDevSsrPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5011',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5011',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5011',
        ws: true,
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    ssr: process.env.VITE_SSR_BUILD === 'true'
  },
  ssr: {
    noExternal: /react-router/
  }
})
