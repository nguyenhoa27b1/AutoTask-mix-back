const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import services
const { 
  uploadToCloudinary, 
  uploadMultipleFiles, 
  deleteFromCloudinary,
  extractPublicId,
  testCloudinaryConnection 
} = require('./services/cloudinaryService.cjs');

const {
  sendTaskAssignedEmail,
  sendDeadlineReminderEmail,
  sendTaskScoredEmail,
  sendTaskDeletedEmail,
  testEmailConfiguration
} = require('./services/emailService.cjs');

const {
  startDeadlineReminderCron,
  startOverdueTasksCron,
  stopAllCronJobs,
  getCronJobsStatus,
  triggerDeadlineRemindersNow
} = require('./services/cronService.cjs');

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
  // Simple heuristic: higher priority yields higher base score. On-time submission gives bonus.
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
  // Log attempts to help debugging
  console.log('[LOGIN] attempt:', { email, password });
  // Allow login when password matches stored hash OR when a developer/test fallback password 'test' is used
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

// Create or update task with multiple file attachments
app.post('/api/tasks', upload.array('attachments', 10), async (req, res) => {
  await sleep(150);
  
  try {
    const data = req.body;
    const files = req.files || [];
    
    console.log('[TASK] Creating/updating task:', data.title, 'with', files.length, 'files');
    
    // Update existing task
    if (data.id_task) {
      const idx = mockTasks.findIndex((t) => t.id_task === Number(data.id_task));
      if (idx === -1) return res.status(404).json({ error: 'Task not found' });
      
      // Update task data
      mockTasks[idx] = { ...mockTasks[idx], ...data };
      
      // Handle new file uploads for update
      if (files.length > 0) {
        const uploadResults = await uploadMultipleFiles(files, 'task-attachments');
        const newFileIds = uploadResults.map(result => {
          const fileMeta = {
            id_file: nextFileId++,
            id_user: loggedInUser ? loggedInUser.user_id : 0,
            name: result.original_filename || result.public_id.split('/').pop(),
            url: result.secure_url,
            cloudinary_id: result.public_id
          };
          mockFiles.push(fileMeta);
          return fileMeta.id_file;
        });
        
        // Append to existing attachments
        const existingIds = mockTasks[idx].attachment_ids || [];
        mockTasks[idx].attachment_ids = [...existingIds, ...newFileIds];
      }
      
      return res.json(mockTasks[idx]);
    }
    
    // Create new task
    const newTask = {
      id_task: nextTaskId++,
      title: data.title || 'Untitled',
      description: data.description || '',
      assignee_id: Number(data.assignee_id),
      assigner_id: Number(data.assigner_id),
      priority: Number(data.priority) || 2,
      deadline: data.deadline || new Date().toISOString(),
      date_created: new Date().toISOString(),
      date_submit: null,
      attachment_ids: [],
      submit_file_id: null,
      score: null,
      status: 'Pending',
    };
    
    // Upload files to Cloudinary if any
    if (files.length > 0) {
      console.log(`[CLOUDINARY] Uploading ${files.length} files...`);
      const uploadResults = await uploadMultipleFiles(files, 'task-attachments');
      
      // Save file metadata
      const fileIds = uploadResults.map(result => {
        const fileMeta = {
          id_file: nextFileId++,
          id_user: loggedInUser ? loggedInUser.user_id : 0,
          name: result.original_filename || result.public_id.split('/').pop(),
          url: result.secure_url,
          cloudinary_id: result.public_id
        };
        mockFiles.push(fileMeta);
        return fileMeta.id_file;
      });
      
      newTask.attachment_ids = fileIds;
      console.log(`[CLOUDINARY] Files uploaded successfully. IDs:`, fileIds);
    }
    
    mockTasks.push(newTask);
    
    // Send email notification to assignee
    const assignee = mockUsers.find(u => u.user_id === newTask.assignee_id);
    const assigner = mockUsers.find(u => u.user_id === newTask.assigner_id);
    
    if (assignee && assignee.email) {
      const fileUrls = newTask.attachment_ids.map(fileId => {
        const file = mockFiles.find(f => f.id_file === fileId);
        return file ? file.url : null;
      }).filter(Boolean);
      
      await sendTaskAssignedEmail(
        assignee.email,
        assignee.name || assignee.email.split('@')[0],
        newTask,
        assigner ? assigner.name || assigner.email.split('@')[0] : 'Admin',
        fileUrls
      );
      console.log(`[EMAIL] Task assigned notification sent to ${assignee.email}`);
    }
    
    return res.json(newTask);
  } catch (error) {
    console.error('[TASK] Error creating/updating task:', error);
    return res.status(500).json({ error: error.message, details: 'Failed to create task' });
  }
});

