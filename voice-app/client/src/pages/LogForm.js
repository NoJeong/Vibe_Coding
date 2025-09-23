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

const LogForm = () => {
  const [content, setContent] = useState('');
  const [logDate, setLogDate] = useState(moment().format('YYYY-MM-DD'));
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = !!id;

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const lastFinalChunkRef = useRef('');
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
          const chunk = String(text).trim();
          if (isFinal) {
            // Many engines emit cumulative final text. If the new chunk starts with the
            // current final transcript, treat it as an update rather than an append.
            const base = finalTranscriptRef.current.trim();
            if (chunk) {
              if (chunk.startsWith(base)) {
                // Replace with cumulative final
                finalTranscriptRef.current = (chunk + ' ').replace(/\s+/g, ' ');
              } else if (base.endsWith(chunk)) {
                // Duplicate tail; ignore
                // no change
              } else if (chunk === lastFinalChunkRef.current) {
                // Same final emitted again; ignore
              } else {
                finalTranscriptRef.current = (base + ' ' + chunk + ' ').replace(/\s+/g, ' ');
              }
              lastFinalChunkRef.current = chunk;
            }
            setContent(finalTranscriptRef.current);
          } else {
            // Interim: show preview as final + interim
            setContent((finalTranscriptRef.current + chunk).replace(/\s+/g, ' '));
          }
        });
        await offlineStt.start({ language: 'ko-KR' });
        setIsListening(true);
        return;
      } catch (e) {
        toast.error('오프라인 음성인식 시작 실패. 브라우저 음성인식으로 시도하세요.');
      }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('이 환경에서는 음성 인식이 지원되지 않습니다.');
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
        const segRaw = event.results[i][0]?.transcript ?? '';
        if (event.results[i].isFinal) {
          const seg = String(segRaw).trim();
          const base = finalTranscript.trim();
          if (seg) {
            if (seg.startsWith(base)) {
              finalTranscript = seg + ' ';
            } else if (!base.endsWith(seg) && seg !== lastFinalChunkRef.current) {
              finalTranscript = (base + ' ' + seg + ' ').replace(/\s+/g, ' ');
            }
            lastFinalChunkRef.current = seg;
          }
        } else {
          interimTranscript += segRaw;
        }
      }
      finalTranscriptRef.current = finalTranscript;
      setContent((finalTranscript + interimTranscript).replace(/\s+/g, ' '));
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
      } else {
        toast.error('해당 기록을 찾을 수 없습니다.');
        setError('Invalid log id');
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
      allLogs = allLogs.map(log => log.id === logId ? { ...log, content, created_at: moment(logDate).toISOString() } : log);
    } else {
      allLogs = [{ id: Date.now(), content, created_at: moment(logDate).toISOString() }, ...allLogs];
    }
    saveLogsToStorage(allLogs);
    setIsLoading(false);
    toast.success(isEditing ? '기록이 수정되었습니다.' : '새 기록이 생성되었습니다.');
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
              {isListening ? '음성 인식 중' : '음성으로 입력'}
            </Button>
          </div>
          <Form.Control as="textarea" rows={10} placeholder="음성 입력 버튼을 누르거나, 직접 입력하세요" value={content} onChange={(e) => setContent(e.target.value)} required />
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
