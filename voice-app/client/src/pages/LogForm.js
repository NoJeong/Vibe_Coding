import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Form, Button, Spinner, Alert } from 'react-bootstrap';
import moment from 'moment';
import toast from 'react-hot-toast';
import { ensureMockData, STORAGE_KEY } from '../mockData';
import { dispatchLogsUpdated } from '../utils/logStats';

// 로컬스토리지 접근을 담당하는 유틸 함수
const getLogsFromStorage = () => {
  // ensureMockData를 통해 항상 배열 형태의 로그 데이터를 얻는다.
  const { logs } = ensureMockData();
  return Array.isArray(logs) ? logs : [];
};

const saveLogsToStorage = (logs) => {
  // 저장 후 커스텀 이벤트를 발행해 헤더 통계나 다른 탭이 즉시 갱신되도록 한다.
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    dispatchLogsUpdated();
  } catch (_) {}
};

const LogForm = () => {
  // 새 로그 작성과 기존 로그 수정을 모두 처리하며 음성 입력 기능을 포함한다.
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
    // 네이티브 플러그인과 브라우저 SpeechRecognition 모두 안전하게 종료한다.
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
    // 가능한 경우 오프라인 STT 플러그인을 우선 사용하고, 실패하면 웹 Speech API를 사용한다.
    if (isListening) {
      stopRecognition();
      return;
    }

    if (offlineStt) {
      try {
        finalTranscriptRef.current = content;
        sttListenerRef.current = await offlineStt.addListener('sttResult', ({ text, isFinal }) => {
          // 플러그인이 전달하는 중간/최종 결과를 합칠 때 중복 단어가 생기지 않도록 관리한다.
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
    // 브라우저에서만 제공되는 기능이므로 미지원 환경에서는 오류 토스트를 보여준다.
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
      // 이벤트 버퍼에 담긴 결과를 순회하면서 최종/중간 본문을 각각 누적한다.
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
      // 마이크 권한 거부 등 오류 메시지를 사용자에게 안내하고 인식을 중단한다.
      toast.error(`음성 인식 오류: ${event.error}`);
      stopRecognition();
    };

    recognition.onend = () => {
      stopRecognition();
    };

    recognition.start();
  };

  useEffect(() => {
    // 수정 모드라면 기존 로그 내용을 불러오고, 새 작성이라면 선택한 날짜를 기본값으로 사용한다.
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
    // 폼 제출 시 음성 인식을 끝내고 신규/수정 여부에 따라 로그 배열을 갱신한다.
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

