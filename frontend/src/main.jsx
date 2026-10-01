import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { DevicesProvider } from './state/DevicesContext.jsx'
import { initTheme } from './lib/theme.js'
import './styles/tokens.css'
import './styles/app.css'

initTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <DevicesProvider>
          <App />
        </DevicesProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
