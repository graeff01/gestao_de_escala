import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ConsultaView from './ConsultaView.jsx'
import './index.css'

const isConsulta = new URLSearchParams(window.location.search).get('modo') === 'consulta';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isConsulta ? <ConsultaView /> : <App />}
  </React.StrictMode>,
)

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
