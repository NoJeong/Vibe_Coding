
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
];
let nextId = 4;

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
