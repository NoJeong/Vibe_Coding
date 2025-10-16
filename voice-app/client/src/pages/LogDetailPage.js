import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Button, Spinner, Alert, ButtonGroup } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { getLogsFromStorage as loadStoredLogs, dispatchLogsUpdated } from '../utils/logStats';
import { STORAGE_KEY } from '../mockData';

const saveLogsToStorage = (logs) => {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const safeLogs = Array.isArray(logs) ? logs : [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeLogs));
    dispatchLogsUpdated();
  } catch (_) {
    // ignore storage errors
  }
};

const LogDetailPage = () => {
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      const logId = parseInt(id, 10);
      const foundLog = loadStoredLogs().find(p => p.id === logId);
      if (foundLog) {
        setLog(foundLog);
      } else {
        setError('해당 ID의 기록을 찾을 수 없습니다.');
      }
      setLoading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [id]);

  const handleDelete = () => {
    if (window.confirm('정말로 이 기록을 삭제하시겠습니까? (되돌릴 수 없음)')) {
      const logId = parseInt(id, 10);
      const nextLogs = loadStoredLogs().filter(p => p.id !== logId);
      saveLogsToStorage(nextLogs);
      toast.success('기록을 삭제했습니다.');
      navigate('/');
    }
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
        <Alert.Heading>오류 발생!</Alert.Heading>
        <p>{error || '기록을 찾을 수 없습니다.'}</p>
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
            {log.keywords.map((k) => (
              <span key={k} className="badge bg-secondary">{k}</span>
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
