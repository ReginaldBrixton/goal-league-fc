import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'

const rootElement = document.getElementById('root')!

if (!rootElement.innerHTML) {
  createRoot(rootElement).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
} else {
  hydrateRoot(rootElement,
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}
