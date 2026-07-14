import { renderToPipeableStream, type PipeableStream } from 'react-dom/server'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree'
import { PassThrough } from 'node:stream'

export async function render(url: string): Promise<string> {
  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 30_000,
    history: createMemoryHistory({ initialEntries: [url] }),
  })

  await router.load()

  return new Promise((resolve, reject) => {
    let didError = false
    const stream = new PassThrough()
    let html = ''

    stream.on('data', (chunk) => { html += chunk.toString() })
    stream.on('end', () => {
      if (didError) reject(new Error('SSR render error'))
      else resolve(html)
    })
    stream.on('error', reject)

    const pipeable: PipeableStream = renderToPipeableStream(
      <RouterProvider router={router} />,
      {
        onShellError(error) {
          reject(error)
        },
        onAllReady() {
          didError = false
        },
        onError(error) {
          didError = true
          console.error('SSR error:', error)
        },
      },
    )

    pipeable.pipe(stream)
  })
}
