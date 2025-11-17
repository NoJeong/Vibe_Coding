import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navbar, Nav, Container, Button } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import { calculateLogStats, getLogsFromStorage, LOGS_UPDATED_EVENT } from "../utils/logStats";

const THEME_STORAGE_KEY = "voice-app-theme";
const THEMES = [
  { value: "spring", label: "봄" },
  { value: "summer", label: "여름" },
  { value: "autumn", label: "가을" },
  { value: "winter", label: "겨울" },
];

const DEFAULT_THEME = THEMES[0].value;

const Header = () => {
  const [expanded, setExpanded] = useState(false);
  const [logStats, setLogStats] = useState(() => calculateLogStats(getLogsFromStorage()));
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && THEMES.some((item) => item.value === stored)) return stored;
      return DEFAULT_THEME;
    } catch (_) {
      return DEFAULT_THEME;
    }
  });
  const collapseRef = useRef(null);
  const toggleRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch (_) {
        /* ignore */
      }
    }
  }, [theme]);

  useEffect(() => {
    if (!expanded) return;

    const handleOutsideClick = (event) => {
      if (collapseRef.current?.contains(event.target)) return;
      if (toggleRef.current?.contains(event.target)) return;
      setExpanded(false);
    };

    document.addEventListener("click", handleOutsideClick, true);
    return () => {
      document.removeEventListener("click", handleOutsideClick, true);
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

  const toggleNavbar = () => setExpanded((prev) => !prev);

  const currentThemeLabel = useMemo(() => {
    const found = THEMES.find((item) => item.value === theme);
    return found ? found.label : THEMES[0].label;
  }, [theme]);

  const renderStats = (extraClass = "") => {
    const items = [
      { label: "전체 기록", value: logStats.totalLogs },
      { label: "이번 주", value: logStats.weekCount },
      { label: "연속 기록", value: logStats.streak },
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
    <>
    <Navbar
      expand="lg"
      fixed="top"
      className={`header-navbar mb-0 py-0 ${expanded ? "is-open" : ""}`}
      expanded={expanded}
    >
      <Container fluid className="header-inner py-0 px-3 d-flex align-items-center gap-2">
        <Navbar.Brand as={Link} to="/" className="p-0 m-0 d-flex align-items-center header-brand">
          <img src="/img/haesseum_logo.png" alt="해씀" className="header-logo" />
        </Navbar.Brand>
        {renderStats("flex-grow-1 justify-content-center header-stats-inline mx-2")}
        <Navbar.Toggle
          aria-controls="basic-navbar-nav"
          ref={toggleRef}
          className="header-navbar-toggler"
          onClick={toggleNavbar}
        />
        <Navbar.Collapse
          id="basic-navbar-nav"
          ref={collapseRef}
          className="w-100 d-flex flex-column flex-lg-row align-items-start align-items-lg-center gap-2"
        >
          <Nav className="ms-auto align-items-center flex-lg-row flex-column w-100">
            <Nav.Link
              as={Link}
              to="/records"
              className="header-nav-link ms-3 fw-bold fs-6 text-decoration-none py-0 my-0"
              onClick={() => setExpanded(false)}
            >
              전체 기록 보기
            </Nav.Link>
            <Nav.Link
              as={Link}
              to={{ pathname: "/new-log", search: "?voice=true" }}
              className="header-nav-link ms-3 fw-bold fs-6 text-decoration-none py-0 my-0"
              onClick={() => setExpanded(false)}
            >
              음성 기록 작성
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/settings/notifications"
              className="header-nav-link ms-3 fw-bold fs-6 text-decoration-none py-0 my-0"
              onClick={() => setExpanded(false)}
            >
              알림 설정
            </Nav.Link>
            <Button
              variant="outline-secondary"
              size="sm"
              className="ms-3 theme-toggle-btn"
              onClick={() => {
                const currentIndex = THEMES.findIndex((item) => item.value === theme);
                const nextIndex = (currentIndex + 1) % THEMES.length;
                setTheme(THEMES[nextIndex].value);
              }}
            >
              테마: {currentThemeLabel}
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
    {expanded && <div className="header-backdrop" onClick={() => setExpanded(false)} />}
    </>
  );
};

export default Header;

