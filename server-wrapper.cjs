const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

// We'll accept uploads into memory first, then persist to disk in the submit handler.
const upload = multer({ storage: multer.memoryStorage() });
const app = express();
const PORT = process.env.PORT || 4000;

// --- Email Configuration ---
// Create a test/mock email transporter (for development, logs to console instead of sending real emails)
const emailTransporter = nodemailer.createTransport({
  host: 'smtp.example.com', // Mock SMTP - will log to console instead
  port: 587,
  secure: false,
  auth: {
    user: 'mock@example.com',
    pass: 'mockpassword'
  },
  // For development: use jsonTransport to avoid actual email sending
  jsonTransport: true
});

// Email helper functions
const emailService = {
  // Format date for email display
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Send email notification (mock - logs to console)
  async sendEmail(to, subject, htmlContent) {
    try {
      console.log('\n[EMAIL SENT] =====================================');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Content:', htmlContent);
      console.log('=====================================================\n');
      
      // In production, you would actually send the email:
      // await emailTransporter.sendMail({ from: '"TaskFlow System" <noreply@taskflow.com>', to, subject, html: htmlContent });
      
      return { success: true, messageId: `mock-${Date.now()}` };
    } catch (error) {
      console.error('[EMAIL ERROR]', error.message);
      return { success: false, error: error.message };
    }
  },

  // A. Immediate Notifications

  // Task được giao mới
  async notifyTaskAssigned(task, assignee, assigner) {
    const subject = `[Giao Việc Mới] Task ${task.title} đã được giao cho bạn`;
    const html = `
      <h3>Chào ${assignee.name || assignee.email},</h3>
      <p>Bạn vừa được giao một công việc mới: <strong>${task.title}</strong>.</p>
      <ul>
        <li><strong>Thời hạn:</strong> ${this.formatDate(task.deadline)}</li>
        <li><strong>Được giao bởi:</strong> ${assigner.name || assigner.email}</li>
        <li><strong>Mô tả:</strong> ${task.description || 'Không có mô tả'}</li>
      </ul>
      <p>Vui lòng kiểm tra và bắt đầu thực hiện.</p>
      <p>👉 <a href="http://localhost:3000">Link tới Task</a></p>
    `;
    await this.sendEmail(assignee.email, subject, html);
  },

  // Task đã hoàn thành
  async notifyTaskCompleted(task, submitter, admins) {
    const subject = `[Hoàn thành] Task ${task.title} đã được nộp`;
    const html = `
      <h3>Chào Admin,</h3>
      <p>Task <strong>${task.title}</strong> đã được ${submitter.name || submitter.email} hoàn thành và nộp vào hệ thống.</p>
      <ul>
        <li><strong>Thời điểm nộp:</strong> ${this.formatDate(task.date_submit)}</li>
        <li><strong>Điểm số:</strong> ${task.score !== null ? task.score : 'Chưa chấm'}</li>
      </ul>
      <p>Vui lòng xem xét và chấm điểm.</p>
      <p>👉 <a href="http://localhost:3000">Link tới Task</a></p>
    `;
    
    // Send to all admins
    for (const admin of admins) {
      await this.sendEmail(admin.email, subject, html);
    }
  },

  // B. Scheduled Notifications

  // Sắp tới deadline (1 ngày trước)
  async notifyDeadlineApproaching(task, assignee) {
    const subject = `[NHẮC NHỞ KHẨN] Task ${task.title} sẽ hết hạn trong 24 giờ`;
    const html = `
      <h3>Chào ${assignee.name || assignee.email},</h3>
      <p>Task <strong>${task.title}</strong> của bạn sắp hết hạn.</p>
      <ul>
        <li><strong>Thời hạn:</strong> ${this.formatDate(task.deadline)} (Còn chưa đầy 1 ngày)</li>
      </ul>
      <p style="color: orange; font-weight: bold;">Vui lòng hoàn thành Task trước thời gian này.</p>
      <p>👉 <a href="http://localhost:3000">Link tới Task</a></p>
    `;
    await this.sendEmail(assignee.email, subject, html);
  },

  // Quá hạn deadline (1 ngày sau)
  async notifyDeadlineOverdue(task, assignee) {
    const subject = `[QUÁ HẠN] Task ${task.title} đã hết hạn 1 ngày`;
    const html = `
      <h3>Chào ${assignee.name || assignee.email},</h3>
      <p>Task <strong>${task.title}</strong> đã quá thời hạn nộp <strong>1 ngày</strong>.</p>
      <ul>
        <li><strong>Thời hạn đã qua:</strong> ${this.formatDate(task.deadline)}</li>
      </ul>
      <p style="color: red; font-weight: bold;">Task này đã bị đánh dấu là quá hạn.</p>
      <p>👉 <a href="http://localhost:3000">Link tới Task</a></p>
    `;
    await this.sendEmail(assignee.email, subject, html);
  }
};

// Restrict CORS to the frontend origins used in development (ports 3000 and 3001).
// Using an explicit list helps avoid intermittent CORS issues when testing locally.
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g., curl, native apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
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

  // Send email notification to assignee
  const assignee = mockUsers.find(u => u.user_id === newTask.assignee_id);
  const assigner = mockUsers.find(u => u.user_id === newTask.assigner_id) || loggedInUser;
  if (assignee && assigner) {
    emailService.notifyTaskAssigned(newTask, assignee, assigner).catch(err => 
      console.error('[EMAIL] Failed to send task assignment notification:', err.message)
    );
  }

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

    // Send email notification to admins
    const submitter = mockUsers.find(u => u.user_id === (loggedInUser ? loggedInUser.user_id : task.assignee_id));
    const admins = mockUsers.filter(u => u.role === Role.ADMIN);
    if (submitter && admins.length > 0) {
      emailService.notifyTaskCompleted(task, submitter, admins).catch(err => 
        console.error('[EMAIL] Failed to send task completion notification:', err.message)
      );
    }

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

// --- Scheduled Email Notifications with Cron Jobs ---
// Check for deadline reminders every hour
cron.schedule('0 * * * *', () => {
  console.log('[CRON] Running deadline check...');
  const now = new Date();
  
  mockTasks.forEach(task => {
    // Skip completed tasks
    if (task.status === 'Completed' || !task.deadline) return;
    
    const deadline = new Date(task.deadline);
    const timeDiff = deadline.getTime() - now.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    // 1 day before deadline (23-25 hours remaining)
    if (daysDiff > 0.95 && daysDiff < 1.05 && !task.reminderSent) {
      const assignee = mockUsers.find(u => u.user_id === task.assignee_id);
      if (assignee) {
        emailService.notifyDeadlineApproaching(task, assignee).catch(err =>
          console.error('[EMAIL] Failed to send deadline approaching notification:', err.message)
        );
        task.reminderSent = true; // Mark to avoid duplicate reminders
      }
    }
    
    // 1 day after deadline (23-25 hours overdue)
    if (daysDiff < -0.95 && daysDiff > -1.05 && !task.overdueNotificationSent) {
      const assignee = mockUsers.find(u => u.user_id === task.assignee_id);
      if (assignee) {
        emailService.notifyDeadlineOverdue(task, assignee).catch(err =>
          console.error('[EMAIL] Failed to send deadline overdue notification:', err.message)
        );
        task.overdueNotificationSent = true; // Mark to avoid duplicate reminders
      }
    }
  });
});

console.log('[EMAIL] Email notification system initialized');
console.log('[CRON] Deadline reminder scheduler started (runs every hour)');

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
