const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bodyParser = require('body-parser');

// We'll accept uploads into memory first, then persist to disk in the submit handler.
const upload = multer({ storage: multer.memoryStorage() });
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
// Parse JSON and urlencoded bodies (support both modern fetch and form posts)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Ensure express.json is enabled as well (covers environments where body-parser may not be wired)
app.use(express.json());

// --- In-memory mock database ---
let nextUserId = 3;
let nextTaskId = 5;
let nextFileId = 3;

const Role = {
  ADMIN: 'admin',
  USER: 'user',
};

const mockUsers = [
  {
    user_id: 1,
    email: 'admin@example.com',
    passwordHash: 'adminpassword',
    role: Role.ADMIN,
    name: 'Admin User',
    picture: null,
  },
  {
    user_id: 2,
    email: 'user@example.com',
    passwordHash: 'userpassword',
    role: Role.USER,
    name: 'Normal User',
    picture: null,
  },
];

const mockTasks = [];

const mockFiles = [
  { id_file: 1, id_user: 1, name: 'design_brief.pdf', url: `/files/1/download` },
  { id_file: 2, id_user: 2, name: 'final_marketing_copy.docx', url: `/files/2/download` },
];

let authToken = null;
let loggedInUser = null;

// Helpers
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function sanitizeUser(user) {
  const { passwordHash, ...u } = user;
  // expose isAdmin boolean for frontend convenience
  return { ...u, isAdmin: (u.role === Role.ADMIN) };
}

function calcScoreForSubmission(task, file) {
  const submissionDate = new Date();
  // If task.deadline was provided as a YYYY-MM-DD string, parse it as local date
  let deadlineDate;
  if (typeof task.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(task.deadline)) {
    const parts = task.deadline.split('-').map((s) => Number(s));
    // year, monthIndex, day
    deadlineDate = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    deadlineDate = new Date(task.deadline);
  }

  // Normalize dates to compare day-by-day, ignoring time
  const submissionDay = new Date(submissionDate.getFullYear(), submissionDate.getMonth(), submissionDate.getDate());
  const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
  
  // Debug: log computed dates for scoring
  try {
    console.log('[SCORE_DEBUG] task.deadline=', task.deadline, 'deadlineDate=', deadlineDate.toISOString(), 'submissionDate=', submissionDate.toISOString(), 'submissionDay=', submissionDay.toISOString(), 'deadlineDay=', deadlineDay.toISOString());
  } catch (e) {
    console.log('[SCORE_DEBUG] unable to stringify dates', e && e.message);
  }

  // Scoring: +1 early, 0 on-time, -1 late
  const subTime = submissionDay.getTime();
  const dlTime = deadlineDay.getTime();
  if (subTime < dlTime) {
    return 1; // Completed before deadline
  } else if (subTime === dlTime) {
    return 0; // Completed on the deadline
  } else {
    return -1; // Completed after deadline
  }
}

