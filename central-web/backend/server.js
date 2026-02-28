require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'attendx-dev-secret-change-in-production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'attendex',
  connectionLimit: 10,
};

let pool;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.teacherId = payload.teacherId;
    req.username = payload.username;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// POST /api/auth/register — teacher sign up
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body || {};
  const user = (typeof username === 'string' ? username : '').trim();
  const pass = typeof password === 'string' ? password : '';

  if (!user || user.length < 2) {
    return res.status(400).json({ error: 'Username must be at least 2 characters' });
  }
  if (!pass || pass.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const db = await getPool();
    const [existing] = await db.execute(
      'SELECT id FROM teachers WHERE username = ?',
      [user]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const hash = await bcrypt.hash(pass, 10);
    await db.execute(
      'INSERT INTO teachers (username, password_hash) VALUES (?, ?)',
      [user, hash]
    );
    const [rows] = await db.execute(
      'SELECT id, username, created_at FROM teachers WHERE username = ?',
      [user]
    );
    const teacher = rows[0];
    const token = jwt.sign(
      { teacherId: teacher.id, username: teacher.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    res.status(201).json({
      teacher: { id: teacher.id, username: teacher.username, created_at: teacher.created_at },
      token,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = (typeof username === 'string' ? username : '').trim();
  const pass = typeof password === 'string' ? password : '';

  if (!user || !pass) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const db = await getPool();
    const [rows] = await db.execute(
      'SELECT id, username, password_hash, created_at FROM teachers WHERE username = ?',
      [user]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const teacher = rows[0];
    const ok = await bcrypt.compare(pass, teacher.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const token = jwt.sign(
      { teacherId: teacher.id, username: teacher.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    res.json({
      teacher: { id: teacher.id, username: teacher.username, created_at: teacher.created_at },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me — current teacher (protected)
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const db = await getPool();
    const [rows] = await db.execute(
      'SELECT id, username, created_at FROM teachers WHERE id = ?',
      [req.teacherId]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Teacher not found' });
    }
    res.json({ teacher: rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ——— Classrooms ———
// GET /api/classrooms — list teacher's classrooms
app.get('/api/classrooms', authMiddleware, async (req, res) => {
  try {
    const db = await getPool();
    const [rows] = await db.execute(
      'SELECT id, name, subject_name, subject_id, section, max_students, room, created_at FROM classrooms WHERE teacher_id = ? ORDER BY name',
      [req.teacherId]
    );
    res.json({ classrooms: rows });
  } catch (err) {
    console.error('Classrooms list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/classrooms — create classroom
app.post('/api/classrooms', authMiddleware, async (req, res) => {
  const b = req.body || {};
  const subjectName = (b.subject_name != null) ? String(b.subject_name).trim() : '';
  const subjectId = (b.subject_id != null) ? String(b.subject_id).trim() : null;
  const section = (b.section != null) ? String(b.section).trim() : null;
  const room = (b.room != null) ? String(b.room).trim() : null;
  let maxStudents = null;
  if (b.max_students != null && b.max_students !== '') {
    const n = parseInt(b.max_students, 10);
    if (Number.isInteger(n) && n > 0) maxStudents = n;
  }
  const name = (b.name != null) ? String(b.name).trim() : '';
  const displayName = name || (subjectName && section ? `${subjectName} — ${section}` : subjectName || 'Unnamed class');
  if (!displayName) {
    return res.status(400).json({ error: 'Subject name or class name is required' });
  }
  try {
    const db = await getPool();
    const [result] = await db.execute(
      'INSERT INTO classrooms (teacher_id, name, subject_name, subject_id, section, max_students, room) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.teacherId, displayName, subjectName || null, subjectId || null, section || null, maxStudents, room || null]
    );
    const [rows] = await db.execute(
      'SELECT id, name, subject_name, subject_id, section, max_students, room, created_at FROM classrooms WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json({ classroom: rows[0] });
  } catch (err) {
    console.error('Create classroom error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ——— Sessions ———
// Helper: generate unique 4-char code
async function generateSessionCode(db) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 50; i++) {
    let code = '';
    for (let j = 0; j < 4; j++) code += chars[Math.floor(Math.random() * chars.length)];
    const [existing] = await db.execute('SELECT id FROM attendance_sessions WHERE code = ?', [code]);
    if (existing.length === 0) return code;
  }
  throw new Error('Could not generate unique code');
}

// GET /api/sessions/ongoing — current ongoing session for this teacher
app.get('/api/sessions/ongoing', authMiddleware, async (req, res) => {
  try {
    const db = await getPool();
    const [sessions] = await db.execute(
      `SELECT s.id, s.classroom_id, s.code, s.started_at, s.created_at, c.name AS classroom_name
       FROM attendance_sessions s
       JOIN classrooms c ON c.id = s.classroom_id
       WHERE c.teacher_id = ? AND s.started_at IS NOT NULL AND s.ended_at IS NULL
       ORDER BY s.started_at DESC LIMIT 1`,
      [req.teacherId]
    );
    if (sessions.length === 0) {
      return res.json({ session: null });
    }
    const session = sessions[0];
    const [[{ total }]] = await db.execute(
      'SELECT COUNT(*) AS total FROM classroom_students WHERE classroom_id = ?',
      [session.classroom_id]
    );
    const [[{ checked }]] = await db.execute(
      'SELECT COUNT(*) AS checked FROM attendance_checks WHERE session_id = ?',
      [session.id]
    );
    res.json({
      session: {
        ...session,
        total_students: total,
        checked_count: checked,
      },
    });
  } catch (err) {
    console.error('Ongoing session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/sessions/recent?limit=5
app.get('/api/sessions/recent', authMiddleware, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
  try {
    const db = await getPool();
    const [rows] = await db.execute(
      `SELECT s.id, s.classroom_id, s.code, s.started_at, s.ended_at, s.created_at, c.name AS classroom_name
       FROM attendance_sessions s
       JOIN classrooms c ON c.id = s.classroom_id
       WHERE c.teacher_id = ?
       ORDER BY s.created_at DESC
       LIMIT ?`,
      [req.teacherId, limit]
    );
    const sessions = await Promise.all(
      rows.map(async (s) => {
        const [[{ total }]] = await db.execute(
          'SELECT COUNT(*) AS total FROM classroom_students WHERE classroom_id = ?',
          [s.classroom_id]
        );
        const [[{ checked }]] = await db.execute(
          'SELECT COUNT(*) AS checked FROM attendance_checks WHERE session_id = ?',
          [s.id]
        );
        return { ...s, total_students: total, checked_count: checked };
      })
    );
    res.json({ sessions });
  } catch (err) {
    console.error('Recent sessions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/sessions/history — full history (e.g. last 50)
app.get('/api/sessions/history', authMiddleware, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  try {
    const db = await getPool();
    const [rows] = await db.execute(
      `SELECT s.id, s.classroom_id, s.code, s.started_at, s.ended_at, s.created_at, c.name AS classroom_name
       FROM attendance_sessions s
       JOIN classrooms c ON c.id = s.classroom_id
       WHERE c.teacher_id = ?
       ORDER BY s.created_at DESC
       LIMIT ?`,
      [req.teacherId, limit]
    );
    const sessions = await Promise.all(
      rows.map(async (s) => {
        const [[{ total }]] = await db.execute(
          'SELECT COUNT(*) AS total FROM classroom_students WHERE classroom_id = ?',
          [s.classroom_id]
        );
        const [[{ checked }]] = await db.execute(
          'SELECT COUNT(*) AS checked FROM attendance_checks WHERE session_id = ?',
          [s.id]
        );
        return { ...s, total_students: total, checked_count: checked };
      })
    );
    res.json({ sessions });
  } catch (err) {
    console.error('Session history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/sessions — start new session (body: { classroom_id })
app.post('/api/sessions', authMiddleware, async (req, res) => {
  const classroomId = req.body && req.body.classroom_id != null ? parseInt(req.body.classroom_id, 10) : NaN;
  if (!Number.isInteger(classroomId) || classroomId < 1) {
    return res.status(400).json({ error: 'Valid classroom_id is required' });
  }
  try {
    const db = await getPool();
    const [owned] = await db.execute(
      'SELECT id, name FROM classrooms WHERE id = ? AND teacher_id = ?',
      [classroomId, req.teacherId]
    );
    if (owned.length === 0) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    const code = await generateSessionCode(db);
    const [result] = await db.execute(
      'INSERT INTO attendance_sessions (classroom_id, code, started_at) VALUES (?, ?, NOW())',
      [classroomId, code]
    );
    const [rows] = await db.execute(
      'SELECT id, classroom_id, code, started_at, created_at FROM attendance_sessions WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json({ session: rows[0], classroom_name: owned[0].name });
  } catch (err) {
    console.error('Start session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/sessions/:id/end — end session
app.post('/api/sessions/:id/end', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid session id' });
  }
  try {
    const db = await getPool();
    const [sessions] = await db.execute(
      'SELECT s.id FROM attendance_sessions s JOIN classrooms c ON c.id = s.classroom_id WHERE s.id = ? AND c.teacher_id = ?',
      [id, req.teacherId]
    );
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    await db.execute('UPDATE attendance_sessions SET ended_at = NOW() WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('End session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`AttendX API listening on http://0.0.0.0:${PORT}`);
});
