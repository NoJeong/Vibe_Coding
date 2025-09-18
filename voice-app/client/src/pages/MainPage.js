import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Col, Form, ListGroup, Row, Spinner, Stack } from 'react-bootstrap';
import Calendar from 'react-calendar';
import moment from 'moment';
import 'moment/locale/ko';
import 'react-calendar/dist/Calendar.css';

import { LOGS_PER_PAGE } from '../mockData';

const STORAGE_KEY = 'voiceLogs';
const SAVED_KEYWORDS_KEY = 'savedKeywords';

const safeParseLogs = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry === 'object' && (entry.created_at || entry.createdAt))
      .map((e) => ({ ...e, created_at: e.created_at || e.createdAt }));
  } catch (e) {
    return [];
  }
};

const getLogsFromStorage = () => {
  if (typeof window === 'undefined') return [];
  try {
    return safeParseLogs(window.localStorage.getItem(STORAGE_KEY));
  } catch (_) {
    return [];
  }
};

const readSavedKeywords = () => {
  try {
    const raw = window.localStorage.getItem(SAVED_KEYWORDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (_) {
    return [];
  }
};

const writeSavedKeywords = (list) => {
  try {
    const unique = Array.from(new Set((list || []).map((s) => String(s).trim()).filter(Boolean)));
    window.localStorage.setItem(SAVED_KEYWORDS_KEY, JSON.stringify(unique.slice(0, 5)));
  } catch (_) {}
};

const highlight = (text, keyword) => {
  if (!keyword) return text;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

const MainPage = () => {
  const navigate = useNavigate();

  const [rawLogs, setRawLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [restrictToDate, setRestrictToDate] = useState(true);
  const [visibleCount, setVisibleCount] = useState(LOGS_PER_PAGE);
  const [savedKeywords, setSavedKeywords] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [savedKeywordInput, setSavedKeywordInput] = useState('');

  useEffect(() => {
    moment.locale('ko');
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => {
      setRawLogs(getLogsFromStorage());
      setSavedKeywords(readSavedKeywords());
      setLoading(false);
    }, 100);
    return () => window.clearTimeout(timer);
  }, []);

  // Listen storage changes (logs)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key && e.key !== STORAGE_KEY) return;
      setRawLogs(getLogsFromStorage());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Listen storage changes (saved keywords)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key && e.key !== SAVED_KEYWORDS_KEY) return;
      setSavedKeywords(readSavedKeywords());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const sortedLogs = useMemo(
    () =>
      [...rawLogs]
        .filter((log) => log.created_at)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [rawLogs]
  );

  const selectedDateKey = useMemo(
    () => moment(selectedDate).startOf('day').format('YYYY-MM-DD'),
    [selectedDate]
  );

  const trimmedSearch = searchTerm.trim();
  const normalizedSearch = trimmedSearch.toLowerCase();
  const searchKeywordTokens = useMemo(() => {
    const matches = trimmedSearch.match(/#([^\s#]+)/g) || [];
    return matches.map((s) => s.slice(1).toLowerCase());
  }, [trimmedSearch]);

  const filteredLogs = useMemo(() => {
    return sortedLogs.filter((log) => {
      const content = (log.content || '').toString();
      const matchesSearch = !normalizedSearch || content.toLowerCase().includes(normalizedSearch);
      const matchesDate = !restrictToDate || moment(log.created_at).format('YYYY-MM-DD') === selectedDateKey;
      const kw = Array.isArray(log.keywords) ? log.keywords : [];
      const kwLower = kw.map((k) => String(k).toLowerCase());
      const activeKeywords = searchKeywordTokens.length ? searchKeywordTokens : selectedKeywords.map((k) => k.toLowerCase());
      const matchesKeywords = activeKeywords.length === 0 || kwLower.some((k) => activeKeywords.includes(k));
      return matchesSearch && matchesDate && matchesKeywords;
    });
  }, [sortedLogs, normalizedSearch, restrictToDate, selectedDateKey, selectedKeywords, searchKeywordTokens]);

  useEffect(() => {
    setVisibleCount(LOGS_PER_PAGE);
  }, [trimmedSearch, restrictToDate, selectedDateKey, sortedLogs.length, selectedKeywords.join('|')]);

  const visibleLogs = useMemo(() => filteredLogs.slice(0, visibleCount), [filteredLogs, visibleCount]);
  const hasMore = visibleCount < filteredLogs.length;

  const uniqueSortedDays = useMemo(() => {
    const unique = Array.from(new Set(sortedLogs.map((log) => moment(log.created_at).format('YYYY-MM-DD'))));
    return unique.sort((a, b) => moment(b, 'YYYY-MM-DD').valueOf() - moment(a, 'YYYY-MM-DD').valueOf());
  }, [sortedLogs]);

  const stats = useMemo(() => {
    const now = moment();
    const totalLogs = sortedLogs.length;
    const todayCount = sortedLogs.filter((log) => moment(log.created_at).isSame(now, 'day')).length;
    const weekCount = sortedLogs.filter((log) => moment(log.created_at).isSame(now, 'week')).length;

    let streak = 0;
    if (uniqueSortedDays.length) {
      streak = 1;
      let prev = moment(uniqueSortedDays[0], 'YYYY-MM-DD');
      for (let i = 1; i < uniqueSortedDays.length; i++) {
        const current = moment(uniqueSortedDays[i], 'YYYY-MM-DD');
        const diff = prev.diff(current, 'day');
        if (diff === 0) continue;
        if (diff === 1) {
          streak += 1;
          prev = current;
          continue;
        }
        break;
      }
    }

    const lastLog = sortedLogs[0];
    const lastLogMoment = lastLog ? moment(lastLog.created_at) : null;

    return { totalLogs, todayCount, weekCount, streak, lastLogMoment };
  }, [sortedLogs, uniqueSortedDays]);

  const logsByDate = useMemo(() => {
    return sortedLogs.reduce((acc, log) => {
      const key = moment(log.created_at).format('YYYY-MM-DD');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [sortedLogs]);

  // date => [savedKeyword labels]
  const savedKeywordHitsByDate = useMemo(() => {
    if (!savedKeywords || !savedKeywords.length) return {};
    const setMap = {};
    const lowerSaved = savedKeywords.map((k) => String(k).toLowerCase());
    sortedLogs.forEach((log) => {
      const key = moment(log.created_at).format('YYYY-MM-DD');
      const content = (log.content || '').toString().toLowerCase();
      lowerSaved.forEach((kwLower, idx) => {
        const label = savedKeywords[idx];
        const inContent = content.includes(kwLower);
        const inTags = Array.isArray(log.keywords) && log.keywords.some((k) => String(k).toLowerCase() === kwLower);
        if (inContent || inTags) {
          if (!setMap[key]) setMap[key] = new Set();
          setMap[key].add(label);
        }
      });
    });
    const result = {};
    Object.keys(setMap).forEach((d) => {
      result[d] = Array.from(setMap[d]);
    });
    return result;
  }, [sortedLogs, savedKeywords]);

  const handleRefresh = () => {
    setLoading(true);
    window.setTimeout(() => {
      setRawLogs(getLogsFromStorage());
      setSavedKeywords(readSavedKeywords());
      setLoading(false);
    }, 80);
  };

  const renderPreview = (log) => {
    const content = (log.content || '').toString();
    const preview = content.length > 220 ? `${content.slice(0, 220)}…` : content;
    if (!trimmedSearch) return preview;
    return highlight(preview, trimmedSearch);
  };

  const toggleKeyword = (k) => {
    setSelectedKeywords((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };

  const removeSavedKeyword = (k) => {
    const next = (savedKeywords || []).filter((x) => x !== k);
    setSavedKeywords(next);
    setSelectedKeywords((prev) => prev.filter((x) => x !== k));
    writeSavedKeywords(next);
  };

  const saveCurrentSearchAsKeyword = () => {
    const k = trimmedSearch.trim();
    if (!k) return;
    if ((savedKeywords || []).includes(k)) return;
    const nextAll = [k, ...(savedKeywords || [])];
    const limited = Array.from(new Set(nextAll)).slice(0, 5);
    setSavedKeywords(limited);
    writeSavedKeywords(limited);
  };

  const addSavedKeyword = () => {
    const k = savedKeywordInput.trim();
    if (!k) return;
    if ((savedKeywords || []).includes(k)) { setSavedKeywordInput(''); return; }
    const nextAll = [k, ...(savedKeywords || [])];
    const limited = Array.from(new Set(nextAll)).slice(0, 5);
    setSavedKeywords(limited);
    writeSavedKeywords(limited);
    setSavedKeywordInput('');
  };

  return (
    <Row className="gy-4">
      <Col lg={4}>
        <Stack gap={3}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <Card.Title as="h2" className="h4 mb-2">오늘 요약</Card.Title>
                  <Card.Subtitle className="text-muted small">
                    {moment().format('YYYY년 M월 D일 dddd')}
                  </Card.Subtitle>
                </div>
                <Button variant="outline-secondary" size="sm" onClick={() => navigate('/new-log')}>
                  새 기록
                </Button>
              </div>
              <Row className="text-center g-3">
                <Col xs={4}>
                  <div className="fw-bold fs-4">{stats.totalLogs}</div>
                  <div className="text-muted small">총 기록</div>
                </Col>
                <Col xs={4}>
                  <div className="fw-bold fs-4">{stats.weekCount}</div>
                  <div className="text-muted small">이번 주</div>
                </Col>
                <Col xs={4}>
                  <div className="fw-bold fs-4">{stats.streak}</div>
                  <div className="text-muted small">연속</div>
                </Col>
              </Row>
              <div className="mt-3 small text-muted">
                {stats.lastLogMoment ? (
                  <span>최근 기록: {stats.lastLogMoment.format('YYYY년 M월 D일 HH:mm')}</span>
                ) : (
                  <span>아직 작성한 기록이 없습니다.</span>
                )}
              </div>
            </Card.Body>
          </Card>

          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Card.Title as="h2" className="h5 mb-0">기록 달력</Card.Title>
                <Form.Check
                  type="switch"
                  id="toggle-date-filter"
                  label="전체 보기"
                  checked={!restrictToDate}
                  onChange={(e) => setRestrictToDate(!e.target.checked)}
                />
              </div>
              <Calendar
                className="voice-calendar"
                locale="ko"
                value={selectedDate}
                onChange={(value) => {
                  setSelectedDate(Array.isArray(value) ? value[0] : value);
                  setRestrictToDate(true);
                }}
                tileClassName={({ date, view }) => {
                  if (view !== 'month') return null;
                  const key = moment(date).format('YYYY-MM-DD');
                  const classes = [];
                  if (logsByDate[key]) classes.push('has-log');
                  if ((savedKeywordHitsByDate[key] || []).length) classes.push('has-search-keyword');
                  return classes.join(' ');
                }}
                tileContent={({ date, view }) => {
                  if (view !== 'month') return null;
                  const key = moment(date).format('YYYY-MM-DD');
                  const kws = savedKeywordHitsByDate[key] || [];
                  if (!kws.length) return null;
                  const display = kws.slice(0, 5);
                  const more = kws.length - display.length;
                  return (
                    <div className="log-keywords" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                      {display.map((k) => (
                        <span key={k} className="keyword-tag">{k}</span>
                      ))}
                      {more > 0 && <span className="keyword-tag">+{more}</span>}
                    </div>
                  );
                }}
              />
              <div className="mt-3 small text-muted">
                선택한 날짜: {moment(selectedDate).format('YYYY년 M월 D일 (ddd)')}
              </div>
            </Card.Body>
          </Card>
        </Stack>
      </Col>
    </Row>
  );
};

export default MainPage;
