import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Spinner, Alert, ListGroup, Form, Row, Col, Modal, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import moment from 'moment';
import toast from 'react-hot-toast';
import 'react-calendar/dist/Calendar.css';
import { allMockLogs as initialLogs } from '../mockData.js';

const getLogsFromStorage = () => {
  const logsJSON = localStorage.getItem('voiceLogs');
  if (logsJSON) return JSON.parse(logsJSON);
  localStorage.setItem('voiceLogs', JSON.stringify(initialLogs));
  return initialLogs;
};

// Custom hook for debouncing
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

const MainPage = () => {
  const [allLogs, setAllLogs] = useState(getLogsFromStorage);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarValue, setCalendarValue] = useState(new Date());
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearchKeyword = useDebounce(searchInput, 500); // 500ms delay
  const [registeredKeywords, setRegisteredKeywords] = useState(['공부', '운동', 'React', '알고리즘', '헬스장']);
  const [newKeyword, setNewKeyword] = useState('');
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [modalData, setModalData] = useState({ date: null, logs: [], keywords: [] });

  useEffect(() => {
    localStorage.setItem('voiceLogs', JSON.stringify(allLogs));
  }, [allLogs]);

  const allLogsMap = useMemo(() => {
    const map = new Map();
    allLogs.forEach(log => {
      const date = moment(log.created_at).format('YYYY-MM-DD');
      if (!map.has(date)) map.set(date, []);
      map.get(date).push(log);
    });
    return map;
  }, [allLogs]);

  const logsForSelectedDate = useMemo(() => {
    const dateKey = moment(selectedDate).format('YYYY-MM-DD');
    return allLogsMap.get(dateKey) || [];
  }, [selectedDate, allLogsMap]);

  const handleDayClick = (date) => {
    setSelectedDate(date);
    setCalendarValue(date);
    const dateKey = moment(date).format('YYYY-MM-DD');
    const logsForDay = allLogsMap.get(dateKey) || [];
    if (logsForDay.length > 0) {
      const foundKeywords = Array.from(new Set(registeredKeywords.filter(regKeyword => 
        logsForDay.some(log => log.content.toLowerCase().includes(regKeyword.toLowerCase()))
      )));
      setModalData({ date, logs: logsForDay, keywords: foundKeywords });
      setShowDayModal(true);
    }
  };

  const handleAddLogForDate = (date) => {
    navigate({ pathname: '/new-log', search: '?voice=true' }, { state: { selectedDate: date.toISOString() } });
  };

  const handleAddKeyword = () => {
    if (registeredKeywords.length >= 5) {
      toast.error('키워드는 최대 5개까지 등록할 수 있습니다.');
      return;
    }
    if (newKeyword.trim() && !registeredKeywords.includes(newKeyword.trim())) {
      const trimmedKeyword = newKeyword.trim();
      setRegisteredKeywords([...registeredKeywords, trimmedKeyword]);
      setNewKeyword('');
      toast.success(`'${trimmedKeyword}' 키워드가 추가되었습니다.`);
    } else if (newKeyword.trim()) {
      toast.error('이미 등록된 키워드입니다.');
    }
  };

  const handleDeleteRegisteredKeyword = (keywordToDelete) => {
    setRegisteredKeywords(registeredKeywords.filter(kw => kw !== keywordToDelete));
    toast.success(`'${keywordToDelete}' 키워드가 삭제되었습니다.`);
  };

  const openDeleteModal = (logId) => {
    setLogToDelete(logId);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setAllLogs(allLogs.filter(log => log.id !== logToDelete));
    setShowDeleteModal(false);
    setLogToDelete(null);
    toast.success('기록이 삭제되었습니다.');
  };

  const tileClassName = useCallback(({ date, view }) => {
    if (view !== 'month') return null;
    const dateKey = moment(date).format('YYYY-MM-DD');
    const logsForDay = allLogsMap.get(dateKey) || [];
    if (logsForDay.length === 0) return null;

    const classes = ['has-log'];
    const hasKeyword = (logs, keywords) => keywords.some(regKeyword => {
      const lowerCaseRegKeyword = regKeyword.toLowerCase();
      return logs.some(log => log.content && log.content.toLowerCase().includes(lowerCaseRegKeyword));
    });

    if (debouncedSearchKeyword && hasKeyword(logsForDay, [debouncedSearchKeyword])) {
      classes.push('has-search-keyword');
    } else if (hasKeyword(logsForDay, registeredKeywords)) {
      classes.push('has-registered-keyword');
    }
    return classes.join(' ');
  }, [allLogsMap, debouncedSearchKeyword, registeredKeywords]);

  const tileContent = useCallback(({ date, view }) => {
    if (view !== 'month') return null;
    const dateKey = moment(date).format('YYYY-MM-DD');
    const logsForDay = allLogsMap.get(dateKey) || [];
    if (logsForDay.length === 0) return null;

    let displayKeywords = new Set();
    const lowerCaseSearchKeyword = debouncedSearchKeyword?.toLowerCase();

    if (debouncedSearchKeyword && logsForDay.some(log => log.content.toLowerCase().includes(lowerCaseSearchKeyword))) {
      displayKeywords.add(debouncedSearchKeyword);
    }

    registeredKeywords.forEach(regKeyword => {
      if (logsForDay.some(log => log.content.toLowerCase().includes(regKeyword.toLowerCase()))) {
        displayKeywords.add(regKeyword);
      }
    });

    const keywordsArray = Array.from(displayKeywords);
    if (keywordsArray.length > 0) {
      return (
        <div className="log-keywords">
          {keywordsArray.slice(0, 2).map((kw, index) => <div key={index} className="keyword-tag">{kw}</div>)}
          {keywordsArray.length > 2 && <div className="keyword-tag">...</div>}
        </div>
      );
    }
    return null;
  }, [allLogsMap, registeredKeywords, debouncedSearchKeyword]);

  return (
    <div>
      <Form.Group className="mb-3" controlId="searchKeywordInput">
        <Form.Label>키워드 검색</Form.Label>
        <Form.Control type="text" placeholder="캘린더에서 찾을 키워드를 입력하세요..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
      </Form.Group>

      <div className="d-flex justify-content-center mb-4">
        <Calendar onClickDay={handleDayClick} value={calendarValue} locale="ko-KR" tileClassName={tileClassName} tileContent={tileContent} formatDay={(locale, date) => moment(date).format('D')} className="voice-calendar" />
      </div>

      <Form.Group className="mb-3" controlId="newKeywordInput">
        <Form.Label>등록할 키워드 (최대 5개)</Form.Label>
        <div className="d-flex">
          <Form.Control type="text" placeholder="새 키워드를 입력하세요 (예: 독서)" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKeyword(); } }} disabled={registeredKeywords.length >= 5} />
          <Button variant="outline-secondary" onClick={handleAddKeyword} className="ms-2" disabled={registeredKeywords.length >= 5}>추가</Button>
        </div>
      </Form.Group>

      <div className="mb-4">
        <Form.Label>등록된 키워드</Form.Label>
        <Row xs={1} sm={2} md={3} lg={4} xl={5} className="g-2">
          {registeredKeywords.map((kw, index) => (
            <Col key={index}>
              <div className="d-flex align-items-center justify-content-between p-2 border rounded bg-light"><span>{kw}</span><Button variant="light" size="sm" onClick={() => handleDeleteRegisteredKeyword(kw)}>&times;</Button></div>
            </Col>
          ))}
        </Row>
      </div>

      <hr />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>{moment(selectedDate).format('YYYY년 MM월 DD일')} 기록</h2>
        <Button variant="secondary" onClick={() => handleAddLogForDate(selectedDate)}>이 날짜에 기록 추가</Button>
      </div>

      <ListGroup>
        {logsForSelectedDate.length > 0 ? (
          logsForSelectedDate.map(log => (
            <ListGroup.Item key={log.id} className="d-flex justify-content-between align-items-start">
              <div className="ms-2 me-auto" style={{ width: '100%' }}>
                <Link to={`/logs/${log.id}`} className="text-decoration-none text-dark"><p style={{ whiteSpace: 'pre-wrap', marginBottom: '0.5rem' }}>{log.content.substring(0, 150)}...</p></Link>
                <div className="d-flex justify-content-end align-items-center w-100">
                  <small className="text-muted me-auto">{new Date(log.created_at).toLocaleString()}</small>
                  <Button variant="link" size="sm" className="p-0 ms-2" onClick={() => navigate(`/edit-log/${log.id}`)}>✏️</Button>
                  <Button variant="link" size="sm" className="p-0 ms-1 text-danger" onClick={() => openDeleteModal(log.id)}>❌</Button>
                </div>
              </div>
            </ListGroup.Item>
          ))
        ) : (
          <ListGroup.Item>선택된 날짜에 기록이 없습니다.</ListGroup.Item>
        )}
      </ListGroup>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>기록 삭제 확인</Modal.Title></Modal.Header>
        <Modal.Body>정말로 이 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>취소</Button>
          <Button variant="danger" onClick={confirmDelete}>삭제</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDayModal} onHide={() => setShowDayModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{modalData.date ? moment(modalData.date).format('YYYY년 MM월 DD일') : ''} 상세 정보</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5><Badge bg="info">발견된 키워드</Badge></h5>
          <div className="mb-3">
            {modalData.keywords.length > 0 ? modalData.keywords.map((kw, i) => <Badge key={i} pill bg="primary" className="me-1">{kw}</Badge>) : <p className="text-muted">이 날짜에는 등록된 키워드가 포함된 기록이 없습니다.</p>}
          </div>
          <hr />
          <h5><Badge bg="info">기록 목록</Badge></h5>
          <ListGroup variant="flush">
            {modalData.logs.map(log => (
              <ListGroup.Item key={log.id} action onClick={() => navigate(`/logs/${log.id}`)}>
                {log.content.substring(0, 200)}...
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDayModal(false)}>닫기</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MainPage;