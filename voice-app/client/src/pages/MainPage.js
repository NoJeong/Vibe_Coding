import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Col, Form, ListGroup, Modal, Row, Stack } from 'react-bootstrap';
import Calendar from 'react-calendar';
import moment from 'moment';
import { ensureMockData, SAVED_KEYWORDS_KEY, STORAGE_KEY } from '../mockData';
import 'moment/locale/ko';
import 'react-calendar/dist/Calendar.css';
import { useNavigate } from 'react-router-dom';

// 로컬스토리지에서 읽어 온 값을 정리하는 보조 함수
const safeParseLogs = (source) => {
  // JSON 문자열이거나 배열일 수 있는 입력을 안전하게 파싱해 일관된 구조를 만든다.
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
  // 저장된 키워드가 없을 때도 빈 배열을 돌려 오류를 방지한다.
  const { keywords } = ensureMockData();
  return Array.isArray(keywords) ? keywords.filter(Boolean) : [];
};

const writeSavedKeywords = (list) => {
  // 입력값을 정제한 뒤 최대 5개까지만 저장하며, 중복을 제거한다.
  try {
    const unique = Array.from(new Set((list || []).map((s) => String(s).trim()).filter(Boolean)));
    window.localStorage.setItem(SAVED_KEYWORDS_KEY, JSON.stringify(unique.slice(0, 5)));
  } catch (_) {}
};

