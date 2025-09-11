import React, { useState, useEffect, useMemo } from 'react';
import { Button, Spinner, Alert, ListGroup, Form, Row, Col } from 'react-bootstrap';
// import { LinkContainer } from 'react-router-bootstrap'; // Removed LinkContainer
import { Link } from 'react-router-dom'; // Import Link from react-router-dom
import Calendar from 'react-calendar';
import moment from 'moment';
import 'react-calendar/dist/Calendar.css'; // react-calendar 기본 CSS

import { allMockLogs } from '../mockData.js'; // Import all mock logs

// --- Registered Keywords (Hardcoded for now) --- //
const REGISTERED_KEYWORDS = ['공부', '운동', 'React', '알고리즘', '헬스장'];

const MainPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [logsForSelectedDate, setLogsForSelectedDate] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calendarValue, setCalendarValue] = useState(new Date());
  const [searchKeyword, setSearchKeyword] = useState(''); // Renamed from keyword

  const [registeredKeywords, setRegisteredKeywords] = useState(['공부', '운동', 'React', '알고리즘', '헬스장']); // Dynamic registered keywords
  const [newKeyword, setNewKeyword] = useState('');

  // Simulate fetching all logs for calendar highlighting
  const allLogsMap = useMemo(() => {
    const map = new Map();
    allMockLogs.forEach(log => {
      const date = moment(log.created_at).format('YYYY-MM-DD');
      if (!map.has(date)) {
        map.set(date, []);
      }
      map.get(date).push(log);
    });
    return map;
  }, []);

  useEffect(() => {
    // Simulate loading logs for the selected date
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      try {
        const dateKey = moment(selectedDate).format('YYYY-MM-DD');
        let logs = allLogsMap.get(dateKey) || [];
        
        // Filter logs by searchKeyword if present
        if (searchKeyword) {
          const lowerCaseSearchKeyword = searchKeyword.toLowerCase();
          logs = logs.filter(log => 
            log.title.toLowerCase().includes(lowerCaseSearchKeyword) || 
            log.content.toLowerCase().includes(lowerCaseSearchKeyword)
          );
        }

        setLogsForSelectedDate(logs);
        setLoading(false);
      } catch (e) {
        setError('기록을 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedDate, allLogsMap, searchKeyword]);

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setCalendarValue(date);
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !registeredKeywords.includes(newKeyword.trim())) {
      setRegisteredKeywords([...registeredKeywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const handleDeleteRegisteredKeyword = (keywordToDelete) => {
    setRegisteredKeywords(registeredKeywords.filter(kw => kw !== keywordToDelete));
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateKey = moment(date).format('YYYY-MM-DD');
      const logsForDay = allLogsMap.get(dateKey) || [];
      let classes = [];

      if (logsForDay.length > 0) {
        classes.push('has-log');
      }

      // Check if any log for the day contains the searchKeyword
      if (searchKeyword) {
        const lowerCaseSearchKeyword = searchKeyword.toLowerCase();
        const hasSearchKeyword = logsForDay.some(log => 
          log.title.toLowerCase().includes(lowerCaseSearchKeyword) || 
          log.content.toLowerCase().includes(lowerCaseSearchKeyword)
        );
        if (hasSearchKeyword) {
          classes.push('has-search-keyword');
        }
      }

      // Check if any log for the day contains any of the registered keywords
      const hasRegisteredKeyword = registeredKeywords.some(regKeyword => {
        const lowerCaseRegKeyword = regKeyword.toLowerCase();
        return logsForDay.some(log => 
          log.title.toLowerCase().includes(lowerCaseRegKeyword) || 
          log.content.toLowerCase().includes(lowerCaseRegKeyword)
        );
      });
      if (hasRegisteredKeyword) {
        classes.push('has-registered-keyword');
      }

      return classes.length > 0 ? classes : null;
    }
    return null;
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateKey = moment(date).format('YYYY-MM-DD');
      const logsForDay = allLogsMap.get(dateKey) || [];

      if (logsForDay.length > 0) {
        const foundKeywords = new Set();
        registeredKeywords.forEach(regKeyword => {
          const lowerCaseRegKeyword = regKeyword.toLowerCase();
          const isPresent = logsForDay.some(log => 
            log.title.toLowerCase().includes(lowerCaseRegKeyword) || 
            log.content.toLowerCase().includes(lowerCaseRegKeyword)
          );
          if (isPresent) {
            foundKeywords.add(regKeyword);
          }
        });

        const keywordsArray = Array.from(foundKeywords);
        if (keywordsArray.length > 0) {
          return (
            <div className="log-keywords">
              {keywordsArray.map((kw, index) => (
                <div key={index} className="keyword-tag">{kw}</div>
              ))}
            </div>
          );
        }
      }
    }
    return null;
  };

  // Placeholder for Voice Input functionality
  const handleVoiceInputStart = () => {
    alert('음성 기록 시작 (기능 구현 예정)');
    // Actual Web Speech API integration will go here
  };

  const handleVoiceInputStop = () => {
    alert('음성 기록 중지 (기능 구현 예정)');
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>나의 기록 캘린더</h1>
        <Button variant="primary" onClick={handleVoiceInputStart}>음성 기록 시작</Button>
      </div>

      <Form.Group className="mb-3" controlId="searchKeywordInput">
        <Form.Label>키워드 검색</Form.Label>
        <Form.Control
          type="text"
          placeholder="캘린더에서 찾을 키워드를 입력하세요 (예: 공부, 운동)"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId="newKeywordInput">
        <Form.Label>등록할 키워드</Form.Label>
        <div className="d-flex">
          <Form.Control
            type="text"
            placeholder="새 키워드를 입력하세요 (예: 독서)"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKeyword(); } }}
          />
          <Button variant="outline-secondary" onClick={handleAddKeyword} className="ms-2">추가</Button>
        </div>
      </Form.Group>

      <div className="mb-4">
        <Form.Label>등록된 키워드</Form.Label>
        <Row xs={1} sm={2} md={3} lg={4} xl={5} className="g-2">
          {registeredKeywords.length > 0 ? (
            registeredKeywords.map((kw, index) => (
              <Col key={index}>
                <div className="d-flex align-items-center justify-content-between p-2 border rounded bg-light">
                  <span>{kw}</span>
                  <Button variant="light" size="sm" onClick={() => handleDeleteRegisteredKeyword(kw)}>
                    &times;
                  </Button>
                </div>
              </Col>
            ))
          ) : (
            <Col><div className="p-2 text-muted">등록된 키워드가 없습니다.</div></Col>
          )}
        </Row>
      </div>

      <div className="d-flex justify-content-center mb-4">
        <Calendar
          onChange={handleDateChange}
          value={calendarValue}
          locale="ko-KR"
          tileClassName={tileClassName}
          formatDay={(locale, date) => date.getDate()} // Only show day number
          className="voice-calendar" // Custom class for sizing
          tileContent={tileContent} // Render custom content inside tiles
        />
      </div>

      <hr />

      <h2>{moment(selectedDate).format('YYYY년 MM월 DD일')} 기록</h2>
      {loading ? (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : error ? (
        <Alert variant="danger">
          <Alert.Heading>오류 발생!</Alert.Heading>
          <p>{error}</p>
        </Alert>
      ) : (
        <>
          <ListGroup>
            {logsForSelectedDate.length > 0 ? (
              logsForSelectedDate.map(log => (
                <ListGroup.Item action as={Link} to={`/logs/${log.id}`} key={log.id}> 
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="ms-2 me-auto">
                      <div className="fw-bold">{log.title}</div>
                      <small>{log.content.substring(0, 50)}...</small>
                    </div>
                    <small>{new Date(log.created_at).toLocaleTimeString()}</small>
                  </div>
                </ListGroup.Item>
              ))
            ) : (
              <ListGroup.Item>선택된 날짜에 기록이 없습니다.</ListGroup.Item>
            )}
          </ListGroup>

          {/* Removed pagination as it's not needed for calendar view */}
        </>
      )}
    </div>
  );
};

export default MainPage;