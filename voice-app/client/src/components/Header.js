import React, { useEffect, useRef, useState } from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

const Header = () => {
  const [theme, setTheme] = useState('light');
  const [expanded, setExpanded] = useState(false);
  const collapseRef = useRef(null);

  // Initialize theme on mount
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

  // Close navbar menu when user scrolls/drag the main content or interacts outside
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
        <LinkContainer to="/">
          <Navbar.Brand style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: '800', letterSpacing: '0.5px', color: 'var(--text)' }}>
            했음
          </Navbar.Brand>
        </LinkContainer>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav" ref={collapseRef}>
          <Nav className="ms-auto align-items-center">
            {/* Pass `to` as an object to separate pathname and search */}
            <LinkContainer to={{ pathname: "/new-log", search: "?voice=true" }}>
              <Button className="btn-accent ms-2" onClick={() => setExpanded(false)}>음성 기록</Button>
            </LinkContainer>
            <Button className="btn-ghost ms-2" onClick={toggleTheme} title="테마 전환">
              테마: {theme}
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
