// --- Mock Data --- //
const createMockPosts = (num) => {
  const posts = [];
  for (let i = 1; i <= num; i++) {
    posts.push({
      id: i,
      title: `가짜 데이터 제목 ${i}`,
      content: `이것은 ${i}번째 가짜 게시글의 내용입니다.\n\n여러 줄의 텍스트도 잘 표시되는지 확인하기 위한 문단입니다.`,
      created_at: new Date(Date.now() - i * 1000 * 60 * 60 * (24 - i)).toISOString(), // Add some variance to the dates
    });
  }
  return posts.reverse(); // 최신 글이 위로 오도록
};

export const allMockPosts = createMockPosts(55); // 55개의 가짜 게시글 생성
export const POSTS_PER_PAGE = 20;
// --- End of Mock Data --- //
