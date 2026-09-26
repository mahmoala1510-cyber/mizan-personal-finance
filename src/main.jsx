import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Mizan failed to render:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <main className="recovery-screen">
      <img src="/icon.svg" alt="" width="64" height="64" />
      <h1>تعذّر تشغيل ميزان</h1>
      <p>قد تكون بيانات نسخة قديمة غير متوافقة. جرّب إعادة التحميل أولًا.</p>
      <button onClick={() => window.location.reload()}>إعادة التحميل</button>
      <button className="recovery-secondary" onClick={() => {
        if (window.confirm('سيتم حذف بيانات التطبيق المحفوظة على هذا الجهاز. هل تريد المتابعة؟')) {
          localStorage.removeItem('mizan-data');
          window.location.reload();
        }
      }}>مسح البيانات القديمة وبدء جديد</button>
    </main>;
  }
}

createRoot(document.getElementById('root')).render(<React.StrictMode><AppErrorBoundary><App /></AppErrorBoundary></React.StrictMode>);
window.__mizanStarted = true;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').then(registration => registration.update()).catch(error => console.error('Service worker registration failed:', error)));
}