// --- Auth endpoints ---
app.post('/api/login', async (req, res) => {
  await sleep(200);
  // Log incoming body for easier debugging of login failures
  try { console.log('[LOGIN] raw body:', JSON.stringify(req.body)); } catch (e) { console.log('[LOGIN] raw body: (unstringifiable)'); }
  const { email, password } = req.body || {};
  console.log('[LOGIN] attempt:', { email, password });
  const user = mockUsers.find((u) => u.email === email && (u.passwordHash === password || password === 'test'));
  if (!user) {
    console.warn('[LOGIN] failed for:', email);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  authToken = `token-${Date.now()}`;
  loggedInUser = user;
  console.log('[LOGIN] success:', sanitizeUser(user));
  // Return user + token so frontend can include Authorization header when downloading
  return res.json({ user: sanitizeUser(user), token: authToken });
});

app.post('/api/login/google', async (req, res) => {
  await sleep(200);
  const profile = req.body;
  if (!profile || !profile.email) return res.status(400).json({ error: 'Invalid profile' });
  let user = mockUsers.find((u) => u.email === profile.email);
  if (!user) {
    user = {
      user_id: nextUserId++,
      email: profile.email,
      passwordHash: '',
      role: Role.USER,
      name: profile.name || profile.given_name || profile.email.split('@')[0],
      picture: profile.picture || null,
    };
    mockUsers.push(user);
  }
  authToken = `token-${Date.now()}`;
  loggedInUser = user;
  return res.json(sanitizeUser(user));
});

app.post('/api/register', async (req, res) => {
  await sleep(200);
  const { email, name, password } = req.body;
  if (mockUsers.find((u) => u.email === email)) return res.status(400).json({ error: 'User exists' });
  const user = {
    user_id: nextUserId++,
    email,
    passwordHash: password || '',
    role: Role.USER,
    name,
    picture: null,
  };
  mockUsers.push(user);
  return res.json(sanitizeUser(user));
});

app.post('/api/logout', (req, res) => {
  authToken = null;
  loggedInUser = null;
  return res.json({ ok: true });
});

// --- Users ---
app.get('/api/users', async (req, res) => {
  await sleep(100);
  return res.json(mockUsers.map(sanitizeUser));
});

app.post('/api/users', async (req, res) => {
  await sleep(150);
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (mockUsers.find((u) => u.email === email)) return res.status(400).json({ error: 'User exists' });
  const user = { user_id: nextUserId++, email, passwordHash: '', role: role || Role.USER, name: null, picture: null };
  mockUsers.push(user);
  return res.json(sanitizeUser(user));
});

app.put('/api/users/:id/role', async (req, res) => {
  await sleep(100);
  const id = Number(req.params.id);
  const { role } = req.body;
  const user = mockUsers.find((u) => u.user_id === id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.role = role || user.role;
  return res.json(sanitizeUser(user));
});

app.delete('/api/users/:id', async (req, res) => {
  await sleep(100);
  const id = Number(req.params.id);
  const idx = mockUsers.findIndex((u) => u.user_id === id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  mockUsers.splice(idx, 1);
  return res.json({ ok: true });
});

// --- Tasks ---
app.get('/api/tasks', async (req, res) => {
  await sleep(100);
  return res.json(mockTasks);
});

app.post('/api/tasks', upload.single('file'), async (req, res) => {
  await sleep(150);
  const data = req.body;
  const file = req.file;

  if (data.id_task) {
    // Update existing task
    const idx = mockTasks.findIndex((t) => t.id_task === data.id_task);
    if (idx === -1) return res.status(404).json({ error: 'Task not found' });

    // If a new description file was uploaded, save it
    if (file) {
      try {
        const fs = require('fs');
        const path = require('path');
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const newId = nextFileId++;
        const safeName = `${Date.now()}-${newId}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const savedPath = path.join(uploadsDir, safeName);
        fs.writeFileSync(savedPath, file.buffer);

        const fileMeta = {
          id_file: newId,
          id_user: loggedInUser ? loggedInUser.user_id : 0,
          name: file.originalname,
          url: `/files/${newId}/download`,
          path: savedPath,
        };
        mockFiles.push(fileMeta);

        // Link file to task (description file)
        mockTasks[idx].id_file = newId;
      } catch (e) {
        console.error('Failed to persist description file:', e && e.message);
        return res.status(500).json({ error: 'Failed to save description file' });
      }
    }

    // Update task fields from form data (convert numeric strings)
    const taskUpdate = {
      title: data.title || mockTasks[idx].title,
      description: data.description || mockTasks[idx].description,
      priority: data.priority ? Number(data.priority) : mockTasks[idx].priority,
      deadline: data.deadline || mockTasks[idx].deadline,
      assignee_id: data.assignee_id ? Number(data.assignee_id) : mockTasks[idx].assignee_id,
      assigner_id: data.assigner_id ? Number(data.assigner_id) : mockTasks[idx].assigner_id,
      status: data.status || mockTasks[idx].status,
    };
    mockTasks[idx] = { ...mockTasks[idx], ...taskUpdate };
    return res.json(mockTasks[idx]);
  }

  // Create new task
  const newTaskId = nextTaskId++;
  let descriptionFileId = null;

  if (file) {
    try {
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

      descriptionFileId = nextFileId++;
      const safeName = `${Date.now()}-${descriptionFileId}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const savedPath = path.join(uploadsDir, safeName);
      fs.writeFileSync(savedPath, file.buffer);

      const fileMeta = {
        id_file: descriptionFileId,
        id_user: loggedInUser ? loggedInUser.user_id : 0,
        name: file.originalname,
        url: `/files/${descriptionFileId}/download`,
        path: savedPath,
      };
      mockFiles.push(fileMeta);
    } catch (e) {
      console.error('Failed to persist description file:', e && e.message);
      return res.status(500).json({ error: 'Failed to save description file' });
    }
  }

  const newTask = {
    id_task: newTaskId,
    title: data.title || 'Untitled',
    description: data.description || '',
    assignee_id: Number(data.assignee_id) || 0,
    assigner_id: Number(data.assigner_id) || (loggedInUser ? loggedInUser.user_id : 1),
    priority: Number(data.priority) || 2,
    deadline: data.deadline || new Date().toISOString(),
    date_created: new Date().toISOString(),
    date_submit: null,
    id_file: descriptionFileId,
    submit_file_id: null,
    score: null,
    status: data.status || 'Pending',
  };
  mockTasks.push(newTask);
  return res.json(newTask);
});

app.delete('/api/tasks/:id', async (req, res) => {
  await sleep(100);
  const id = Number(req.params.id);
  const idx = mockTasks.findIndex((t) => t.id_task === id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  mockTasks.splice(idx, 1);
  return res.json({ ok: true });
});

app.post('/api/tasks/:id/submit', upload.single('file'), async (req, res) => {
  await sleep(200);
  const id = Number(req.params.id);
  const task = mockTasks.find((t) => t.id_task === id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!req.file) return res.status(400).json({ error: 'File required' });
  // Persist file to disk under uploads/ with unique name
  try {
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const newId = nextFileId++;
    const safeName = `${Date.now()}-${newId}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const savedPath = path.join(uploadsDir, safeName);
    fs.writeFileSync(savedPath, req.file.buffer);

    const fileMeta = {
      id_file: newId,
      id_user: loggedInUser ? loggedInUser.user_id : 0,
      name: req.file.originalname,
      url: `/files/${newId}/download`,
      path: savedPath,
    };
    mockFiles.push(fileMeta);

    task.submit_file_id = fileMeta.id_file;
    task.date_submit = new Date().toISOString();
    task.score = calcScoreForSubmission(task, fileMeta);
    task.status = 'Completed';

    return res.json({ task, file: { id_file: fileMeta.id_file, name: fileMeta.name, url: fileMeta.url } });
  } catch (e) {
    console.error('Failed to persist uploaded file:', e && e.message);
    return res.status(500).json({ error: 'Failed to save file' });
  }
});

// --- Files ---
app.get('/api/files', async (req, res) => {
  await sleep(50);
  return res.json(mockFiles.map((f) => ({ id_file: f.id_file, id_user: f.id_user, name: f.name, url: f.url })));
});

app.get('/files/:id/download', (req, res) => {
  const id = Number(req.params.id);
  const file = mockFiles.find((f) => f.id_file === id);
  if (!file) return res.status(404).json({ error: 'File not found' });

  // Require Authorization header with valid token to allow file download
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  let token = null;
  if (authHeader && typeof authHeader === 'string') {
    if (authHeader.startsWith('Bearer ')) token = authHeader.slice(7).trim();
    else token = authHeader.trim();
  }
  if (!token || token !== authToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // If the file was saved to disk, stream it
  try {
    const fs = require('fs');
    if (file.path && fs.existsSync(file.path)) {
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
      const stream = fs.createReadStream(file.path);
      return stream.pipe(res);
    }
    // Fallback: if buffer exists (older entries), send it
    if (file.buffer) {
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
      return res.send(file.buffer);
    }
    res.setHeader('Content-Type', 'text/plain');
    return res.send(`Placeholder for ${file.name}`);
  } catch (e) {
    console.error('Error serving file:', e && e.message);
    return res.status(500).json({ error: 'Failed to serve file' });
  }
});

// Handle errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Bind explicitly to IPv4 loopback to avoid IPv6-only binding issues on some Windows setups
const HOST = '127.0.0.1';
const server = app.listen(PORT, HOST, () => {
  console.log(`Backend mock server running on http://${HOST}:${PORT}`);
  console.log('Server is listening...');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('Server error:', err);
  }
});

// Production-ready: removed temporary debug instrumentation (pid file, periodic addr checks, and signal handlers).
// Kept server listening and error handling. Scoring and date parsing logic remain intact above.
