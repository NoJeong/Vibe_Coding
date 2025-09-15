import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { Toaster } from 'react-hot-toast'; // Import Toaster
import Header from './components/Header';
import MainPage from './pages/MainPage';
import LogDetailPage from './pages/LogDetailPage';
import LogForm from './pages/LogForm';
import './index.css';

function App() {
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
    </Router>
  );
}

export default App;