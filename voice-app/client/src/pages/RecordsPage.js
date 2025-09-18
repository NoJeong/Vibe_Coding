import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Form, ListGroup, Spinner } from 'react-bootstrap';
import moment from 'moment';
import 'moment/locale/ko';

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

const highlight = (text, keyword) => {
  if (!keyword) return text;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

const RecordsPage = () => {
  const navigate = useNavigate();
  const [rawLogs, setRawLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(LOGS_PER_PAGE);
  const [savedKeywords, setSavedKeywords] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);

  useEffect(() => { moment.locale('ko'); }, []);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => {
      setRawLogs(getLogsFromStorage());
      setSavedKeywords(readSavedKeywords());
      setLoading(false);
    }, 80);
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
      const kw = Array.isArray(log.keywords) ? log.keywords : [];
      const kwLower = kw.map((k) => String(k).toLowerCase());
      const activeKeywords = searchKeywordTokens.length ? searchKeywordTokens : selectedKeywords.map((k) => k.toLowerCase());
      const matchesKeywords = activeKeywords.length === 0 || kwLower.some((k) => activeKeywords.includes(k));
      return matchesSearch && matchesKeywords;
    });
  }, [sortedLogs, normalizedSearch, selectedKeywords, searchKeywordTokens]);

  useEffect(() => { setVisibleCount(LOGS_PER_PAGE); }, [trimmedSearch, sortedLogs.length, selectedKeywords.join('|')]);
  const visibleLogs = useMemo(() => filteredLogs.slice(0, visibleCount), [filteredLogs, visibleCount]);
  const hasMore = visibleCount < filteredLogs.length;

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

  const toggleKeyword = (k) => setSelectedKeywords((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  return (
    <Card className="shadow-sm border-0">
      <Card.Body className="d-flex flex-column h-100">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
          <div>
            <Card.Title as="h1" className="h4 mb-1">나의 기록 보기</Card.Title>
            <Card.Subtitle className="text-muted small">
              저장한 키워드 칩으로 필터하거나, 검색창을 사용하세요.
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
            placeholder="내용/키워드로 검색해요 (예: 점심 #운동)"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </Form>

        {loading ? (
          <div className="flex-grow-1 d-flex align-items-center justify-content-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">불러오는 중…</span>
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
                      <div className="fw-semibold" style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: renderPreview(log) }} />
                      {Array.isArray(log.keywords) && log.keywords.length ? (
                        <div className="mt-1 d-flex flex-wrap gap-1">
                          {log.keywords.map((k) => (
                            <Badge bg="secondary" key={k}>{k}</Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="d-flex gap-2 ms-md-auto">
                      <Button as={Link} to={`/logs/${log.id}`} variant="outline-primary" size="sm">상세</Button>
                      <Button as={Link} to={`/edit-log/${log.id}`} variant="outline-secondary" size="sm">수정</Button>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
            {hasMore && (
              <div className="text-center mt-3">
                <Button variant="outline-secondary" onClick={() => setVisibleCount((prev) => prev + LOGS_PER_PAGE)}>더 보기</Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center py-5">
            <h2 className="h5 mb-2">표시할 기록이 없습니다.</h2>
            <p className="text-muted mb-3">
              {trimmedSearch ? '검색어를 변경하거나 초기화해 보세요' : '새로 기록을 작성해 보세요'}
            </p>
            <div className="d-flex gap-2">
              <Button variant="primary" onClick={() => navigate('/new-log')}>새 기록 작성하기</Button>
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

