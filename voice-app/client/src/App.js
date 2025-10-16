import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { Toaster, toast } from 'react-hot-toast';
import Header from './components/Header';
import MainPage from './pages/MainPage';
import RecordsPage from './pages/RecordsPage';
import LogDetailPage from './pages/LogDetailPage';
import LogForm from './pages/LogForm';
import './index.css';

function App() {
  React.useEffect(() => {
    const schedule = async () => {
      const cap = window.Capacitor;
      if (!cap || cap.getPlatform?.() === 'web') return;
      const LN = cap.Plugins?.LocalNotifications;
      if (!LN) return;
      try {
        await LN.requestPermissions();
        await LN.schedule({
          notifications: [{
            id: 2100,
            title: '오늘 무엇을 했나요?',
            body: '한 줄로라도 기록을 남겨 보세요.',
            schedule: { at: new Date(new Date().setHours(21, 0, 0, 0)), repeats: true, every: 'day' }
          }]
        });
      } catch (e) {
        // ignore
      }
    };
    schedule();
  }, []);

  React.useEffect(() => {
    const cap = window.Capacitor;
    const isNative = cap && cap.getPlatform?.() !== 'web';
    if (!isNative) return;

    const capacitorApp = cap.App || cap.Plugins?.App || cap?.Plugins?.AppPlugin;
    if (!capacitorApp?.addListener) return;

    let lastBackAt = 0;
    const onBack = ({ canGoBack }) => {
      const isRoot = window.location.pathname === '/' && !canGoBack;
      if (!isRoot) {
        try { window.history.back(); } catch (_) {}
        return;
      }
      const now = Date.now();
      if (now - lastBackAt < 2000) {
        try { capacitorApp.exitApp?.(); } catch (_) {}
      } else {
        lastBackAt = now;
        try { toast.dismiss(); toast('Press back again to exit', { duration: 1500 }); } catch (_) {}
      }
    };

    const remove = capacitorApp.addListener('backButton', onBack);
    return () => {
      try { remove.remove(); } catch (_) {}
    };
  }, []);

  return (
    <Router>
      <Toaster position="top-right" />
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
      <Link to={{ pathname: "/new-log", search: "?voice=true" }} className="fab" aria-label="음성 기록 추가">+</Link>
    </Router>
  );
}

export default App;


