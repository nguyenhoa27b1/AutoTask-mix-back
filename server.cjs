const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bodyParser = require('body-parser');

const upload = multer({ storage: multer.memoryStorage() });
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// --- In-memory mock database (kept simple and compatible with frontend types) ---
let nextUserId = 3;
let nextTaskId = 5;
let nextFileId = 3;

// Admin email for role assignment
const ADMIN_EMAIL = 'nguyenhoa27b1@gmail.com';

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
  // Attach isAdmin flag for frontend convenience
  return { ...u, isAdmin: (u.role === Role.ADMIN) };
}

function calcScoreForSubmission(task, file) {
  const now = new Date();
  const deadline = new Date(task.deadline);
  let base = 50;
  if (task.priority === 3) base = 90;
  if (task.priority === 2) base = 70;
  if (task.priority === 1) base = 50;
  const onTimeBonus = now <= deadline ? 10 : -10;
  return Math.max(0, base + onTimeBonus);
}

// --- Auth endpoints ---
app.post('/api/login', async (req, res) => {
  await sleep(200);
  const { email, password } = req.body;
  console.log('[LOGIN] attempt:', { email, password });
  const user = mockUsers.find((u) => u.email === email && (u.passwordHash === password || password === 'test'));
  if (!user) {
    console.warn('[LOGIN] failed for:', email);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  authToken = `token-${Date.now()}`;
  loggedInUser = user;
  console.log('[LOGIN] success:', sanitizeUser(user));
  return res.json(sanitizeUser(user));
});

app.post('/api/login/google', async (req, res) => {
  await sleep(200);
  const profile = req.body;
  if (!profile || !profile.email) return res.status(400).json({ error: 'Invalid profile' });
  
  let user = mockUsers.find((u) => u.email === profile.email);
  if (!user) {
    // Check if this email should be admin
    const isAdminEmail = profile.email === ADMIN_EMAIL;
    user = {
      user_id: nextUserId++,
      email: profile.email,
      passwordHash: '',
      role: isAdminEmail ? Role.ADMIN : Role.USER,
      name: profile.name || profile.given_name || profile.email.split('@')[0],
      picture: profile.picture || null,
    };
    mockUsers.push(user);
    console.log(`[OAUTH] New user created: ${profile.email} with role: ${user.role}`);
  } else {
    // If user exists but email matches admin, update role to admin
    if (profile.email === ADMIN_EMAIL && user.role !== Role.ADMIN) {
      user.role = Role.ADMIN;
      console.log(`[OAUTH] User role updated to admin: ${profile.email}`);
    }
  }
  authToken = `token-${Date.now()}`;
  loggedInUser = user;
  console.log('[OAUTH] Login success:', sanitizeUser(user));
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

app.post('/api/tasks', async (req, res) => {
  await sleep(150);
  const data = req.body;
  // if id_task provided, update
  if (data.id_task) {
    const idx = mockTasks.findIndex((t) => t.id_task === data.id_task);
    if (idx === -1) return res.status(404).json({ error: 'Task not found' });
    mockTasks[idx] = { ...mockTasks[idx], ...data };
    return res.json(mockTasks[idx]);
  }
  const newTask = {
    id_task: nextTaskId++,
    title: data.title || 'Untitled',
    description: data.description || '',
    assignee_id: data.assignee_id,
    assigner_id: data.assigner_id,
    priority: data.priority || 2,
    deadline: data.deadline || new Date().toISOString(),
    date_created: new Date().toISOString(),
    date_submit: null,
    id_file: null,
    submit_file_id: null,
    score: null,
    status: 'Pending',
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

  const fileMeta = {
    id_file: nextFileId++,
    id_user: loggedInUser ? loggedInUser.user_id : 0,
    name: req.file.originalname,
    url: `/files/${nextFileId - 1}/download`,
    buffer: req.file.buffer,
  };
  mockFiles.push(fileMeta);

  task.submit_file_id = fileMeta.id_file;
  task.date_submit = new Date().toISOString();
  task.score = calcScoreForSubmission(task, fileMeta);
  task.status = 'Completed';

  return res.json({ task, file: { id_file: fileMeta.id_file, name: fileMeta.name, url: fileMeta.url } });
});

// --- Files ---
app.get('/api/files', async (req, res) => {
  await sleep(50);
  return res.json(mockFiles.map((f) => ({ id_file: f.id_file, id_user: f.id_user, name: f.name, url: f.url })));
});

app.get('/files/:id/download', (req, res) => {
  const id = Number(req.params.id);
  const file = mockFiles.find((f) => f.id_file === id);
  if (!file) return res.status(404).send('File not found');
  if (file.buffer) {
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    return res.send(file.buffer);
  }
  res.setHeader('Content-Type', 'text/plain');
  res.send(`Placeholder for ${file.name}`);
});

app.listen(PORT, () => {
  console.log(`Backend mock server running on http://localhost:${PORT}`);
});
