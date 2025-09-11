import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom

const Header = () => {
  return (
    <Navbar bg="light" expand="lg" fixed="top" className="mb-4" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <Container>
        <Navbar.Brand as={Link} to="/" style={{ color: '#FF69B4', fontWeight: 'bold' }}>VoiceLog</Navbar.Brand> {/* Use as={Link} */}
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <Nav.Link as={Link} to="/" style={{ color: '#4A4A4A' }}>기록</Nav.Link> {/* Use as={Link} */}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;