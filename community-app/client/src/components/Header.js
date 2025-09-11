import React from 'react';
import { LinkContainer } from 'react-router-bootstrap';
import { Navbar, Nav, Container } from 'react-bootstrap';

const Header = () => {
  return (
    <Navbar bg="dark" variant="dark" expand="lg" fixed="top" collapseOnSelect>
      <Container>
        <LinkContainer to="/">
          <Navbar.Brand>Community</Navbar.Brand>
        </LinkContainer>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <LinkContainer to="/">
              <Nav.Link>게시판</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/snake-game">
              <Nav.Link>뱀게임</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/pixel-shooter">
              <Nav.Link>픽셀슈터</Nav.Link>
            </LinkContainer>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;