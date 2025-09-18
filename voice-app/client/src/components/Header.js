import React, { useEffect, useRef, useState } from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Header = () => {
  const [theme, setTheme] = useState('light');
  const [expanded, setExpanded] = useState(false);
  const collapseRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    let next = stored;
    if (!next) {
      try {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        next = prefersDark ? 'dark' : 'light';
      } catch (_) {
        next = 'light';
      }
    }
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  }, []);

  const toggleTheme = () => {
    const order = ['light', 'dark', 'mono', 'contrast'];
    const idx = order.indexOf(theme);
    const next = order[(idx + 1) % order.length] || 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  useEffect(() => {
    const closeIfOpen = (e) => {
      if (!expanded) return;
      if (collapseRef.current && e && e.target && collapseRef.current.contains(e.target)) return;
      setExpanded(false);
    };
    const onScroll = () => { if (expanded) setExpanded(false); };
    document.addEventListener('touchmove', closeIfOpen, { passive: true, capture: true });
    document.addEventListener('mousedown', closeIfOpen, true);
    document.addEventListener('scroll', onScroll, true);
    document.addEventListener('wheel', onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener('touchmove', closeIfOpen, true);
      document.removeEventListener('mousedown', closeIfOpen, true);
      document.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('wheel', onScroll, true);
    };
  }, [expanded]);

  return (
    <Navbar bg="light" expand="lg" fixed="top" className="mb-4" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} expanded={expanded} onToggle={setExpanded}>
      <Container>
        <Navbar.Brand as={Link} to="/" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: '800', letterSpacing: '0.5px', color: 'var(--text)' }}>
          했음
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav" ref={collapseRef}>
          <Nav className="ms-auto align-items-center">
            <Nav.Link as={Link} to="/records" className="ms-3 fw-bold fs-5 text-decoration-none" onClick={() => setExpanded(false)}>
              나의 기록 보기
            </Nav.Link>
            <Nav.Link as={Link} to={{ pathname: '/new-log', search: '?voice=true' }} className="ms-3 fw-bold fs-5 text-decoration-none" onClick={() => setExpanded(false)}>
              새 기록
            </Nav.Link>
            <Nav.Link className="ms-3 text-muted" onClick={toggleTheme} role="button" title="테마 변경">
              테마: {theme}
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
