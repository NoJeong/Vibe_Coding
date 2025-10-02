import moment from 'moment';
import { ensureMockData } from '../mockData';

export const LOGS_UPDATED_EVENT = 'haesseum-logs-updated';

export const safeParseLogs = (source) => {
  if (!source) return [];
  try {
    const parsed = Array.isArray(source) ? source : JSON.parse(source);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry === 'object' && (entry.created_at || entry.createdAt))
      .map((entry) => ({ ...entry, created_at: entry.created_at || entry.createdAt }));
  } catch (error) {
    return [];
  }
};

export const getLogsFromStorage = () => {
  const { logs } = ensureMockData();
  return safeParseLogs(logs);
};

export const calculateLogStats = (logs) => {
  const sortedLogs = Array.isArray(logs)
    ? [...logs]
        .filter((log) => log && log.created_at)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    : [];
  const totalLogs = sortedLogs.length;
  const now = moment();
  const weekCount = sortedLogs.filter((log) => moment(log.created_at).isSame(now, 'week')).length;
  let streak = 0;
  const uniqueDays = Array.from(new Set(sortedLogs.map((log) => moment(log.created_at).format('YYYY-MM-DD'))));
  if (uniqueDays.length) {
    streak = 1;
    let prev = moment(uniqueDays[0], 'YYYY-MM-DD');
    for (let i = 1; i < uniqueDays.length; i += 1) {
      const cur = moment(uniqueDays[i], 'YYYY-MM-DD');
      const diff = prev.diff(cur, 'day');
      if (diff === 0) continue;
      if (diff === 1) {
        streak += 1;
        prev = cur;
        continue;
      }
      break;
    }
  }
  const lastLogMoment = sortedLogs[0] ? moment(sortedLogs[0].created_at) : null;
  return { totalLogs, weekCount, streak, lastLogMoment };
};

export const dispatchLogsUpdated = () => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  const eventName = LOGS_UPDATED_EVENT;
  try {
    window.dispatchEvent(new CustomEvent(eventName));
  } catch (_) {
    try {
      window.dispatchEvent(new Event(eventName));
    } catch (__) {
      /* ignore */
    }
  }
};
