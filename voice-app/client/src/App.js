import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { Toaster } from 'react-hot-toast'; // Import Toaster
import Header from './components/Header';
import MainPage from './pages/MainPage';
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
            title: '오늘 무엇을 했나요?',
            body: '한 줄로라도 기록을 남겨 보세요.',
            schedule: { at: new Date(new Date().setHours(21, 0, 0, 0)), repeats: true, every: 'day' }
          }]
        });
      } catch (e) {
        // silently ignore if plugin not installed
      }
    };
    schedule();
  }, []);
  return (
    <Router>
      <Toaster position="top-right" /> {/* Add Toaster component here */}
      <Header />
      <main style={{ paddingTop: '80px' }}> {/* Add padding to main to avoid overlap with fixed Header */}
        <Container className="mt-4">
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/logs/:id" element={<LogDetailPage />} />
            <Route path="/new-log" element={<LogForm />} />
            <Route path="/edit-log/:id" element={<LogForm />} />
          </Routes>
        </Container>
      </main>
      <Link to={{ pathname: "/new-log", search: "?voice=true" }} className="fab" aria-label="새 기록 추가">+</Link>
    </Router>
  );
}

export default App;
