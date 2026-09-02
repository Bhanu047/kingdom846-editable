import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerServiceWorker } from './lib/pwa'

// Registered here, not in a component: offline support belongs to the whole
// app, including the entrance screen that renders before any of it.
registerServiceWorker()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
