import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Form, Button, Spinner, Alert } from 'react-bootstrap';
import moment from 'moment';
import toast from 'react-hot-toast';

const getLogsFromStorage = () => {
  const logs = localStorage.getItem('voiceLogs');
  return logs ? JSON.parse(logs) : [];
};

const saveLogsToStorage = (logs) => {
  localStorage.setItem('voiceLogs', JSON.stringify(logs));
};

// Note: Saved(interest) keywords are now managed on MainPage only.

const LogForm = () => {
  const [content, setContent] = useState('');
  const [logDate, setLogDate] = useState(moment().format('YYYY-MM-DD'));
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [keywords, setKeywords] = useState([]);
  const [keywordInput, setKeywordInput] = useState('');
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = !!id;

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const sttListenerRef = useRef(null);
  const isNative = typeof window !== 'undefined' && !!window.Capacitor?.getPlatform && window.Capacitor.getPlatform() !== 'web';
  const offlineStt = isNative ? window.Capacitor?.Plugins?.OfflineStt : null;

  const stopRecognition = () => {
    if (offlineStt && isListening) {
      try { offlineStt.stop(); } catch (_) {}
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (sttListenerRef.current) {
      try { sttListenerRef.current.remove(); } catch (_) {}
      sttListenerRef.current = null;
    }
    setIsListening(false);
  };

  const startRecognition = async () => {
    if (isListening) {
      stopRecognition();
      return;
    }

    if (offlineStt) {
      try {
        finalTranscriptRef.current = content;
                sttListenerRef.current = await offlineStt.addListener('sttResult', ({ text, isFinal }) => {
          if (typeof text !== 'string') return;
          if (isFinal) {
            finalTranscriptRef.current += text + ' ';
            setContent(finalTranscriptRef.current);
          } else {
            setContent(finalTranscriptRef.current + text);
          }
        });
        await offlineStt.start({ language: 'ko-KR' });
        setIsListening(true);
        return;
      } catch (e) {
        toast.error('오프라인 음성 인식을 시작할 수 없습니다. 웹 음성 인식으로 시도합니다.');
      }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('이 환경에서는 웹 음성 인식을 지원하지 않습니다.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.lang = 'ko-KR';
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      finalTranscriptRef.current = content;
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = finalTranscriptRef.current;
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      finalTranscriptRef.current = finalTranscript;
      setContent(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event) => {
      toast.error(`음성 인식 오류: ${event.error}`);
      stopRecognition();
    };

    recognition.onend = () => {
      stopRecognition();
    };

    recognition.start();
  };

  

  useEffect(() => {
    if (isEditing) {
      setIsFetching(true);
      const allLogs = getLogsFromStorage();
      const logId = parseInt(id, 10);
      const foundLog = allLogs.find(p => p.id === logId);
      if (foundLog) {
        setContent(foundLog.content);
        setLogDate(moment(foundLog.created_at).format('YYYY-MM-DD'));
        setKeywords(Array.isArray(foundLog.keywords) ? foundLog.keywords : []);
      } else {
        toast.error('해당 기록을 찾을 수 없습니다.');
        setError('해당 ID의 기록을 찾을 수 없습니다.');
      }
      setIsFetching(false);
    } else if (location.state?.selectedDate) {
      setLogDate(moment(location.state.selectedDate).format('YYYY-MM-DD'));
    }
  }, [isEditing, id, location.state]);

  const handleSubmit = (e) => {
    e.preventDefault();
    stopRecognition();
    setIsLoading(true);
    let allLogs = getLogsFromStorage();
    if (isEditing) {
      const logId = parseInt(id, 10);
      allLogs = allLogs.map(log => log.id === logId ? { ...log, content, keywords, created_at: moment(logDate).toISOString() } : log);
    } else {
      allLogs = [{ id: Date.now(), content, keywords, created_at: moment(logDate).toISOString() }, ...allLogs];
    }
    saveLogsToStorage(allLogs);
    setIsLoading(false);
    toast.success(isEditing ? '기록을 수정했습니다.' : '새 기록을 생성했습니다.');
    navigate('/');
  };

  if (isFetching) {
    return <div className="text-center"><Spinner animation="border" /></div>;
  }

  return (
    <div>
      <h1>{isEditing ? '기록 수정' : '새 기록 작성'}</h1>
      <hr />
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="formLogDate">
          <Form.Label>기록 날짜</Form.Label>
          <Form.Control type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formContent">
          <div className="d-flex justify-content-between align-items-center">
            <Form.Label>기록 내용</Form.Label>
            <Button variant={isListening ? 'danger' : 'outline-primary'} size="sm" onClick={isListening ? stopRecognition : startRecognition}>
              {isListening ? '음성 인식 중지' : '음성으로 입력'}
            </Button>
          </div>
          <Form.Control as="textarea" rows={10} placeholder="음성으로 입력 버튼을 누르거나, 직접 입력하세요" value={content} onChange={(e) => setContent(e.target.value)} required />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formKeywords">
          <Form.Label>키워드</Form.Label>
          <div className="d-flex gap-2 mb-2">
            <Form.Control
              type="text"
              placeholder="쉼표 또는 Enter로 추가 (예: 운동, 회의)"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const k = keywordInput.trim();
                  if (k && !keywords.includes(k)) setKeywords((prev) => [...prev, k]);
                  setKeywordInput('');
                }
              }}
            />
            <Button
              variant="outline-secondary"
              onClick={(e) => {
                e.preventDefault();
                const k = keywordInput.trim();
                if (k && !keywords.includes(k)) setKeywords((prev) => [...prev, k]);
                setKeywordInput('');
              }}
            >추가</Button>
          </div>
          <div className="d-flex flex-wrap gap-2">
            {keywords.map((k) => (
              <span
                key={k}
                className="badge bg-secondary"
                style={{ cursor: 'pointer' }}
                onClick={() => setKeywords((prev) => prev.filter((x) => x !== k))}
                title="클릭하여 제거"
              >
                {k} ×
              </span>
            ))}
          </div>
        </Form.Group>

        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

        <div className="d-grid gap-2 d-md-flex justify-content-md-end">
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={isLoading}>취소</Button>
          <Button variant="primary" type="submit" disabled={isLoading}>{isLoading ? <Spinner as="span" size="sm" /> : (isEditing ? '수정 완료' : '작성 완료')}</Button>
        </div>
      </Form>
    </div>
  );
};

export default LogForm;
