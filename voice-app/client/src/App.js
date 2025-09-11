import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Header from './components/Header'; // Header component re-enabled
import MainPage from './pages/MainPage'; // Renamed from PostListPage
import LogDetailPage from './pages/LogDetailPage'; // Renamed from PostDetailPage
import LogForm from './pages/LogForm'; // Renamed from PostForm
// import SnakeGamePage from './pages/SnakeGamePage'; // Game page removed
// import PixelShooterPage from './pages/PixelShooterPage'; // Game page removed
import './index.css';

function App() {
  return (
    <Router>
      <Header />
      <main>
        <Container className="mt-4">
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/logs/:id" element={<LogDetailPage />} />
            <Route path="/new-log" element={<LogForm />} />
            <Route path="/edit-log/:id" element={<LogForm />} />
            {/* Game routes removed */}
            {/* <Route path="/snake-game" element={<SnakeGamePage />} /> */}
            {/* <Route path="/pixel-shooter" element={<PixelShooterPage />} /> */}
          </Routes>
        </Container>
      </main>
    </Router>
  );
}

export default App;