// Delete task (cannot delete completed tasks)
app.delete('/api/tasks/:id', async (req, res) => {
  await sleep(100);
  const id = Number(req.params.id);
  const idx = mockTasks.findIndex((t) => t.id_task === id);
  
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  
  const task = mockTasks[idx];
  
  // Cannot delete completed tasks
  if (task.status === 'Completed') {
    return res.status(400).json({ error: 'Cannot delete completed tasks' });
  }
  
  // Get assignee info before deleting
  const assignee = mockUsers.find(u => u.user_id === task.assignee_id);
  const assigner = mockUsers.find(u => u.user_id === loggedInUser?.user_id);
  
  // Delete associated files from Cloudinary
  if (task.attachment_ids && task.attachment_ids.length > 0) {
    for (const fileId of task.attachment_ids) {
      const file = mockFiles.find(f => f.id_file === fileId);
      if (file && file.cloudinary_id) {
        try {
          await deleteFromCloudinary(file.cloudinary_id);
          console.log(`[CLOUDINARY] Deleted file: ${file.cloudinary_id}`);
        } catch (error) {
          console.error('[CLOUDINARY] Error deleting file:', error);
        }
      }
      // Remove from mockFiles
      const fileIdx = mockFiles.findIndex(f => f.id_file === fileId);
      if (fileIdx !== -1) mockFiles.splice(fileIdx, 1);
    }
  }
  
  // Remove task
  mockTasks.splice(idx, 1);
  
  // Send email notification
  if (assignee && assignee.email) {
    await sendTaskDeletedEmail(
      assignee.email,
      assignee.name || assignee.email.split('@')[0],
      task,
      assigner ? assigner.name || assigner.email.split('@')[0] : 'Admin'
    );
    console.log(`[EMAIL] Task deleted notification sent to ${assignee.email}`);
  }
  
  return res.json({ ok: true });
});

// Submit task with file
app.post('/api/tasks/:id/submit', upload.single('file'), async (req, res) => {
  await sleep(200);
  const id = Number(req.params.id);
  const task = mockTasks.find((t) => t.id_task === id);
  
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!req.file) return res.status(400).json({ error: 'File required' });

  try {
    // Upload to Cloudinary
    console.log('[CLOUDINARY] Uploading submission file...');
    const uploadResult = await uploadToCloudinary(req.file.buffer, req.file.originalname, 'task-submissions');
    
    const fileMeta = {
      id_file: nextFileId++,
      id_user: loggedInUser ? loggedInUser.user_id : 0,
      name: req.file.originalname,
      url: uploadResult.secure_url,
      cloudinary_id: uploadResult.public_id
    };
    mockFiles.push(fileMeta);

    task.submit_file_id = fileMeta.id_file;
    task.date_submit = new Date().toISOString();
    task.status = 'submitted'; // Status when submitted but not scored yet

    console.log(`[CLOUDINARY] Submission file uploaded: ${uploadResult.secure_url}`);
    return res.json({ task, file: { id_file: fileMeta.id_file, name: fileMeta.name, url: fileMeta.url } });
  } catch (error) {
    console.error('[TASK] Error submitting task:', error);
    return res.status(500).json({ error: error.message, details: 'Failed to submit task' });
  }
});

