import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Smoothly dismiss PWA splash screen once React mounts
const splash = document.getElementById('pwa-splash');
if (splash) {
  setTimeout(() => {
    splash.style.transition = 'opacity 0.3s ease, visibility 0.3s ease';
    splash.style.opacity = '0';
    splash.style.pointerEvents = 'none';
    setTimeout(() => {
      splash.remove();
    }, 300);
  }, 100);
}
