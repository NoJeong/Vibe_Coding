import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Spinner, Alert, ButtonGroup } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { allMockPosts } from '../mockData.js'; // Import mock data

const PostDetailPage = () => {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  // <<-- 기존 fetch 로직은 주석 처리 -->>
  /*
  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:3001/api/posts/${id}`);
        if (!response.ok) {
          throw new Error('게시글을 찾을 수 없습니다.');
        }
        const data = await response.json();
        setPost(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);
  */

  // <<-- 가짜 데이터를 사용하는 새로운 useEffect -->>
  useEffect(() => {
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      const postId = parseInt(id, 10);
      const foundPost = allMockPosts.find(p => p.id === postId);
      if (foundPost) {
        setPost(foundPost);
      } else {
        setError('해당 ID의 게시글을 찾을 수 없습니다.');
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [id]);

  const handleDelete = async () => {
    // Mock data cannot be deleted from the frontend, so we just simulate it.
    if (window.confirm('정말로 이 게시글을 삭제하시겠습니까? (가짜 데이터라 실제 삭제는 안됩니다)')) {
      alert('삭제 시뮬레이션 완료!');
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error || !post) {
    return (
      <Alert variant="danger">
        <Alert.Heading>오류 발생!</Alert.Heading>
        <p>{error || '게시글을 찾을 수 없습니다.'}</p>
        <Button variant="secondary" onClick={() => navigate('/')}>목록으로 돌아가기</Button>
      </Alert>
    );
  }

  return (
    <Card>
      <Card.Header as="h5">{post.title}</Card.Header>
      <Card.Body>
        <Card.Text style={{ whiteSpace: 'pre-wrap', minHeight: '200px' }}>
          {post.content}
        </Card.Text>
      </Card.Body>
      <Card.Footer className="d-flex justify-content-between align-items-center">
        <small className="text-muted">
          작성일: {new Date(post.created_at).toLocaleString()}
        </small>
        <ButtonGroup>
          <LinkContainer to={`/edit-post/${id}`}>
            <Button variant="outline-secondary" size="sm">수정</Button>
          </LinkContainer>
          <Button variant="outline-danger" size="sm" onClick={handleDelete}>
            삭제
          </Button>
        </ButtonGroup>
      </Card.Footer>
    </Card>
  );
};

export default PostDetailPage;
