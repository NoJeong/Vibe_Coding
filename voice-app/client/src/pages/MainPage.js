import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Form, Row, Stack } from 'react-bootstrap';
import Calendar from 'react-calendar';
import moment from 'moment';
import { ensureMockData, SAVED_KEYWORDS_KEY, STORAGE_KEY } from '../mockData';
import 'moment/locale/ko';
import 'react-calendar/dist/Calendar.css';

const safeParseLogs = (source) => {
  if (!source) return [];
  try {
    const parsed = Array.isArray(source) ? source : JSON.parse(source);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry === 'object' && (entry.created_at || entry.createdAt))
      .map((e) => ({ ...e, created_at: e.created_at || e.createdAt }));
  } catch (e) {
    return [];
  }
};

const getLogsFromStorage = () => {
  const { logs } = ensureMockData();
  return safeParseLogs(logs);
};

const readSavedKeywords = () => {
  const { keywords } = ensureMockData();
  return Array.isArray(keywords) ? keywords.filter(Boolean) : [];
};

const writeSavedKeywords = (list) => {
  try {
    const unique = Array.from(new Set((list || []).map((s) => String(s).trim()).filter(Boolean)));
    window.localStorage.setItem(SAVED_KEYWORDS_KEY, JSON.stringify(unique.slice(0, 5)));
  } catch (_) {}
};

const MainPage = () => {
  const [rawLogs, setRawLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [savedKeywords, setSavedKeywords] = useState([]);
  const [savedKeywordInput, setSavedKeywordInput] = useState('');

  useEffect(() => {
    moment.locale('ko');
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRawLogs(getLogsFromStorage());
      setSavedKeywords(readSavedKeywords());
    }, 50);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key || e.key === STORAGE_KEY) setRawLogs(getLogsFromStorage());
      if (!e.key || e.key === SAVED_KEYWORDS_KEY) setSavedKeywords(readSavedKeywords());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const sortedLogs = useMemo(
    () => [...rawLogs].filter((l) => l.created_at).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [rawLogs]
  );

  const stats = useMemo(() => {
    const now = moment();
    const totalLogs = sortedLogs.length;
    const weekCount = sortedLogs.filter((log) => moment(log.created_at).isSame(now, 'week')).length;
    let streak = 0;
    const uniqueDays = Array.from(new Set(sortedLogs.map((log) => moment(log.created_at).format('YYYY-MM-DD'))));
    if (uniqueDays.length) {
      streak = 1;
      let prev = moment(uniqueDays[0], 'YYYY-MM-DD');
      for (let i = 1; i < uniqueDays.length; i += 1) {
        const cur = moment(uniqueDays[i], 'YYYY-MM-DD');
        const diff = prev.diff(cur, 'day');
        if (diff === 0) continue;
        if (diff === 1) {
          streak += 1;
          prev = cur;
          continue;
        }
        break;
      }
    }
    const lastLog = sortedLogs[0];
    const lastLogMoment = lastLog ? moment(lastLog.created_at) : null;
    return { totalLogs, weekCount, streak, lastLogMoment };
  }, [sortedLogs]);

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

  const addSavedKeyword = () => {
    const k = savedKeywordInput.trim();
    if (!k) return;
    if ((savedKeywords || []).includes(k)) {
      setSavedKeywordInput('');
      return;
    }
    const nextAll = [k, ...(savedKeywords || [])];
    const limited = Array.from(new Set(nextAll)).slice(0, 5);
    setSavedKeywords(limited);
    writeSavedKeywords(limited);
    setSavedKeywordInput('');
  };

  const removeSavedKeyword = (k) => {
    const next = (savedKeywords || []).filter((x) => x !== k);
    setSavedKeywords(next);
    writeSavedKeywords(next);
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
                <Button variant="outline-secondary" size="sm" onClick={() => (window.location.href = '/new-log')}>
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
                  <span>아직 생성된 기록이 없습니다.</span>
                )}
              </div>
            </Card.Body>
          </Card>

          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Card.Title as="h2" className="h5 mb-0">기록 달력</Card.Title>
              </div>

              <div className="mb-2" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Form.Control
                  type="text"
                  value={savedKeywordInput}
                  onChange={(e) => setSavedKeywordInput(e.target.value)}
                  placeholder="저장할 키워드 입력 (최대 5개)"
                  style={{ width: 200 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addSavedKeyword();
                    }
                  }}
                />
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={!savedKeywordInput.trim() || (savedKeywords?.length || 0) >= 5}
                  onClick={addSavedKeyword}
                >
                  추가 ({(savedKeywords?.length || 0)}/5)
                </Button>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {savedKeywords && savedKeywords.length > 0 && savedKeywords.map((k) => (
                    <div key={k} className="d-inline-flex align-items-center gap-1">
                      <Button variant="outline-secondary" size="sm" onClick={() => removeSavedKeyword(k)} title="삭제">
                        {k} ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Calendar
                calendarType="gregory"
                className="voice-calendar"
                locale="ko"
                value={selectedDate}
                onChange={(value) => setSelectedDate(Array.isArray(value) ? value[0] : value)}
                tileClassName={({ date, view }) => {
                  if (view !== 'month') return null;
                  const key = moment(date).format('YYYY-MM-DD');
                  const classes = [];
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
