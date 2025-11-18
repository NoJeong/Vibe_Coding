export const LOGS_PER_PAGE = 20;
export const STORAGE_KEY = "voiceLogs_v4";
export const SAVED_KEYWORDS_KEY = "savedKeywords_v4";

const LEGACY_LOG_KEYS = ["voiceLogs", "voiceLogs_v2", "voiceLogs_v3"]; 
const LEGACY_KEYWORD_KEYS = ["savedKeywords", "savedKeywords_v2", "savedKeywords_v3"]; 

const toArray = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

const normalizeLogs = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((entry) => entry && typeof entry === "object" && (entry.created_at || entry.createdAt))
    .map((entry) => ({
      id: entry.id ?? entry.created_at ?? entry.createdAt ?? Date.now(),
      content: (entry.content ?? "").toString(),
      keywords: Array.isArray(entry.keywords) ? entry.keywords.filter(Boolean) : [],
      created_at: entry.created_at || entry.createdAt,
    }));

export const ensureMockData = () => {
  const fallback = { logs: [], keywords: [] };
  if (typeof window === "undefined" || !window.localStorage) {
    return fallback;
  }
  try {
    // Remove legacy seeded data
    [...LEGACY_LOG_KEYS, ...LEGACY_KEYWORD_KEYS].forEach((key) => {
      try { window.localStorage.removeItem(key); } catch (_) {}
    });

    const rawLogs = window.localStorage.getItem(STORAGE_KEY);
    const rawKeywords = window.localStorage.getItem(SAVED_KEYWORDS_KEY);

    const logs = normalizeLogs(toArray(rawLogs));
    const keywords = toArray(rawKeywords).filter(Boolean);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    window.localStorage.setItem(SAVED_KEYWORDS_KEY, JSON.stringify(keywords));

    return { logs, keywords };
  } catch (err) {
    console.warn("Failed to load stored data", err);
    return fallback;
  }
};

export const loadStoredLogs = () => ensureMockData().logs;
export const loadStoredKeywords = () => ensureMockData().keywords;
