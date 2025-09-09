
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const PostForm = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      const fetchPost = async () => {
        try {
          const response = await fetch(`http://localhost:3001/api/posts/${id}`);
          if (!response.ok) {
            throw new Error('Post not found');
          }
          const data = await response.json();
          setTitle(data.title);
          setContent(data.content);
        } catch (error) {
          setError(error.message);
        } finally {
          setLoading(false);
        }
      };
      fetchPost();
    }
  }, [isEditing, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const postData = { title, content };

    const url = isEditing ? `http://localhost:3001/api/posts/${id}` : 'http://localhost:3001/api/posts';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        throw new Error('Failed to save the post.');
      }

      const savedPost = await response.json();
      navigate(isEditing ? `/posts/${id}` : `/posts/${savedPost.id}`);

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return <div>Loading post...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div>
      <h2>{isEditing ? '글 수정' : '새 글 작성'}</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="title">제목</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="content">내용</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows="10"
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? '저장 중...' : (isEditing ? '수정 완료' : '작성 완료')}
        </button>
      </form>
    </div>
  );
};

export default PostForm;
