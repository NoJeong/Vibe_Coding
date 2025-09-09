
import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header style={{ background: '#333', color: '#fff', padding: '1rem', display: 'flex', justifyContent: 'space-between' }}>
      <h1><Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>Community</Link></h1>
      <nav>
        <ul style={{ listStyle: 'none', display: 'flex', gap: '1rem' }}>
          <li><Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>게시판</Link></li>
          <li><a href="/snake-game/index.html" style={{ color: '#fff', textDecoration: 'none' }}>뱀게임</a></li>
          <li><a href="/pixel-shooter/index.html" style={{ color: '#fff', textDecoration: 'none' }}>픽셀슈터</a></li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
