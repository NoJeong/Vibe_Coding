import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { Toaster, toast } from 'react-hot-toast'; // Import Toaster
import Header from './components/Header';
import MainPage from './pages/MainPage';
import RecordsPage from './pages/RecordsPage';
import LogDetailPage from './pages/LogDetailPage';
import LogForm from './pages/LogForm';
import './index.css';

function App() {
  // Optional: schedule daily reminder if LocalNotifications plugin is available
  React.useEffect(() => {
    const schedule = async () => {
      const cap = window.Capacitor;
      if (!cap || cap.getPlatform?.() === 'web') return;
      const LN = cap.Plugins?.LocalNotifications;
      if (!LN) return;
      try {
        await LN.requestPermissions();
        // Schedule daily 21:00 notification local time
        await LN.schedule({
          notifications: [{
            id: 2100,
            title: '?�늘 무엇???�나??',
            body: '??줄로?�도 기록???�겨 보세??',
            schedule: { at: new Date(new Date().setHours(21, 0, 0, 0)), repeats: true, every: 'day' }
          }]
        });
      } catch (e) {
        // silently ignore if plugin not installed
      }
    };
    schedule();
  }, []);

  // Handle Android hardware back button to navigate history / double-back exit
  React.useEffect(() => {
    const cap = window.Capacitor;
    if (!cap || cap.getPlatform?.() === 'web') return;
    const app = cap.Plugins?.App || cap.App;
    let lastBackAt = 0;
    const onBack = () => {
      const isRoot = window.location.pathname === '/';
      if (!isRoot) {
        try { window.history.back(); } catch (_) {}
        return;
      }
      const now = Date.now();
      if (now - lastBackAt < 2000) {
        try { app?.exitApp && app.exitApp(); } catch (_) {}
      } else {
        lastBackAt = now;
        try { toast.dismiss(); toast('Press back again to exit', { duration: 1500 }); } catch (_) {}
      }
    };
    let remove;
    try {
      if (app?.addListener) {
        const sub = app.addListener('backButton', onBack);
        remove = () => { try { sub.remove(); } catch (_) {} };
      } else {
        document.addEventListener('backbutton', onBack, false);
        remove = () => document.removeEventListener('backbutton', onBack, false);
      }
    } catch (_) {}
    return () => { try { remove && remove(); } catch (_) {} };
  }, []);
  return (
    <Router>
      <Toaster position="top-right" /> {/* Add Toaster component here */}
      <Header />
      <main className="app-main">
        <Container fluid className="mt-4 px-3 px-lg-5">
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/records" element={<RecordsPage />} />
            <Route path="/logs/:id" element={<LogDetailPage />} />
            <Route path="/new-log" element={<LogForm />} />
            <Route path="/edit-log/:id" element={<LogForm />} />
          </Routes>
        </Container>
      </main>
      <Link to={{ pathname: "/new-log", search: "?voice=true" }} className="fab" aria-label="??기록 추�?">+</Link>
    </Router>
  );
}

export default App;



