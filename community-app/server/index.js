
const express = require('express');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory data store
let posts = [
  { id: 1, title: '첫 번째 게시글', content: '안녕하세요! 첫 번째 게시글입니다.' },
  { id: 2, title: '두 번째 게시글', content: '리액트와 노드로 만드는 커뮤니티' },
  { id: 3, title: '세 번째 게시글', content: '페이지네이션을 추가해봅시다.' },
  { id: 4, title: '네 번째 게시글', content: '더미 데이터입니다.' },
  { id: 5, title: '다섯 번째 게시글', content: '더미 데이터입니다.' },
  { id: 6, title: '여섯 번째 게시글', content: '더미 데이터입니다.' },
  { id: 7, title: '일곱 번째 게시글', content: '더미 데이터입니다.' },
  { id: 8, title: '여덟 번째 게시글', content: '더미 데이터입니다.' },
  { id: 9, title: '아홉 번째 게시글', content: '더미 데이터입니다.' },
  { id: 10, title: '열 번째 게시글', content: '더미 데이터입니다.' },
  { id: 11, title: '열한 번째 게시글', content: '더미 데이터입니다.' },
  { id: 12, title: '열두 번째 게시글', content: '더미 데이터입니다.' },
  { id: 13, title: '열세 번째 게시글', content: '더미 데이터입니다.' },
  { id: 14, title: '열네 번째 게시글', content: '더미 데이터입니다.' },
  { id: 15, title: '열다섯 번째 게시글', content: '더미 데이터입니다.' },
  { id: 16, title: '열여섯 번째 게시글', content: '더미 데이터입니다.' },
  { id: 17, title: '열일곱 번째 게시글', content: '더미 데이터입니다.' },
  { id: 18, title: '열여덟 번째 게시글', content: '더미 데이터입니다.' },
  { id: 19, title: '열아홉 번째 게시글', content: '더미 데이터입니다.' },
  { id: 20, title: '스무 번째 게시글', content: '더미 데이터입니다.' },
  { id: 21, title: '스물한 번째 게시글', content: '더미 데이터입니다.' },
  { id: 22, title: '스물두 번째 게시글', content: '더미 데이터입니다.' },
  { id: 23, title: '스물세 번째 게시글', content: '더미 데이터입니다.' },
  { id: 24, title: '스물네 번째 게시글', content: '더미 데이터입니다.' },
  { id: 25, title: '스물다섯 번째 게시글', content: '더미 데이터입니다.' },
  { id: 26, title: '스물여섯 번째 게시글', content: '더미 데이터입니다.' },
  { id: 27, title: '스물일곱 번째 게시글', content: '더미 데이터입니다.' },
  { id: 28, title: '스물여덟 번째 게시글', content: '더미 데이터입니다.' },
  { id: 29, title: '스물아홉 번째 게시글', content: '더미 데이터입니다.' },
  { id: 30, title: '서른 번째 게시글', content: '더미 데이터입니다.' }
];
let nextId = 31;

// 1. Get all posts (with pagination)
app.get('/api/posts', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const results = posts.slice(startIndex, endIndex);
  
  res.json({
    posts: results,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(posts.length / limit)
  });
});

// 2. Get a single post by id
app.get('/api/posts/:id', (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) {
    return res.status(404).send('Post not found');
  }
  res.json(post);
});

// 3. Create a new post
app.post('/api/posts', (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).send('Title and content are required');
  }
  const newPost = { id: nextId++, title, content };
  posts.push(newPost);
  res.status(201).json(newPost);
});

// 4. Update a post
app.put('/api/posts/:id', (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) {
    return res.status(404).send('Post not found');
  }

  const { title, content } = req.body;
  post.title = title || post.title;
  post.content = content || post.content;

  res.json(post);
});

// 5. Delete a post
app.delete('/api/posts/:id', (req, res) => {
  const postIndex = posts.findIndex(p => p.id === parseInt(req.params.id));
  if (postIndex === -1) {
    return res.status(404).send('Post not found');
  }
  posts.splice(postIndex, 1);
  res.status(204).send();
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
