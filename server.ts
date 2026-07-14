import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import type { ViteDevServer } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
const root = __dirname

function collectCssFromGraph(vite: ViteDevServer, entryUrl: string): string {
  const cssParts: string[] = []
  const visited = new Set<string>()

  function traverse(mod: any) {
    if (!mod || !mod.id || visited.has(mod.id)) return
    visited.add(mod.id)

    if (mod.id.endsWith('.css')) {
      const ssrMod = mod.ssrModule
      if (ssrMod?.default) cssParts.push(ssrMod.default)
    }

    mod.importedModules?.forEach((m: any) => traverse(m))
  }

  const entry = vite.moduleGraph.getModuleById(entryUrl)
  if (entry) traverse(entry)

  return cssParts.join('\n')
}

export async function createServer() {
  const app = express()

  let vite: ViteDevServer | undefined
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite')
    vite = await createViteServer({
      root,
      server: { middlewareMode: true },
      appType: 'custom',
    })
    app.use(vite.middlewares)
  } else {
    app.use((await import('serve-static')).default(resolve(root, 'dist/client')))
  }

  app.use(async (req, res, next) => {
    const url = req.originalUrl

    if (url.includes('.') || url.startsWith('/@') || url.startsWith('/node_modules')) {
      return next()
    }

    try {
      let template
      let render

      if (!isProd) {
        template = readFileSync(resolve(root, 'index.html'), 'utf-8')
        template = await vite!.transformIndexHtml(url, template)
        const devCss = collectCssFromGraph(vite!, url)
        template = template.replace('</head>', `<style>\n${devCss}\n</style>\n</head>`)
        render = (await vite!.ssrLoadModule('/src/entry-server.tsx')).render
      } else {
        template = readFileSync(resolve(root, 'dist/client/index.html'), 'utf-8')
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error - built file exists at runtime
        render = (await import('./dist/server/entry-server.js')).render
      }

      const appHtml = await render(url)

      const html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (e: unknown) {
      const err = e as Error
      if (!isProd && vite) {
        vite.ssrFixStacktrace(err)
      }
      console.error(err)
      res.status(500).end(err.stack)
    }
  })

  return app
}

createServer().then((app) => {
  const port = process.env.PORT || 5173
  app.listen(Number(port), () => {
    console.log(`\n  Goal League FC SSR running at http://localhost:${port}\n`)
  })
})
