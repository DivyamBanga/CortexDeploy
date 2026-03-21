const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database(path.join(__dirname, 'cortex.db'));

// WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS signups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cortex2024';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Get waitlist count
app.get('/api/count', (_req, res) => {
  const row = db.prepare('SELECT COUNT(*) as count FROM signups').get();
  res.json({ count: row.count });
});

// Signup
app.post('/api/signup', (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const trimmed = email.toLowerCase().trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  try {
    db.prepare('INSERT INTO signups (email) VALUES (?)').run(trimmed);
    const row = db.prepare('SELECT COUNT(*) as count FROM signups').get();
    res.json({ success: true, count: row.count });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: "You're already on the waitlist!" });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Admin — verify password
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const row = db.prepare('SELECT COUNT(*) as count FROM signups').get();
    res.json({ success: true, count: row.count });
  } else {
    res.status(401).json({ error: 'Wrong password.' });
  }
});

// Admin — get signups
app.post('/api/admin/signups', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  const signups = db.prepare('SELECT id, email, created_at FROM signups ORDER BY created_at DESC').all();
  res.json({ signups, total: signups.length });
});

// Admin page
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Cortex waitlist → http://localhost:${PORT}`);
});
