export const DEFAULT_KEYWORDS = ["국어", "미적분", "물리", "코딩", "운동"];

const SUBJECT_TEMPLATES = [
  {
    title: "아침 자습 - 국어 현대시 감상",
    body: "아침 자습 시간에 현대시 비유법을 정리하고 수행평가 대비 감상문 초안을 작성했다. 친구들과 서로 문장을 읽어 주며 피드백을 나눴다.",
    keywords: ["국어"],
  },
  {
    title: "저녁 스터디 - 미적분 심화 문제 풀이",
    body: "학원에서 받은 미적분 심화 문제집을 풀며 수열의 극한과 도함수 그래프를 복습했다. 어려웠던 문제는 노트에 다시 정리했다.",
    keywords: ["미적분"],
  },
  {
    title: "과학실 실험 - 물리 전자기 유도",
    body: "물리 수행평가 준비로 패러데이 전자기 유도 실험을 다시 진행했다. 전압 변화 데이터를 엑셀로 정리하고 실험 보고서 초안을 작성했다.",
    keywords: ["물리"],
  },
  {
    title: "정보 동아리 - 코딩 알고리즘 연습",
    body: "정보 올림피아드 대비로 파이썬으로 그래프 탐색 문제를 풀었다. BFS와 DFS 차이를 동아리 친구들과 토론하며 코드 리뷰를 진행했다.",
    keywords: ["코딩"],
  },
  {
    title: "체육부 훈련 - 기초 체력 보강",
    body: "야간 자율학습 전 농구부 러닝과 플랭크, 스트레칭으로 기초 체력을 보강했다. 훈련 일지를 작성하며 컨디션을 점검했다.",
    keywords: ["운동"],
  },
  {
    title: "국어 수행 + 코딩 동아리 발표 준비",
    body: "국어 수행평가 대본을 정리하고, 코딩 동아리에서 발표할 앱 목업을 친구들과 점검했다. 발표 자료에 사용할 스토리보드를 완성했다.",
    keywords: ["국어", "코딩"],
  },
  {
    title: "방과후 - 미적분 & 물리 개념 복습",
    body: "방과후 자율 학습실에서 미적분 기말 범위를 복습하고, 물리 전기에너지 단원을 요약했다. 이해가 어려운 공식은 선생님께 질문했다.",
    keywords: ["미적분", "물리"],
  },
  {
    title: "아침 스트레칭 - 운동 루틴 유지",
    body: "등교 전에 간단한 스트레칭과 스쿼트, 윗몸 일으키기로 몸을 깨웠다. 체력 관리가 공부 집중력에 도움이 된다는 걸 다시 느꼈다.",
    keywords: ["운동"],
  },
  {
    title: "코딩 프로젝트 - 미적분 시각화",
    body: "코딩 동아리에서 미적분 함수 그래프를 시각화하는 미니 프로젝트를 진행했다. 파이썬 matplotlib로 결과를 공유했다.",
    keywords: ["코딩", "미적분"],
  },
  {
    title: "국어 토론 + 물리 실험 정리",
    body: "국어 시간에 소설 속 인물 심리를 두고 토론했고, 점심시간에는 물리 실험 노트를 마저 정리했다. 두 과목 모두 수행평가 대비였다.",
    keywords: ["국어", "물리"],
  },
];

const createMockLogs = (count) => {
  const logs = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const template = SUBJECT_TEMPLATES[i % SUBJECT_TEMPLATES.length];
    const entryDate = new Date(now);
    entryDate.setDate(entryDate.getDate() - i);
    entryDate.setHours(21 - (i % 4) * 2, (i * 13) % 60, 0, 0);

    logs.push({
      id: entryDate.getTime(),
      content: `${template.title}

${template.body}`,
      keywords: template.keywords,
      created_at: entryDate.toISOString(),
    });
  }
  return logs;
};

export const allMockLogs = createMockLogs(55);
export const LOGS_PER_PAGE = 20;
export const STORAGE_KEY = "voiceLogs";
export const SAVED_KEYWORDS_KEY = "savedKeywords";

export const ensureMockData = () => {
  const fallback = { logs: allMockLogs, keywords: DEFAULT_KEYWORDS };
  if (typeof window === "undefined" || !window.localStorage) {
    return fallback;
  }
  try {
    let logsRaw = window.localStorage.getItem(STORAGE_KEY);
    let keywordsRaw = window.localStorage.getItem(SAVED_KEYWORDS_KEY);

    if (!logsRaw) {
      logsRaw = JSON.stringify(allMockLogs);
      window.localStorage.setItem(STORAGE_KEY, logsRaw);
    }
    if (!keywordsRaw) {
      keywordsRaw = JSON.stringify(DEFAULT_KEYWORDS);
      window.localStorage.setItem(SAVED_KEYWORDS_KEY, keywordsRaw);
    }

    let logs;
    try {
      logs = JSON.parse(logsRaw);
    } catch (_) {
      logs = null;
    }
    let keywords;
    try {
      keywords = JSON.parse(keywordsRaw);
    } catch (_) {
      keywords = null;
    }

    const needsReseed =
      !Array.isArray(logs) ||
      logs.length === 0 ||
      logs.every((log) => !Array.isArray(log?.keywords) || log.keywords.length === 0);

    if (needsReseed) {
      logs = allMockLogs;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } else {
      logs = logs.map((log, idx) => {
        if (!Array.isArray(log?.keywords) || log.keywords.length === 0) {
          const template = SUBJECT_TEMPLATES[idx % SUBJECT_TEMPLATES.length];
          return { ...log, keywords: template.keywords };
        }
        return log;
      });
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    }

    if (!Array.isArray(keywords) || keywords.length === 0) {
      keywords = DEFAULT_KEYWORDS;
      window.localStorage.setItem(SAVED_KEYWORDS_KEY, JSON.stringify(DEFAULT_KEYWORDS));
    }

    return {
      logs,
      keywords,
    };
  } catch (err) {
    console.warn("Failed to ensure mock data", err);
    return fallback;
  }
};

// --- End of Mock Data --- //
