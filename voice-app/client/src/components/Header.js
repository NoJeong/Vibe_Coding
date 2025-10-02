import React, { useCallback, useEffect, useRef, useState } from "react";
import { Navbar, Nav, Container } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import { calculateLogStats, getLogsFromStorage, LOGS_UPDATED_EVENT } from "../utils/logStats";

const Header = () => {
  const [expanded, setExpanded] = useState(false);
  const [logStats, setLogStats] = useState(() => calculateLogStats(getLogsFromStorage()));
  const collapseRef = useRef(null);
  const toggleRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
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

  const refreshStats = useCallback(() => {
    setLogStats(calculateLogStats(getLogsFromStorage()));
  }, []);

  useEffect(() => {
    refreshStats();
  }, [location, refreshStats]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleStatsUpdate = () => refreshStats();
    window.addEventListener("storage", handleStatsUpdate);
    window.addEventListener(LOGS_UPDATED_EVENT, handleStatsUpdate);
    window.addEventListener("focus", handleStatsUpdate);
    return () => {
      window.removeEventListener("storage", handleStatsUpdate);
      window.removeEventListener(LOGS_UPDATED_EVENT, handleStatsUpdate);
      window.removeEventListener("focus", handleStatsUpdate);
    };
  }, [refreshStats]);

  const toggleNavbar = () => {
    setExpanded((prev) => !prev);
  };

  const renderStats = (extraClass = "") => {
    const items = [
      { label: "총 기록", value: logStats.totalLogs },
      { label: "이번 주", value: logStats.weekCount },
      { label: "연속", value: logStats.streak },
    ];
    return (
      <div className={`header-stats ${extraClass}`.trim()}>
        {items.map((item) => (
          <div key={item.label} className="header-stat text-center">
            <div className="header-stat-value">
              {Number(item.value || 0).toLocaleString("ko-KR")}
            </div>
            <div className="header-stat-label text-muted">{item.label}</div>
          </div>
        ))}
      </div>
    );
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
      <Container fluid className="header-inner py-0 px-3 d-flex align-items-center gap-2">
        <Navbar.Brand
          as={Link}
          to="/"
          className="p-0 m-0 d-flex align-items-center"
          style={{ cursor: "pointer", lineHeight: 1 }}
        >
          <img src="/img/haesseum_logo.png" alt="해씀" className="header-logo" />
        </Navbar.Brand>
        {renderStats("flex-grow-1 justify-content-center header-stats-inline mx-2")}
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
              전체 기록 보기
            </Nav.Link>
            <Nav.Link
              as={Link}
              to={{ pathname: "/new-log", search: "?voice=true" }}
              className="ms-3 fw-bold fs-6 text-decoration-none py-0 my-0"
              onClick={() => setExpanded(false)}
            >
              음성 기록
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
