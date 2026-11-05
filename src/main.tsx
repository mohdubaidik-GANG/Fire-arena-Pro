import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Smoothly dismiss PWA splash screen after app initialization
const splash = document.getElementById('pwa-splash');
if (splash) {
  setTimeout(() => {
    splash.style.transition = 'opacity 0.4s ease, visibility 0.4s ease';
    splash.style.opacity = '0';
    setTimeout(() => {
      splash.remove();
    }, 400);
  }, 400);
}
