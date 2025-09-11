require('dotenv').config(); // .env 파일의 환경 변수를 로드
const express = require('express');
const cors = require('cors');
const postgres = require('postgres'); // postgres 라이브러리 import

const app = express();
const port = 3001;

// Supabase DB 접속 정보를 .env 파일에서 불러옵니다.
const sql = postgres(process.env.DATABASE_URL);

console.log('>>> Database connection setup complete.');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 1. Get all posts (with pagination)
app.get('/api/posts', async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    // 두 개의 쿼리를 동시에 실행
    const postsResult = await sql`SELECT * FROM posts ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    const totalResult = await sql`SELECT COUNT(*) FROM posts`;
    
    const totalPosts = parseInt(totalResult[0].count, 10);
    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
      posts: postsResult,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: totalPages
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// 2. Get a single post by id
app.get('/api/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await sql`SELECT * FROM posts WHERE id = ${id}`;

        if (result.length === 0) {
            return res.status(404).send('Post not found');
        }
        res.json(result[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// 3. Create a new post
app.post('/api/posts', async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).send('Title and content are required');
        }
        const newPost = await sql`INSERT INTO posts (title, content) VALUES (${title}, ${content}) RETURNING *`;
        res.status(201).json(newPost[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// 4. Update a post
app.put('/api/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;
        const result = await sql`UPDATE posts SET title = ${title}, content = ${content} WHERE id = ${id} RETURNING *`;

        if (result.length === 0) {
            return res.status(404).send('Post not found');
        }
        res.json(result[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// 5. Delete a post
app.delete('/api/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await sql`DELETE FROM posts WHERE id = ${id}`;

        if (result.count === 0) {
            return res.status(404).send('Post not found');
        }
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});