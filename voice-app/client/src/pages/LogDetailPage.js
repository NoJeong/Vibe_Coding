import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Button, Spinner, Alert, ButtonGroup } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { getLogsFromStorage as loadStoredLogs, dispatchLogsUpdated } from '../utils/logStats';
import { STORAGE_KEY } from '../mockData';

const saveLogsToStorage = (logs) => {
  // 현재 목록을 안전하게 저장하고 전역 이벤트를 발행해 다른 화면도 갱신한다.
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const safeLogs = Array.isArray(logs) ? logs : [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeLogs));
    dispatchLogsUpdated();
  } catch (_) {
    // 저장 실패는 사용자에게 노출하지 않는다.
  }
};

const LogDetailPage = () => {
  // 단일 로그의 본문을 보여주고 수정/삭제를 실행할 수 있는 상세 화면.
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // 짧은 지연을 준 뒤 로컬스토리지에서 해당 ID의 로그를 찾아 표시한다.
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      const logId = parseInt(id, 10);
      const foundLog = loadStoredLogs().find((entry) => entry.id === logId);
      if (foundLog) {
        setLog(foundLog);
      } else {
        setError('해당 ID의 기록을 찾을 수 없습니다.');
      }
      setLoading(false);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [id]);

  const handleDelete = () => {
    // 사용자가 실수로 삭제하지 않도록 확인 대화 상자를 먼저 띄운다.
    if (!window.confirm('정말로 이 기록을 삭제하시겠습니까? (되돌릴 수 없습니다)')) return;
    const logId = parseInt(id, 10);
    const nextLogs = loadStoredLogs().filter((entry) => entry.id !== logId);
    saveLogsToStorage(nextLogs);
    toast.success('기록이 삭제되었습니다.');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="text-center">
        <Spinner animation="border" />
      </div>
    );
  }

  if (error || !log) {
    return (
      <Alert variant="danger">
        <Alert.Heading>오류가 발생했습니다</Alert.Heading>
        <p>{error || '기록 정보를 불러오지 못했습니다.'}</p>
        <Button variant="secondary" onClick={() => navigate('/')}>목록으로 돌아가기</Button>
      </Alert>
    );
  }

  return (
    <Card>
      <Card.Header as="h5">{new Date(log.created_at).toLocaleDateString()} 기록</Card.Header>
      <Card.Body>
        <Card.Text style={{ whiteSpace: 'pre-wrap', minHeight: '200px' }}>
          {log.content}
        </Card.Text>
        {Array.isArray(log.keywords) && log.keywords.length ? (
          <div className="mt-2 d-flex flex-wrap gap-2">
            {log.keywords.map((keyword) => (
              <span key={keyword} className="badge bg-secondary">{keyword}</span>
            ))}
          </div>
        ) : null}
      </Card.Body>
      <Card.Footer className="d-flex justify-content-between align-items-center">
        <small className="text-muted">
          작성 시간: {new Date(log.created_at).toLocaleTimeString()}
        </small>
        <ButtonGroup>
          <Button as={Link} to={`/edit-log/${id}`} variant="outline-secondary" size="sm">수정</Button>
          <Button variant="outline-danger" size="sm" onClick={handleDelete}>삭제</Button>
        </ButtonGroup>
      </Card.Footer>
    </Card>
  );
};

export default LogDetailPage;
