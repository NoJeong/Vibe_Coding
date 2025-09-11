import React, { useState, useEffect } from 'react';
import { ListGroup, Button, Spinner, Alert, Pagination } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { allMockPosts, POSTS_PER_PAGE } from '../mockData.js'; // Import mock data

const PostListPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // <<-- 기존 fetch 로직은 주석 처리 -->>
  /*
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:3001/api/posts?page=${page}&limit=${POSTS_PER_PAGE}`);
        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Network response was not ok: ${response.statusText} - ${errorData}`);
        }
        const data = await response.json();
        setPosts(data.posts);
        setTotalPages(data.totalPages);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [page]);
  */

  // <<-- 가짜 데이터를 사용하는 새로운 useEffect -->>
  useEffect(() => {
    setLoading(true);
    setError(null);

    // 0.5초 딜레이로 실제 네트워크처럼 보이게 함
    const timer = setTimeout(() => {
      try {
        const offset = (page - 1) * POSTS_PER_PAGE;
        const paginatedPosts = allMockPosts.slice(offset, offset + POSTS_PER_PAGE);
        
        setPosts(paginatedPosts);
        setTotalPages(Math.ceil(allMockPosts.length / POSTS_PER_PAGE));
        setLoading(false);
      } catch (e) {
        setError('가짜 데이터를 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer); // 컴포넌트 언마운트 시 타이머 제거
  }, [page]);


  const renderPagination = () => {
    if (totalPages <= 1) return null;
    let items = [];
    for (let number = 1; number <= totalPages; number++) {
      items.push(
        <Pagination.Item key={number} active={number === page} onClick={() => setPage(number)}>
          {number}
        </Pagination.Item>,
      );
    }
    return <Pagination>{items}</Pagination>;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>게시판</h1>
        <LinkContainer to="/new-post">
          <Button variant="primary">글쓰기</Button>
        </LinkContainer>
      </div>

      {loading ? (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : error ? (
        <Alert variant="danger">
          <Alert.Heading>오류 발생!</Alert.Heading>
          <p>{error}</p>
        </Alert>
      ) : (
        <>
          <ListGroup>
            {posts.length > 0 ? (
              posts.map(post => (
                <LinkContainer to={`/posts/${post.id}`} key={post.id}>
                  <ListGroup.Item action className="d-flex justify-content-between align-items-start">
                    <div className="ms-2 me-auto">
                      <div className="fw-bold">{post.title}</div>
                    </div>
                    <small>{new Date(post.created_at).toLocaleDateString()}</small>
                  </ListGroup.Item>
                </LinkContainer>
              ))
            ) : (
              <ListGroup.Item>게시글이 없습니다.</ListGroup.Item>
            )}
          </ListGroup>

          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              {renderPagination()}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PostListPage;