// Score task and mark as completed (new endpoint)
app.post('/api/tasks/:id/score', async (req, res) => {
  await sleep(100);
  const id = Number(req.params.id);
  const { score } = req.body;
  
  const task = mockTasks.find((t) => t.id_task === id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  
  if (task.status !== 'submitted') {
    return res.status(400).json({ error: 'Task must be submitted before scoring' });
  }
  
  if (typeof score !== 'number' || score < 0 || score > 100) {
    return res.status(400).json({ error: 'Score must be a number between 0 and 100' });
  }
  
  // Update task with score and complete it
  task.score = score;
  task.status = 'Completed';
  
  // Send email notification
  const assignee = mockUsers.find(u => u.user_id === task.assignee_id);
  const admin = mockUsers.find(u => u.user_id === loggedInUser?.user_id);
  
  if (assignee && assignee.email) {
    await sendTaskScoredEmail(
      assignee.email,
      assignee.name || assignee.email.split('@')[0],
      task,
      score,
      admin ? admin.name || admin.email.split('@')[0] : 'Admin'
    );
    console.log(`[EMAIL] Task scored notification sent to ${assignee.email}`);
  }
  
  return res.json(task);
});

// Delete attachment from task
app.delete('/api/tasks/:id/attachments/:fileId', async (req, res) => {
  await sleep(100);
  const taskId = Number(req.params.id);
  const fileId = Number(req.params.fileId);
  
  const task = mockTasks.find((t) => t.id_task === taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  
  if (!task.attachment_ids || !task.attachment_ids.includes(fileId)) {
    return res.status(404).json({ error: 'File not found in task attachments' });
  }
  
  // Delete from Cloudinary
  const file = mockFiles.find(f => f.id_file === fileId);
  if (file && file.cloudinary_id) {
    try {
      await deleteFromCloudinary(file.cloudinary_id);
      console.log(`[CLOUDINARY] Deleted attachment: ${file.cloudinary_id}`);
    } catch (error) {
      console.error('[CLOUDINARY] Error deleting attachment:', error);
    }
  }
  
  // Remove from task
  task.attachment_ids = task.attachment_ids.filter(id => id !== fileId);
  
  // Remove from mockFiles
  const fileIdx = mockFiles.findIndex(f => f.id_file === fileId);
  if (fileIdx !== -1) mockFiles.splice(fileIdx, 1);
  
  return res.json({ ok: true });
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
  
  // If file is on Cloudinary, redirect to Cloudinary URL
  if (file.url && file.url.includes('cloudinary')) {
    return res.redirect(file.url);
  }
  
  // If the file has a buffer (uploaded during runtime), send it. Otherwise send placeholder text.
  if (file.buffer) {
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    return res.send(file.buffer);
  }
  res.setHeader('Content-Type', 'text/plain');
  res.send(`Placeholder for ${file.name}`);
});

// --- System Test Endpoints ---
app.get('/api/test/email', async (req, res) => {
  const result = await testEmailConfiguration();
  res.json(result);
});

app.get('/api/test/cloudinary', async (req, res) => {
  const result = await testCloudinaryConnection();
  res.json(result);
});

// Manually trigger deadline reminders (for testing)
app.post('/api/test/send-reminders', async (req, res) => {
  const result = await triggerDeadlineRemindersNow(
    () => Promise.resolve(mockTasks),
    () => Promise.resolve(mockUsers),
    () => Promise.resolve(mockFiles)
  );
  res.json(result);
});

// Get cron job status
app.get('/api/cron/status', (req, res) => {
  const status = getCronJobsStatus();
  res.json({ jobs: status });
});

// Helper functions for cron jobs
function getTasks() {
  return Promise.resolve(mockTasks);
}

function getUsers() {
  return Promise.resolve(mockUsers.map(sanitizeUser));
}

function getFiles() {
  return Promise.resolve(mockFiles);
}

function updateTaskStatus(taskId, status) {
  const task = mockTasks.find(t => t.id_task === taskId);
  if (task) {
    task.status = status;
  }
  return Promise.resolve(task);
}

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log('📧 Email service: SendGrid configured');
  console.log('☁️  File storage: Cloudinary configured');
  console.log('⏰ Starting cron jobs...');
  
  // Start cron jobs
  startDeadlineReminderCron(getTasks, getUsers, getFiles);
  startOverdueTasksCron(getTasks, updateTaskStatus);
  
  console.log('✅ Server ready!');
});
