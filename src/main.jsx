import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerServiceWorker } from './lib/pwa'
import { installAppMode } from './lib/appMode'
import { installLanguage } from './lib/i18n'

// Registered here, not in a component: offline support belongs to the whole
// app, including the entrance screen that renders before any of it.
registerServiceWorker()

// Stamped on <html> before React renders, so the app chrome is never briefly
// laid out as the website and then corrected.
installAppMode()

// Same reason: the reading language decides how the browser picks fonts and
// how a screen reader pronounces the page, so it is set before first paint.
installLanguage()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
