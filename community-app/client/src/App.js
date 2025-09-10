import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import PostListPage from './pages/PostListPage';
import PostDetailPage from './pages/PostDetailPage';
import PostForm from './pages/PostForm';
import SnakeGamePage from './pages/SnakeGamePage';
import PixelShooterPage from './pages/PixelShooterPage';
import './index.css';

function App() {
  return (
    <Router>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<PostListPage />} />
          <Route path="/posts/:id" element={<PostDetailPage />} />
          <Route path="/new-post" element={<PostForm />} />
          <Route path="/edit-post/:id" element={<PostForm />} />
          <Route path="/snake-game" element={<SnakeGamePage />} />
          <Route path="/pixel-shooter" element={<PixelShooterPage />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
