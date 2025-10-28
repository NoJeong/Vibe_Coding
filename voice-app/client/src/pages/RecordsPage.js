import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Form, ListGroup, Spinner } from 'react-bootstrap';
import moment from 'moment';
import 'moment/locale/ko';

import { LOGS_PER_PAGE, ensureMockData, SAVED_KEYWORDS_KEY, STORAGE_KEY } from '../mockData';

// 로컬스토리지에서 읽어 온 값을 화면에서 처리하기 쉬운 구조로 변환하는 보조 함수들
const safeParseLogs = (source) => {
  // JSON 문자열이거나 배열일 수 있는 입력을 안전하게 파싱해 일관된 객체 배열로 만든다.
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
  // ensureMockData가 비정상 데이터를 정리해 주기 때문에 여기서는 결과만 받아온다.
  const { logs } = ensureMockData();
  return safeParseLogs(logs);
};

const readSavedKeywords = () => {
  // 비어 있거나 손상된 값이 들어 있어도 깨끗한 문자열 배열로 정리한다.
  const { keywords } = ensureMockData();
  return Array.isArray(keywords) ? keywords.filter(Boolean) : [];
};

const highlight = (text, keyword) => {
  // 검색어가 있을 경우 미리보기 본문에서 해당 문자열을 <mark> 태그로 감싸 강조한다.
  if (!keyword) return text;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

// 저장된 음성 기록을 검색/필터링하고 세부 페이지로 이동할 수 있는 메인 목록 화면
const RecordsPage = () => {
  const navigate = useNavigate();
  const [rawLogs, setRawLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(LOGS_PER_PAGE);
  const [savedKeywords, setSavedKeywords] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);

  useEffect(() => {
    // 모든 날짜 표기를 한국어 로캘에 맞춰 보여주기 위해 초기화한다.
    moment.locale('ko');
  }, []);

  useEffect(() => {
    // 로딩 스피너가 잠깐이라도 보이도록 지연을 둔 뒤 스토리지에서 값을 읽어온다.
    setLoading(true);
    const timer = window.setTimeout(() => {
      setRawLogs(getLogsFromStorage());
      setSavedKeywords(readSavedKeywords());
      setLoading(false);
    }, 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    // 다른 탭이나 창에서 기록이 변경될 때 storage 이벤트로 최신 상태를 유지한다.
    const onStorage = (e) => {
      if (!e.key || e.key === STORAGE_KEY) setRawLogs(getLogsFromStorage());
      if (!e.key || e.key === SAVED_KEYWORDS_KEY) setSavedKeywords(readSavedKeywords());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 최신 기록이 위로 오도록 정렬된 배열을 메모이즈해 불필요한 재계산을 줄인다.
  const sortedLogs = useMemo(
    () => [...rawLogs].filter((l) => l.created_at).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [rawLogs]
  );

  const trimmedSearch = searchTerm.trim();
  const normalizedSearch = trimmedSearch.toLowerCase();
  const searchKeywordTokens = useMemo(() => {
    const matches = trimmedSearch.match(/#([^\s#]+)/g) || [];
    return matches.map((s) => s.slice(1).toLowerCase());
  }, [trimmedSearch]);

  // 검색어와 선택된 키워드 조건을 모두 반영한 결과만 필터링한다.
  const filteredLogs = useMemo(() => {
    return sortedLogs.filter((log) => {
      const content = (log.content || '').toString();
      const contentLower = content.toLowerCase();
      const matchesSearch = !normalizedSearch || contentLower.includes(normalizedSearch);
      const kw = Array.isArray(log.keywords) ? log.keywords : [];
      const kwLower = kw.map((k) => String(k).toLowerCase());
      const activeKeywords = searchKeywordTokens.length
        ? searchKeywordTokens
        : selectedKeywords.map((k) => k.toLowerCase());
      const matchesKeywords =
        activeKeywords.length === 0 ||
        kwLower.some((k) => activeKeywords.includes(k)) ||
        activeKeywords.some((token) => contentLower.includes(token));
      return matchesSearch && matchesKeywords;
    });
  }, [sortedLogs, normalizedSearch, selectedKeywords, searchKeywordTokens]);

  useEffect(() => {
    // 검색 조건이 바뀔 때마다 페이지네이션을 처음부터 다시 보여준다.
    setVisibleCount(LOGS_PER_PAGE);
  }, [trimmedSearch, sortedLogs.length, selectedKeywords.join('|')]);

  const visibleLogs = useMemo(() => filteredLogs.slice(0, visibleCount), [filteredLogs, visibleCount]);
  const hasMore = visibleCount < filteredLogs.length;

  const handleRefresh = () => {
    // 사용자가 직접 새로고침을 눌렀을 때 스토리지를 다시 읽어온다.
    setLoading(true);
    window.setTimeout(() => {
      setRawLogs(getLogsFromStorage());
      setSavedKeywords(readSavedKeywords());
      setLoading(false);
    }, 80);
  };

  const renderPreview = (log) => {
    // 미리보기 본문을 220자까지 표시하되 검색어는 하이라이트한다.
    const content = (log.content || '').toString();
    const preview = content.length > 220 ? `${content.slice(0, 220)}…` : content;
    if (!trimmedSearch) return preview;
    return highlight(preview, trimmedSearch);
  };

  const toggleKeyword = (k) => {
    // 저장된 키워드 버튼을 누르면 선택 목록에 추가하거나 제거한다.
    setSelectedKeywords((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };

  return (
    <Card className="shadow-sm border-0">
      <Card.Body className="d-flex flex-column h-100">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
          <div>
            <Card.Title as="h1" className="h4 mb-1">나의 기록 보기</Card.Title>
            <Card.Subtitle className="text-muted small">
              저장한 키워드를 눌러 필터링하거나 검색창을 활용하세요.
            </Card.Subtitle>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" size="sm" onClick={handleRefresh}>새로고침</Button>
            <Button as={Link} to="/new-log" variant="primary" size="sm">새 기록 작성</Button>
          </div>
        </div>

        <Form className="mb-3" onSubmit={(e) => e.preventDefault()}>
          {savedKeywords && savedKeywords.length > 0 && (
            <div className="mb-2" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {savedKeywords.map((k) => (
                <Button
                  key={k}
                  variant={selectedKeywords.includes(k) ? 'primary' : 'outline-secondary'}
                  size="sm"
                  onClick={() => toggleKeyword(k)}
                >
                  {k}
                </Button>
              ))}
            </div>
          )}
          <Form.Control
            type="search"
            placeholder="내용/키워드로 검색 (#태그 지원)"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </Form>

        {loading ? (
          <div className="flex-grow-1 d-flex align-items-center justify-content-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">불러오는 중</span>
            </Spinner>
          </div>
        ) : visibleLogs.length ? (
          <>
            <ListGroup variant="flush" className="flex-grow-1">
              {visibleLogs.map((log) => (
                <ListGroup.Item key={log.id} className="py-3">
                  <div className="d-flex flex-column flex-md-row gap-3 align-items-md-center">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <Badge bg="primary" className="text-uppercase">{moment(log.created_at).format('HH:mm')}</Badge>
                        <span className="text-muted small">{moment(log.created_at).format('YYYY년 M월 D일 dddd')}</span>
                      </div>
                      <div
                        className="fw-semibold"
                        style={{ whiteSpace: 'pre-wrap' }}
                        dangerouslySetInnerHTML={{ __html: renderPreview(log) }}
                      />
                      {Array.isArray(log.keywords) && log.keywords.length ? (
                        <div className="mt-1 d-flex flex-wrap gap-1">
                          {log.keywords.map((k) => (
                            <Badge bg="secondary" key={k}>{k}</Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="d-flex gap-2 ms-md-auto">
                      <Button as={Link} to={`/logs/${log.id}`} variant="outline-primary" size="sm">자세히</Button>
                      <Button as={Link} to={`/edit-log/${log.id}`} variant="outline-secondary" size="sm">수정</Button>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
            {hasMore && (
              <div className="text-center mt-3">
                <Button variant="outline-secondary" onClick={() => setVisibleCount((prev) => prev + LOGS_PER_PAGE)}>
                  더 보기
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center py-5">
            <h2 className="h5 mb-2">표시할 기록이 없습니다.</h2>
            <p className="text-muted mb-3">
              {trimmedSearch ? '검색어를 변경하거나 초기화해 보세요.' : '먼저 새로운 기록을 작성해 보세요.'}
            </p>
            <div className="d-flex gap-2">
              <Button variant="primary" onClick={() => navigate('/new-log')}>새 기록 작성</Button>
              {trimmedSearch && (
                <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>검색 초기화</Button>
              )}
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default RecordsPage;
