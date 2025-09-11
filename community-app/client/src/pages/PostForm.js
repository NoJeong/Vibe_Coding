import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Button, Spinner, Alert } from 'react-bootstrap';
import { allMockPosts } from '../mockData.js'; // Import mock data

const PostForm = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false); // For submission loading
  const [isFetching, setIsFetching] = useState(false); // For fetching post to edit
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  // <<-- 기존 fetch 로직은 주석 처리 -->>
  /*
  useEffect(() => {
    if (isEditing) {
      setIsFetching(true);
      const fetchPost = async () => {
        try {
          const response = await fetch(`http://localhost:3001/api/posts/${id}`);
          if (!response.ok) {
            throw new Error('게시글을 찾을 수 없습니다.');
          }
          const data = await response.json();
          setTitle(data.title);
          setContent(data.content);
        } catch (error) {
          setError(error.message);
        } finally {
          setIsFetching(false);
        }
      };
      fetchPost();
    }
  }, [isEditing, id]);
  */

  // <<-- 가짜 데이터를 사용하는 새로운 useEffect -->>
  useEffect(() => {
    if (isEditing) {
      setIsFetching(true);
      setError(null);
      const timer = setTimeout(() => {
        const postId = parseInt(id, 10);
        const foundPost = allMockPosts.find(p => p.id === postId);
        if (foundPost) {
          setTitle(foundPost.title);
          setContent(foundPost.content);
        } else {
          setError('해당 ID의 게시글을 찾을 수 없습니다.');
        }
        setIsFetching(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isEditing, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // --- Mock Submission --- //
    const timer = setTimeout(() => {
      const postData = { title, content, id: isEditing ? parseInt(id, 10) : Date.now() };
      console.log('Simulating post save: ', postData);
      setIsLoading(false);
      alert(isEditing ? '게시글 수정이 시뮬레이션되었습니다.' : '게시글 작성이 시뮬레이션되었습니다.');
      // Navigate to the detail page (or the new post's page)
      navigate(isEditing ? `/posts/${id}` : `/`);
    }, 1000);
    // --- End of Mock Submission --- //

    return () => clearTimeout(timer);
  };

  if (isFetching) {
    return (
      <div className="text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div>
      <h1>{isEditing ? '글 수정' : '새 글 작성'}</h1>
      <hr />
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="formTitle">
          <Form.Label>제목</Form.Label>
          <Form.Control
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formContent">
          <Form.Label>내용</Form.Label>
          <Form.Control
            as="textarea"
            rows={10}
            placeholder="내용을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </Form.Group>

        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

        <div className="d-grid gap-2 d-md-flex justify-content-md-end">
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={isLoading}>
            취소
          </Button>
          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? (
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
              />
            ) : (
              isEditing ? '수정 완료' : '작성 완료'
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default PostForm;
