import { createRoot } from 'react-dom/client'
import { ReactApp } from './react-app.js'
import './style.css'

createRoot(document.getElementById('app')!).render(<ReactApp />)