const MainPage = () => {
  // 달력과 키워드 위젯을 통해 최근 기록 현황을 한눈에 보여주는 홈 화면.
  const [rawLogs, setRawLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [savedKeywords, setSavedKeywords] = useState([]);
  const [savedKeywordInput, setSavedKeywordInput] = useState('');
  const [calendarActiveDate, setCalendarActiveDate] = useState(() => new Date());
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState(null);
  const [modalLogs, setModalLogs] = useState([]);
  const swipeStartXRef = useRef(null);
  const slideTimeoutRef = useRef(null);
  const [calendarSlideDir, setCalendarSlideDir] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 날짜와 요일을 한국어로 표기하기 위해 모멘트 로캘을 설정한다.
    moment.locale('ko');
  }, []);

  useEffect(() => {
    // 첫 렌더 직후 setTimeout을 사용해 스토리지 I/O가 렌더를 막지 않도록 한다.
    const timer = window.setTimeout(() => {
      setRawLogs(getLogsFromStorage());
      setSavedKeywords(readSavedKeywords());
    }, 50);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    // 다른 탭에서 로그가 수정될 때 storage 이벤트로 동기화한다.
    const onStorage = (e) => {
      if (!e.key || e.key === STORAGE_KEY) setRawLogs(getLogsFromStorage());
      if (!e.key || e.key === SAVED_KEYWORDS_KEY) setSavedKeywords(readSavedKeywords());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 최신 작성 순으로 정렬된 로그 목록을 재사용하기 위해 메모이즈한다.
  const sortedLogs = useMemo(
    () => [...rawLogs].filter((l) => l.created_at).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [rawLogs]
  );
  const lastLogMoment = useMemo(() => (sortedLogs[0] ? moment(sortedLogs[0].created_at) : null), [sortedLogs]);

  const logsByDate = useMemo(() => {
    const map = {};
    sortedLogs.forEach((log) => {
      const key = moment(log.created_at).format('YYYY-MM-DD');
      if (!map[key]) map[key] = [];
      map[key].push(log);
    });
    return map;
  }, [sortedLogs]);


  // 키워드가 등장한 날짜를 미리 계산해 달력 타일에 마커를 붙인다.
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
    // 입력한 키워드를 중복 없이 저장하고 UI를 즉시 갱신한다.
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
    // 삭제된 키워드를 로컬스토리지와 상태에서 모두 제거해 일관성을 유지한다.
    const next = (savedKeywords || []).filter((x) => x !== k);
    setSavedKeywords(next);
    writeSavedKeywords(next);
  };

  const triggerCalendarSlide = (offset) => {
    if (!offset) return;
    const dir = offset > 0 ? 'next' : 'prev';
    setCalendarSlideDir(dir);
    if (slideTimeoutRef.current) window.clearTimeout(slideTimeoutRef.current);
    slideTimeoutRef.current = window.setTimeout(() => {
      setCalendarSlideDir(null);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (slideTimeoutRef.current) window.clearTimeout(slideTimeoutRef.current);
    };
  }, []);

  const changeCalendarMonth = (offset) => {
    setCalendarActiveDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + offset);
      return next;
    });
    triggerCalendarSlide(offset);
  };

  const handleTouchStart = (event) => {
    if (event.touches.length === 1) {
      swipeStartXRef.current = event.touches[0].clientX;
    }
  };

  const handleTouchEnd = (event) => {
    if (swipeStartXRef.current == null) return;
    const deltaX = event.changedTouches[0].clientX - swipeStartXRef.current;
    const threshold = 50;
    if (deltaX > threshold) {
      changeCalendarMonth(-1);
    } else if (deltaX < -threshold) {
      changeCalendarMonth(1);
    }
    swipeStartXRef.current = null;
  };

  const openLogsModal = (date) => {
    const key = moment(date).format('YYYY-MM-DD');
    const logsForDate = sortedLogs.filter(
      (log) => moment(log.created_at).format('YYYY-MM-DD') === key
    );
    setModalDate(date);
    setModalLogs(logsForDate);
    setShowModal(true);
  };

  const closeLogsModal = () => {
    setShowModal(false);
    setModalDate(null);
    setModalLogs([]);
  };

  const handleDayClick = (value) => {
    const date = Array.isArray(value) ? value[0] : value;
    setSelectedDate(date);
    setCalendarActiveDate(new Date(date.getFullYear(), date.getMonth(), 1));
    openLogsModal(date);
  };

  return (
    <>
      <Row className="gy-4">
        <Col lg={4}>
          <Stack gap={3}>
            <Card className="shadow-sm border-0">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <Card.Title as="h2" className="h5 mb-0">기록 달력</Card.Title>
                </div>
                <div className="mt-2 small text-muted">
                  {lastLogMoment ? (
                    <span>최근 기록: {lastLogMoment.format('YYYY년 M월 D일 HH:mm')}</span>
                  ) : (
                    <span>아직 생성된 기록이 없습니다.</span>
                  )}
                </div>

                <div className="saved-keyword-row mb-2">
                  <div className="saved-keyword-controls">
                    <Form.Control
                      type="text"
                      value={savedKeywordInput}
                      onChange={(e) => setSavedKeywordInput(e.target.value)}
                      placeholder="저장할 키워드 입력 (최대 5개)"
                      className="saved-keyword-input"
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
                  </div>
                  <div className="saved-keyword-tags">
                    {savedKeywords && savedKeywords.length > 0 && savedKeywords.map((k) => (
                      <div key={k} className="d-inline-flex align-items-center gap-1">
                        <Button variant="outline-secondary" size="sm" onClick={() => removeSavedKeyword(k)} title="삭제">
                          {k} ×
                        </Button>
                      </div>
                    ))}
                  </div>
              </div>

              <div className="calendar-month-toolbar d-flex justify-content-between align-items-center mb-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => changeCalendarMonth(-1)}
                  aria-label="이전 달"
                >
                  ‹ 이전
                </Button>
                <div className="fw-semibold text-center flex-grow-1 mx-3">
                  {moment(calendarActiveDate).format('YYYY년 M월')}
                </div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => changeCalendarMonth(1)}
                  aria-label="다음 달"
                >
                  다음 ›
                </Button>
              </div>
              <div
                className="calendar-swipe-area"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <Calendar
                  calendarType="gregory"
                  className={`voice-calendar${calendarSlideDir ? ` calendar-animate-${calendarSlideDir}` : ''}`}
                  locale="ko"
                  value={selectedDate}
                  activeStartDate={calendarActiveDate}
                  onChange={(value) => {
                    const date = Array.isArray(value) ? value[0] : value;
                    setSelectedDate(date);
                    setCalendarActiveDate(new Date(date.getFullYear(), date.getMonth(), 1));
                  }}
                  onActiveStartDateChange={({ activeStartDate }) => {
                    if (activeStartDate) setCalendarActiveDate(activeStartDate);
                  }}
                  onClickDay={handleDayClick}
                  tileClassName={({ date, view }) => {
                    if (view !== 'month') return null;
                    const key = moment(date).format('YYYY-MM-DD');
                    const classes = [];
                    const logCount = (logsByDate[key] || []).length;
                    if (logCount) {
                      classes.push('has-log');
                      if (logCount >= 5) {
                        classes.push('log-level-high');
                      } else if (logCount >= 3) {
                        classes.push('log-level-mid');
                      } else {
                        classes.push('log-level-low');
                      }
                    }
                    if ((savedKeywordHitsByDate[key] || []).length) classes.push('has-search-keyword');
                    return classes.join(' ');
                  }}
                  tileContent={({ date, view }) => {
                    if (view !== 'month') return null;
                    const key = moment(date).format('YYYY-MM-DD');
                    const kws = savedKeywordHitsByDate[key] || [];
                    const display = kws.slice(0, 5);
                    const more = kws.length - display.length;
                    if (!kws.length) return null;
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
              </div>
                <div className="mt-3 small text-muted">
                  선택한 날짜: {moment(selectedDate).format('YYYY년 M월 D일 (ddd)')}
                </div>
              </Card.Body>
            </Card>
          </Stack>
        </Col>
      </Row>
      <Modal show={showModal} onHide={closeLogsModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {modalDate ? moment(modalDate).format('YYYY년 M월 D일 dddd') : '기록'}
          </Modal.Title>
        </Modal.Header>
      <Modal.Body>
        {modalLogs.length ? (
          <ListGroup variant="flush">
            {modalLogs.map((log) => (
              <ListGroup.Item key={log.id ?? log.created_at}>
                <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                  <span className="fw-semibold text-primary">
                    {moment(log.created_at).format('HH:mm')}
                  </span>
                  <span className="ms-auto text-muted small">
                    {moment(log.created_at).format('YYYY.MM.DD')}
                  </span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{log.content}</div>
                {Array.isArray(log.keywords) && log.keywords.length ? (
                  <div className="mt-2 d-flex flex-wrap gap-1">
                    {log.keywords.map((keyword) => (
                      <span key={keyword} className="badge bg-secondary">{keyword}</span>
                    ))}
                  </div>
                ) : null}
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : (
          <p className="mb-0 text-muted text-center">이 날짜에는 저장된 기록이 없습니다.</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="primary"
          onClick={() => {
            if (!modalDate) return;
            closeLogsModal();
            navigate('/new-log', { state: { selectedDate: modalDate } });
          }}
          disabled={!modalDate}
        >
          추가하기
        </Button>
      </Modal.Footer>
    </Modal>
    </>
  );
};

export default MainPage;
