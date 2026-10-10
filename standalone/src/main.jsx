import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './styles/console.css'

createRoot(document.getElementById('root')).render(<App />)

// Installable app: register the service worker in production builds only.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) })
}
// Keep the browser's install offer so the Account page can show its own button.
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__k791Install = e; window.dispatchEvent(new Event('k791-installable')) })
