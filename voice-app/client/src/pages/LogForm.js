import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Form, Button, Spinner, Alert } from "react-bootstrap";
import moment from "moment";
import toast from "react-hot-toast";
import { ensureMockData, STORAGE_KEY } from "../mockData";
import { dispatchLogsUpdated } from "../utils/logStats";

// 로컬스토리지에 접근하는 유틸 함수
const getLogsFromStorage = () => {
  // ensureMockData가 정상 배열 상태로 로그 데이터를 돌려주므로 결과만 받아온다.
  const { logs } = ensureMockData();
  return Array.isArray(logs) ? logs : [];
};

const saveLogsToStorage = (logs) => {
  // 저장 후 커스텀 이벤트를 발행해 다른 화면도 즉시 갱신되도록 한다.
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    dispatchLogsUpdated();
  } catch (_) {}
};

const LogForm = () => {
  // 새 로그 작성과 기존 로그 수정을 모두 처리하며 음성 입력 기능을 포함한다.
  const [content, setContent] = useState("");
  const [logDate, setLogDate] = useState(moment().format("YYYY-MM-DD"));
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = !!id;

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const lastFinalChunkRef = useRef("");
  const sttListenerRef = useRef(null);
  const isNative = typeof window !== "undefined" && !!window.Capacitor?.getPlatform && window.Capacitor.getPlatform() !== "web";
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
    // 가능한 경우 네이티브 STT 플러그인을 먼저 사용하고 실패하면 Web Speech API로 대체한다.
    if (isListening) {
      stopRecognition();
      return;
    }

    if (offlineStt) {
      try {
        finalTranscriptRef.current = content;
        sttListenerRef.current = await offlineStt.addListener("sttResult", ({ text, isFinal }) => {
          // 플러그인이 전달하는 중간/최종 결과를 합쳐 중복 없이 관리한다.
          if (typeof text !== "string") return;
          const chunk = String(text).trim();
          if (isFinal) {
            const base = finalTranscriptRef.current.trim();
            if (chunk) {
              if (chunk.startsWith(base)) {
                finalTranscriptRef.current = (chunk + " ").replace(/\s+/g, " ");
              } else if (base.endsWith(chunk)) {
                // 동일한 꼬리 텍스트는 무시한다.
              } else if (chunk === lastFinalChunkRef.current) {
                // 이미 처리된 최종 결과는 무시한다.
              } else {
                finalTranscriptRef.current = (base + " " + chunk + " ").replace(/\s+/g, " ");
              }
              lastFinalChunkRef.current = chunk;
            }
            setContent(finalTranscriptRef.current);
          } else {
            // 중간 결과는 미리보기 형태로 보여준다.
            setContent((finalTranscriptRef.current + chunk).replace(/\s+/g, " "));
          }
        });
        await offlineStt.start({ language: "ko-KR" });
        setIsListening(true);
        return;
      } catch (e) {
        toast.error("네이티브 음성 인식을 시작하지 못했습니다. 브라우저 음성 인식을 시도합니다.");
      }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    // 브라우저에서 지원하지 않을 경우 사용자에게 안내한다.
    if (!SpeechRecognition) {
      toast.error("현재 환경에서는 브라우저 음성 인식이 지원되지 않습니다.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.lang = "ko-KR";
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      finalTranscriptRef.current = content;
    };

    recognition.onresult = (event) => {
      // 이벤트 버퍼에 쌓인 결과를 순회하며 최종/중간 본문을 각각 반영한다.
      let interimTranscript = "";
      let finalTranscript = finalTranscriptRef.current;
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const segRaw = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          const seg = String(segRaw).trim();
          const base = finalTranscript.trim();
          if (seg) {
            if (seg.startsWith(base)) {
              finalTranscript = seg + " ";
            } else if (!base.endsWith(seg) && seg !== lastFinalChunkRef.current) {
              finalTranscript = (base + " " + seg + " ").replace(/\s+/g, " ");
            }
            lastFinalChunkRef.current = seg;
          }
        } else {
          interimTranscript += segRaw;
        }
      }
      finalTranscriptRef.current = finalTranscript;
      setContent((finalTranscript + interimTranscript).replace(/\s+/g, " "));
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
    // 수정 모드라면 기존 로그 내용을 불러오고, 새 기록이라면 선택 날짜를 기본값으로 사용한다.
    if (isEditing) {
      setIsFetching(true);
      const allLogs = getLogsFromStorage();
      const logId = parseInt(id, 10);
      const foundLog = allLogs.find((entry) => entry.id === logId);
      if (foundLog) {
        setContent(foundLog.content);
        setLogDate(moment(foundLog.created_at).format("YYYY-MM-DD"));
      } else {
        toast.error("해당 기록을 찾을 수 없습니다.");
        setError("Invalid log id");
      }
      setIsFetching(false);
    } else if (location.state?.selectedDate) {
      setLogDate(moment(location.state.selectedDate).format("YYYY-MM-DD"));
    }
  }, [isEditing, id, location.state]);

  const handleSubmit = (event) => {
    // 폼 제출 시 음성 인식을 멈추고 신규/수정 로직에 따라 배열을 갱신한다.
    event.preventDefault();
    stopRecognition();
    setIsLoading(true);
    let allLogs = getLogsFromStorage();
    if (isEditing) {
      const logId = parseInt(id, 10);
      allLogs = allLogs.map((log) =>
        log.id === logId ? { ...log, content, created_at: moment(logDate).toISOString() } : log
      );
    } else {
      allLogs = [{ id: Date.now(), content, created_at: moment(logDate).toISOString() }, ...allLogs];
    }
    saveLogsToStorage(allLogs);
    setIsLoading(false);
    toast.success(isEditing ? "기록이 수정되었습니다." : "새 기록이 작성되었습니다.");
    navigate("/");
  };

  if (isFetching) {
    return <div className="text-center"><Spinner animation="border" /></div>;
  }

  return (
    <div>
      <h1>{isEditing ? "기록 수정" : "새 기록 작성"}</h1>
      <hr />
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="formLogDate">
          <Form.Label>기록 날짜</Form.Label>
          <Form.Control type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formContent">
          <div className="d-flex justify-content-between align-items-center">
            <Form.Label>기록 내용</Form.Label>
            <Button
              variant={isListening ? "danger" : "outline-primary"}
              size="sm"
              onClick={isListening ? stopRecognition : startRecognition}
            >
              {isListening ? "음성 인식 중지" : "음성으로 입력"}
            </Button>
          </div>
          <Form.Control
            as="textarea"
            rows={10}
            placeholder="음성 입력 버튼을 누르거나, 직접 입력해 주세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </Form.Group>

        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

        <div className="d-grid gap-2 d-md-flex justify-content-md-end">
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={isLoading}>취소</Button>
          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? <Spinner as="span" size="sm" /> : (isEditing ? "수정 완료" : "작성 완료")}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default LogForm;
