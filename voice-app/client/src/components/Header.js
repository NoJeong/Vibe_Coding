import React, { useEffect, useRef, useState } from "react";
import { Navbar, Nav, Container } from "react-bootstrap";
import { Link } from "react-router-dom";

const Header = () => {
  const [theme, setTheme] = useState("light");
  const [expanded, setExpanded] = useState(false);
  const collapseRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    setTheme("light");
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  useEffect(() => {
    if (!expanded) return;

    const handleOutsideClick = (event) => {
      if (collapseRef.current?.contains(event.target)) return;
      if (toggleRef.current?.contains(event.target)) return;
      setExpanded(false);
    };

    const handleScrollOrResize = () => setExpanded(false);

    document.addEventListener("click", handleOutsideClick, true);
    document.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("click", handleOutsideClick, true);
      document.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [expanded]);

  const toggleNavbar = () => {
    setExpanded((prev) => !prev);
  };

  return (
    <Navbar
      bg="light"
      expand="lg"
      fixed="top"
      className="header-navbar mb-0 py-0"
      style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
      expanded={expanded}
    >
      <Container fluid className="header-inner py-0 px-3">
        <Navbar.Brand
          as={Link}
          to="/"
          className="p-0 m-0 d-flex align-items-center"
          style={{ cursor: "pointer", lineHeight: 1 }}
        >
          <img src="/img/haesseum_logo.png" alt="했음" className="header-logo" />
        </Navbar.Brand>
        <Navbar.Toggle
          aria-controls="basic-navbar-nav"
          ref={toggleRef}
          onClick={toggleNavbar}
        />
        <Navbar.Collapse id="basic-navbar-nav" ref={collapseRef}>
          <Nav className="ms-auto align-items-center">
            <Nav.Link
              as={Link}
              to="/records"
              className="ms-3 fw-bold fs-6 text-decoration-none py-0 my-0"
              onClick={() => setExpanded(false)}
            >
              나의 기록 보기
            </Nav.Link>
            <Nav.Link
              as={Link}
              to={{ pathname: "/new-log", search: "?voice=true" }}
              className="ms-3 fw-bold fs-6 text-decoration-none py-0 my-0"
              onClick={() => setExpanded(false)}
            >
              새 기록
            </Nav.Link>
            <Nav.Link
              className="ms-3 text-muted py-0 my-0"
              role="button"
              title="테마 변경"
              style={{ pointerEvents: "none" }}
            >
              테마: light
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;