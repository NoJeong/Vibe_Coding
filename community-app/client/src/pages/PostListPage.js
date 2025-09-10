
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const PostListPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1); // 현재 페이지 상태
  const [totalPages, setTotalPages] = useState(0); // 총 페이지 수 상태

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true); // 페이지 변경 시 로딩 상태 활성화
      try {
        // 페이지와 리밋을 쿼리 파라미터로 전달
        const response = await fetch(`http://localhost:3001/api/posts?page=${page}&limit=20`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setPosts(data.posts); // 현재 페이지의 게시물 설정
        setTotalPages(data.totalPages); // 전체 페이지 수 설정
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [page]); // page 상태가 변경될 때마다 fetchPosts 함수를 다시 실행

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null; // 페이지가 하나 이하면 렌더링 안함

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          style={{
            fontWeight: i === page ? 'bold' : 'normal',
            margin: '0 5px',
            padding: '5px 10px',
            cursor: 'pointer'
          }}
          disabled={i === page}
        >
          {i}
        </button>
      );
    }
    return <div>{pages}</div>;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>게시판</h2>
        <Link to="/new-post">
          <button>글쓰기</button>
        </Link>
      </div>

      {loading && <p>Loading posts...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!loading && !error && (
        <div>
          {posts.length > 0 ? (
            posts.map(post => (
              <div key={post.id} style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '1rem', marginBottom: '1rem' }}>
                <h3><Link to={`/posts/${post.id}`}>{post.title}</Link></h3>
              </div>
            ))
          ) : (
            <p>게시글이 없습니다.</p>
          )}
        </div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
        {renderPagination()}
      </div>
    </div>
  );
};

export default PostListPage;
