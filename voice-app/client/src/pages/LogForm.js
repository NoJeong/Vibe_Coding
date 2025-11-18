import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Form, Button, Spinner, Alert } from "react-bootstrap";
import moment from "moment";
import toast from "react-hot-toast";
import { ensureMockData, STORAGE_KEY } from "../mockData";
import { dispatchLogsUpdated } from "../utils/logStats";

// 濡쒖뺄?ㅽ넗由ъ????묎렐?섎뒗 ?좏떥 ?⑥닔
const getLogsFromStorage = () => {
  // ensureMockData媛 ?뺤긽 諛곗뿴 ?곹깭濡?濡쒓렇 ?곗씠?곕? ?뚮젮二쇰?濡?寃곌낵留?諛쏆븘?⑤떎.
  const { logs } = ensureMockData();
  return Array.isArray(logs) ? logs : [];
};

const saveLogsToStorage = (logs) => {
  // ?????而ㅼ뒪? ?대깽?몃? 諛쒗뻾???ㅻⅨ ?붾㈃??利됱떆 媛깆떊?섎룄濡??쒕떎.
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    dispatchLogsUpdated();
  } catch (_) {}
};

const LogForm = () => {
  // ??濡쒓렇 ?묒꽦怨?湲곗〈 濡쒓렇 ?섏젙??紐⑤몢 泥섎━?섎ŉ ?뚯꽦 ?낅젰 湲곕뒫???ы븿?쒕떎.
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

  const normalizeChunk = (value = "") => value.replace(/\s+/g, " ").trim();
  const comparableChunk = (value = "") => normalizeChunk(value).replace(/[!?.,]/g, "");
  const mergeFinalChunk = (current = "", incoming = "", lastChunk = "") => {
    const base = normalizeChunk(current);
    const next = normalizeChunk(incoming);
    const prev = normalizeChunk(lastChunk);
    if (!next) return base;
    if (!base) return next;
    if (next === prev || next === base) return base;
    const baseComp = comparableChunk(base);
    const nextComp = comparableChunk(next);
    if (!baseComp) return next;
    if (nextComp.startsWith(baseComp) || nextComp.includes(baseComp)) return next;
    if (baseComp.startsWith(nextComp) || baseComp.includes(nextComp)) return base;
    if (baseComp.endsWith(nextComp)) return base;
    if (nextComp.endsWith(baseComp)) return next;
    return normalizeChunk(`${base} ${next}`);
  };
  const buildPreviewText = (finalText = "", interimText = "") => {
    const finalPart = normalizeChunk(finalText);
    const interimPart = interimText.replace(/\s+/g, " ").trim();
    if (!interimPart) return finalPart;
    if (!finalPart) return interimPart;
    return normalizeChunk(`${finalPart} ${interimPart}`);
  };
  const updateWithFinalChunk = (chunk) => {
    finalTranscriptRef.current = mergeFinalChunk(finalTranscriptRef.current, chunk, lastFinalChunkRef.current);
    lastFinalChunkRef.current = normalizeChunk(chunk);
    setContent(finalTranscriptRef.current);
  };

  const stopRecognition = () => {
    // ?ㅼ씠?곕툕 ?뚮윭洹몄씤怨?釉뚮씪?곗? SpeechRecognition 紐⑤몢 ?덉쟾?섍쾶 醫낅즺?쒕떎.
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
    // 媛?ν븳 寃쎌슦 ?ㅼ씠?곕툕 STT ?뚮윭洹몄씤??癒쇱? ?ъ슜?섍퀬 ?ㅽ뙣?섎㈃ Web Speech API濡??泥댄븳??
    if (isListening) {
      stopRecognition();
      return;
    }

    if (offlineStt) {
      try {
        finalTranscriptRef.current = normalizeChunk(content);
        lastFinalChunkRef.current = "";
        sttListenerRef.current = await offlineStt.addListener("sttResult", ({ text, isFinal }) => {
          // ?뚮윭洹몄씤???꾨떖?섎뒗 以묎컙/理쒖쥌 寃곌낵瑜??⑹퀜 以묐났 ?놁씠 愿由ы븳??
          if (typeof text !== "string") return;
          const chunk = String(text).trim();
          if (isFinal) {
            updateWithFinalChunk(chunk);
          } else {
            // 以묎컙 寃곌낵??誘몃━蹂닿린 ?뺥깭濡?蹂댁뿬以??
            setContent(buildPreviewText(finalTranscriptRef.current, chunk));
          }
        });
        await offlineStt.start({ language: "ko-KR" });
        setIsListening(true);
        return;
      } catch (e) {
        toast.error("기기 음성 인식을 시작하지 못했습니다. 브라우저 음성 입력을 대신 사용해 주세요.");
      }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    // 釉뚮씪?곗??먯꽌 吏?먰븯吏 ?딆쓣 寃쎌슦 ?ъ슜?먯뿉寃??덈궡?쒕떎.
    if (!SpeechRecognition) {
      toast.error("현재 환경에서는 브라우저 음성 입력을 지원하지 않습니다.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.lang = "ko-KR";
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      finalTranscriptRef.current = normalizeChunk(content);
      lastFinalChunkRef.current = "";
    };

    recognition.onresult = (event) => {
      // ?대깽??踰꾪띁???볦씤 寃곌낵瑜??쒗쉶?섎ŉ 理쒖쥌/以묎컙 蹂몃Ц??媛곴컖 諛섏쁺?쒕떎.
      let interimTranscript = "";
      let finalTranscript = finalTranscriptRef.current;
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const segRaw = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          const seg = String(segRaw).trim();
          finalTranscript = mergeFinalChunk(finalTranscript, seg, lastFinalChunkRef.current);
          lastFinalChunkRef.current = normalizeChunk(seg);
        } else {
          interimTranscript += segRaw;
        }
      }
      finalTranscriptRef.current = normalizeChunk(finalTranscript);
      setContent(buildPreviewText(finalTranscriptRef.current, interimTranscript));
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
    // ?섏젙 紐⑤뱶?쇰㈃ 湲곗〈 濡쒓렇 ?댁슜??遺덈윭?ㅺ퀬, ??湲곕줉?대씪硫??좏깮 ?좎쭨瑜?湲곕낯媛믪쑝濡??ъ슜?쒕떎.
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
    // ???쒖텧 ???뚯꽦 ?몄떇??硫덉텛怨??좉퇋/?섏젙 濡쒖쭅???곕씪 諛곗뿴??媛깆떊?쒕떎.
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
    toast.success(isEditing ? "기록이 수정되었습니다." : "새 기록이 저장되었습니다.");
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
              {isListening ? "음성 입력 중지" : "음성으로 입력"}
            </Button>
          </div>
          <Form.Control
            as="textarea"
            rows={10}
            placeholder="음성 입력 버튼을 누르거나 직접 입력해 주세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </Form.Group>

        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

        <div className="d-grid gap-2 d-md-flex justify-content-md-end">
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={isLoading}>취소</Button>
          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? <Spinner as="span" size="sm" /> : (isEditing ? "수정 완료" : "저장")}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default LogForm;

