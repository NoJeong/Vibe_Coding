import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

const Header = () => {
  return (
    <Navbar bg="light" expand="lg" fixed="top" className="mb-4" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <Container>
        <LinkContainer to="/">
          <Navbar.Brand style={{ color: '#4A90E2', fontWeight: 'bold', cursor: 'pointer' }}>VoiceLog</Navbar.Brand>
        </LinkContainer>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            {/* Pass `to` as an object to separate pathname and search */}
            <LinkContainer to={{ pathname: "/new-log", search: "?voice=true" }}>
              <Button variant="primary" className="ms-2">음성으로 기록 추가</Button>
            </LinkContainer>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;