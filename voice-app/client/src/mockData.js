const createMockLogs = (num) => {
  const logs = [];
  for (let i = 1; i <= num; i++) {
    const type = i % 2 === 0 ? '공부' : '운동';
    const activity = type === '공부' ? `React ${i % 5 + 1}시간, 알고리즘 ${i % 3 + 1}문제` : `헬스장 ${i % 4 + 1}시간, 유산소 ${i % 2 + 1}0분`;
    logs.push({
      id: i,
      // title: `오늘의 ${type} 기록 ${i}`, // Title is removed
      content: `이것은 ${i}번째 ${type} 기록입니다.\n\n${activity}을(를) 했습니다.`, 
      created_at: new Date(Date.now() - i * 1000 * 60 * 60 * (24 - i)).toISOString(),
    });
  }
  return logs.reverse(); // 최신 기록이 위로 오도록
};

export const allMockLogs = createMockLogs(55); // 55개의 가짜 기록 생성
export const LOGS_PER_PAGE = 20;
// --- End of Mock Data --- //