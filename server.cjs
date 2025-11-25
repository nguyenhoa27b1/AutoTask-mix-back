const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bodyParser = require('body-parser');
const XLSX = require('xlsx');
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
let nextLeaveId = 1;

// Email whitelist - only these emails can login
const EMAIL_WHITELIST = process.env.EMAIL_WHITELIST 
  ? process.env.EMAIL_WHITELIST.split(',').map(email => email.trim().toLowerCase())
  : ['nguyenhoa27b1@gmail.com', 'admin@example.com'];

// Admin email for role assignment
const ADMIN_EMAIL = 'nguyenhoa27b1@gmail.com';

const Role = {
  ADMIN: 'admin',
  USER: 'user',
};

const LeaveRequestStatus = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const mockUsers = [
  {
    user_id: 1,
    email: 'admin@example.com',
    passwordHash: 'adminpassword',
    role: Role.ADMIN,
    name: 'Admin User',
    picture: null,
    totalTasksAssigned: 0,
    totalTasksCompleted: 0,
    averageScore: 0,
    tasksCompletedOnTime: 0,
    tasksCompletedLate: 0,
  },
  {
    user_id: 2,
    email: 'user@example.com',
    passwordHash: 'userpassword',
    role: Role.USER,
    name: 'Normal User',
    picture: null,
    totalTasksAssigned: 0,
    totalTasksCompleted: 0,
    averageScore: 0,
    tasksCompletedOnTime: 0,
    tasksCompletedLate: 0,
  },
];

const mockTasks = [];

const mockLeaveRequests = [];

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
// Email/password login REMOVED - Google OAuth only
// Keeping endpoint for backward compatibility but always returns error
app.post('/api/login', async (req, res) => {
  console.log('[LOGIN] Email/password login disabled - use Google OAuth only');
  return res.status(401).json({ 
    error: 'Email/password login is disabled. Please use Google Sign-In.' 
  });
});

app.post('/api/login/google', async (req, res) => {
  await sleep(200);
  const profile = req.body;
  if (!profile || !profile.email) return res.status(400).json({ error: 'Invalid profile' });
  
  // Check whitelist
  const emailLower = profile.email.toLowerCase();
  if (!EMAIL_WHITELIST.includes(emailLower)) {
    console.warn(`[OAUTH] Email not in whitelist: ${profile.email}`);
    return res.status(403).json({ 
      error: 'Access denied. Your email is not authorized to use this system.' 
    });
  }
  
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
      totalTasksAssigned: 0,
      totalTasksCompleted: 0,
      averageScore: 0,
      tasksCompletedOnTime: 0,
      tasksCompletedLate: 0,
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

// Registration REMOVED - Google OAuth only
// Keeping endpoint for backward compatibility but always returns error
app.post('/api/register', async (req, res) => {
  console.log('[REGISTER] Registration disabled - use Google OAuth only');
  return res.status(401).json({ 
    error: 'Registration is disabled. Please use Google Sign-In.' 
  });
});

app.post('/api/logout', (req, res) => {
  authToken = null;
  loggedInUser = null;
  return res.json({ ok: true });
});

// --- Users ---
app.get('/api/users', async (req, res) => {
  await sleep(100);
  // Update all user stats before returning
  updateAllUserStats();
  return res.json(mockUsers.map(sanitizeUser));
});

app.post('/api/users', async (req, res) => {
  await sleep(150);
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (mockUsers.find((u) => u.email === email)) return res.status(400).json({ error: 'User exists' });
  const user = { 
    user_id: nextUserId++, 
    email, 
    passwordHash: '', 
    role: role || Role.USER, 
    name: null, 
    picture: null,
    totalTasksAssigned: 0,
    totalTasksCompleted: 0,
    averageScore: 0,
    tasksCompletedOnTime: 0,
    tasksCompletedLate: 0,
  };
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

// Helper to check if task is overdue
function checkIfOverdue(task) {
  if (task.status === 'Completed') return false;
  const now = new Date();
  const deadline = new Date(task.deadline);
  return now > deadline;
}

// Helper to sort tasks: Overdue → Pending → Submitted → Completed
// Within each group, sort by priority (High → Medium → Low), then by deadline
function sortTasks(tasks) {
  return tasks.sort((a, b) => {
    // Add isOverdue flag
    a.isOverdue = checkIfOverdue(a);
    b.isOverdue = checkIfOverdue(b);
    
    // Determine status order
    const statusOrder = {
      'Overdue': 0,
      'Pending': 1,
      'Submitted': 2,
      'Completed': 3
    };
    
    // Use 'Overdue' for overdue tasks, otherwise use actual status
    const aStatus = a.isOverdue && a.status !== 'Completed' ? 'Overdue' : a.status;
    const bStatus = b.isOverdue && b.status !== 'Completed' ? 'Overdue' : b.status;
    
    const aOrder = statusOrder[aStatus] ?? 999;
    const bOrder = statusOrder[bStatus] ?? 999;
    
    // First sort by status
    if (aOrder !== bOrder) return aOrder - bOrder;
    
    // Within same status, sort by priority (High = 3 first)
    if (a.priority !== b.priority) return b.priority - a.priority;
    
    // Within same priority, sort by deadline (earlier first)
    return new Date(a.deadline) - new Date(b.deadline);
  });
}

// Helper to calculate user statistics
function calculateUserStats(userId) {
  const userTasks = mockTasks.filter(task => task.assignee_id === userId);
  
  const stats = {
    totalTasksAssigned: userTasks.length,
    totalTasksCompleted: 0,
    averageScore: 0,
    tasksCompletedOnTime: 0,
    tasksCompletedLate: 0,
  };
  
  if (userTasks.length === 0) return stats;
  
  const completedTasks = userTasks.filter(task => task.status === 'Completed');
  stats.totalTasksCompleted = completedTasks.length;
  
  if (completedTasks.length > 0) {
    // Calculate average score
    const totalScore = completedTasks.reduce((sum, task) => sum + (task.score || 0), 0);
    stats.averageScore = Math.round((totalScore / completedTasks.length) * 10) / 10; // Round to 1 decimal
    
    // Calculate on-time vs late completions
    completedTasks.forEach(task => {
      if (task.date_submit) {
        const submitDate = new Date(task.date_submit);
        const deadline = new Date(task.deadline);
        if (submitDate <= deadline) {
          stats.tasksCompletedOnTime++;
        } else {
          stats.tasksCompletedLate++;
        }
      }
    });
  }
  
  return stats;
}

// Helper to update all users with their statistics
function updateAllUserStats() {
  mockUsers.forEach(user => {
    const stats = calculateUserStats(user.user_id);
    Object.assign(user, stats);
  });
}

// --- Tasks ---
app.get('/api/tasks', async (req, res) => {
  await sleep(100);
  
  // Get pagination params
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 15;
  const skip = (page - 1) * limit;
  
  // Sort tasks
  const sortedTasks = sortTasks([...mockTasks]);
  
  // Apply pagination
  const paginatedTasks = sortedTasks.slice(skip, skip + limit);
  
  return res.json({
    tasks: paginatedTasks,
    pagination: {
      page,
      limit,
      total: mockTasks.length,
      totalPages: Math.ceil(mockTasks.length / limit),
      hasMore: skip + limit < mockTasks.length
    }
  });
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
      isOverdue: false,
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
    
    // Update user statistics
    updateAllUserStats();
    
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

// Get single task by ID
app.get('/api/tasks/:id', async (req, res) => {
  await sleep(100);
  const id = Number(req.params.id);
  const task = mockTasks.find((t) => t.id_task === id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  return res.json(task);
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
  await sleep(100);
  const id = Number(req.params.id);
  const idx = mockTasks.findIndex((t) => t.id_task === id);
  
  if (idx === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  const updates = req.body;
  mockTasks[idx] = { ...mockTasks[idx], ...updates };
  
  return res.json(mockTasks[idx]);
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
  
  // Update user statistics
  updateAllUserStats();
  
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
    task.status = 'Submitted'; // Changed from 'submitted' to 'Submitted' for consistency

    // Update user statistics
    updateAllUserStats();

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
  
  if (task.status !== 'Submitted') {
    return res.status(400).json({ error: 'Task must be submitted before scoring' });
  }
  
  if (typeof score !== 'number' || score < 0 || score > 100) {
    return res.status(400).json({ error: 'Score must be a number between 0 and 100' });
  }
  
  // Update task with score and complete it
  task.score = score;
  task.status = 'Completed';
  
  // Update user statistics
  updateAllUserStats();
  
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

// --- Leave Requests API ---

// Get all leave requests (admin sees all, users see only their own)
app.get('/api/leave-requests', async (req, res) => {
  await sleep(100);
  
  if (!loggedInUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  let requests = mockLeaveRequests;
  
  // Users can only see their own requests
  if (loggedInUser.role !== Role.ADMIN) {
    requests = requests.filter(req => req.user_id === loggedInUser.user_id);
  }
  
  // Populate user and reviewer names
  const populatedRequests = requests.map(request => {
    const user = mockUsers.find(u => u.user_id === request.user_id);
    const reviewer = request.reviewed_by ? mockUsers.find(u => u.user_id === request.reviewed_by) : null;
    
    return {
      ...request,
      user_name: user ? user.name || user.email.split('@')[0] : 'Unknown',
      user_email: user ? user.email : 'unknown@example.com',
      reviewer_name: reviewer ? reviewer.name || reviewer.email.split('@')[0] : null,
    };
  });
  
  return res.json(populatedRequests);
});

// Create new leave request
app.post('/api/leave-requests', async (req, res) => {
  await sleep(150);
  
  if (!loggedInUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { start_date, end_date, reason } = req.body;
  
  if (!start_date || !end_date || !reason) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Validate dates
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  
  if (startDate > endDate) {
    return res.status(400).json({ error: 'End date must be after start date' });
  }
  
  const newRequest = {
    id_leave: nextLeaveId++,
    user_id: loggedInUser.user_id,
    start_date,
    end_date,
    reason,
    status: LeaveRequestStatus.PENDING,
    date_created: new Date().toISOString(),
    date_reviewed: null,
    reviewed_by: null,
    notes: null,
  };
  
  mockLeaveRequests.push(newRequest);
  
  // Populate user info for response
  const user = mockUsers.find(u => u.user_id === loggedInUser.user_id);
  const response = {
    ...newRequest,
    user_name: user ? user.name || user.email.split('@')[0] : 'Unknown',
    user_email: user ? user.email : 'unknown@example.com',
  };
  
  console.log(`[LEAVE] New leave request created by ${user.email} from ${start_date} to ${end_date}`);
  
  return res.json(response);
});

// Approve leave request (admin only)
app.put('/api/leave-requests/:id/approve', async (req, res) => {
  await sleep(100);
  
  if (!loggedInUser || loggedInUser.role !== Role.ADMIN) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const id = Number(req.params.id);
  const { notes } = req.body;
  
  const request = mockLeaveRequests.find(r => r.id_leave === id);
  if (!request) {
    return res.status(404).json({ error: 'Leave request not found' });
  }
  
  if (request.status !== LeaveRequestStatus.PENDING) {
    return res.status(400).json({ error: 'Only pending requests can be approved' });
  }
  
  request.status = LeaveRequestStatus.APPROVED;
  request.date_reviewed = new Date().toISOString();
  request.reviewed_by = loggedInUser.user_id;
  request.notes = notes || null;
  
  // Populate response
  const user = mockUsers.find(u => u.user_id === request.user_id);
  const reviewer = mockUsers.find(u => u.user_id === loggedInUser.user_id);
  
  const response = {
    ...request,
    user_name: user ? user.name || user.email.split('@')[0] : 'Unknown',
    user_email: user ? user.email : 'unknown@example.com',
    reviewer_name: reviewer ? reviewer.name || reviewer.email.split('@')[0] : 'Admin',
  };
  
  console.log(`[LEAVE] Request ${id} approved by ${loggedInUser.email}`);
  
  return res.json(response);
});

// Reject leave request (admin only)
app.put('/api/leave-requests/:id/reject', async (req, res) => {
  await sleep(100);
  
  if (!loggedInUser || loggedInUser.role !== Role.ADMIN) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const id = Number(req.params.id);
  const { notes } = req.body;
  
  const request = mockLeaveRequests.find(r => r.id_leave === id);
  if (!request) {
    return res.status(404).json({ error: 'Leave request not found' });
  }
  
  if (request.status !== LeaveRequestStatus.PENDING) {
    return res.status(400).json({ error: 'Only pending requests can be rejected' });
  }
  
  request.status = LeaveRequestStatus.REJECTED;
  request.date_reviewed = new Date().toISOString();
  request.reviewed_by = loggedInUser.user_id;
  request.notes = notes || null;
  
  // Populate response
  const user = mockUsers.find(u => u.user_id === request.user_id);
  const reviewer = mockUsers.find(u => u.user_id === loggedInUser.user_id);
  
  const response = {
    ...request,
    user_name: user ? user.name || user.email.split('@')[0] : 'Unknown',
    user_email: user ? user.email : 'unknown@example.com',
    reviewer_name: reviewer ? reviewer.name || reviewer.email.split('@')[0] : 'Admin',
  };
  
  console.log(`[LEAVE] Request ${id} rejected by ${loggedInUser.email}`);
  
  return res.json(response);
});

// Delete leave request (user can delete own pending requests, admin can delete any)
app.delete('/api/leave-requests/:id', async (req, res) => {
  await sleep(100);
  
  if (!loggedInUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const id = Number(req.params.id);
  const idx = mockLeaveRequests.findIndex(r => r.id_leave === id);
  
  if (idx === -1) {
    return res.status(404).json({ error: 'Leave request not found' });
  }
  
  const request = mockLeaveRequests[idx];
  
  // Users can only delete their own pending requests
  if (loggedInUser.role !== Role.ADMIN) {
    if (request.user_id !== loggedInUser.user_id) {
      return res.status(403).json({ error: 'Cannot delete other users\' requests' });
    }
    if (request.status !== LeaveRequestStatus.PENDING) {
      return res.status(403).json({ error: 'Can only delete pending requests' });
    }
  }
  
  mockLeaveRequests.splice(idx, 1);
  console.log(`[LEAVE] Request ${id} deleted by ${loggedInUser.email}`);
  
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

// Basic server health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/cloudinary/health', async (req, res) => {
  try {
    const result = await testCloudinaryConnection();
    if (result.success) {
      res.json({
        status: 'ok',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        message: 'Cloudinary is connected'
      });
    } else {
      res.status(500).json({
        status: 'error',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        message: result.error || 'Connection failed'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

app.get('/api/email/test-config', async (req, res) => {
  try {
    const result = await testEmailConfiguration();
    res.json({
      configured: result.status === 'ok',
      provider: process.env.SENDGRID_API_KEY ? 'SendGrid' : 'Gmail SMTP',
      status: result.status,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      configured: false,
      error: error.message
    });
  }
});

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
  res.json({
    deadlineReminder: status.deadlineReminder || false,
    overdueTasks: status.overdueTasks || false
  });
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

// ==================== EXCEL EXPORT ====================
// Export tasks and statistics to Excel
app.get('/api/export/excel', (req, res) => {
  try {
    console.log('[EXPORT] Excel export requested');

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Tasks
    const tasksData = mockTasks.map(task => {
      const assigner = mockUsers.find(u => u.user_id === task.assigner_id);
      const assignee = mockUsers.find(u => u.user_id === task.assignee_id);
      
      return {
        'Task ID': task.id_task,
        'Title': task.title,
        'Description': task.description,
        'Priority': task.priority === 1 ? 'Low' : task.priority === 2 ? 'Medium' : 'High',
        'Status': task.status,
        'Assigned By': assigner ? (assigner.name || assigner.email) : 'N/A',
        'Assigned To': assignee ? (assignee.name || assignee.email) : 'N/A',
        'Created Date': new Date(task.date_created).toLocaleString(),
        'Deadline': new Date(task.deadline).toLocaleString(),
        'Submit Date': task.date_submit ? new Date(task.date_submit).toLocaleString() : 'N/A',
        'Score': task.score !== null ? task.score : 'N/A',
        'Is Overdue': task.isOverdue ? 'Yes' : 'No'
      };
    });
    const tasksSheet = XLSX.utils.json_to_sheet(tasksData);
    XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tasks');

    // Sheet 2: User Statistics
    const statsData = mockUsers.map(user => ({
      'User ID': user.user_id,
      'Name': user.name || 'N/A',
      'Email': user.email,
      'Role': user.role,
      'Total Tasks Assigned': user.totalTasksAssigned || 0,
      'Total Tasks Completed': user.totalTasksCompleted || 0,
      'Average Score': user.averageScore ? user.averageScore.toFixed(2) : '0.00',
      'Tasks Completed On Time': user.tasksCompletedOnTime || 0,
      'Tasks Completed Late': user.tasksCompletedLate || 0,
      'Completion Rate': user.totalTasksAssigned > 0 
        ? ((user.totalTasksCompleted / user.totalTasksAssigned) * 100).toFixed(2) + '%'
        : '0.00%'
    }));
    const statsSheet = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(workbook, statsSheet, 'User Statistics');

    // Sheet 3: Leave Requests
    const leaveData = mockLeaveRequests.map(leave => {
      const user = mockUsers.find(u => u.user_id === leave.user_id);
      const reviewer = leave.reviewed_by ? mockUsers.find(u => u.user_id === leave.reviewed_by) : null;
      
      return {
        'Leave ID': leave.id_leave,
        'User': user ? (user.name || user.email) : 'N/A',
        'Start Date': new Date(leave.start_date).toLocaleDateString(),
        'End Date': new Date(leave.end_date).toLocaleDateString(),
        'Reason': leave.reason,
        'Status': leave.status,
        'Created Date': new Date(leave.date_created).toLocaleString(),
        'Reviewed Date': leave.date_reviewed ? new Date(leave.date_reviewed).toLocaleString() : 'N/A',
        'Reviewed By': leave.reviewer_name || (reviewer ? (reviewer.name || reviewer.email) : 'N/A'),
        'Notes': leave.notes || 'N/A'
      };
    });
    const leaveSheet = XLSX.utils.json_to_sheet(leaveData);
    XLSX.utils.book_append_sheet(workbook, leaveSheet, 'Leave Requests');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers
    const filename = `AutoTask_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    console.log('[EXPORT] Excel file generated successfully:', filename);
    res.send(buffer);
  } catch (error) {
    console.error('[EXPORT] Failed to generate Excel:', error);
    res.status(500).json({ error: 'Failed to generate Excel file' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log('📧 Email service: SendGrid configured');
  console.log('☁️  File storage: Cloudinary configured');
  console.log('⏰ Starting cron jobs...');
  
  // Start cron jobs with error handling
  try {
    startDeadlineReminderCron(getTasks, getUsers, getFiles);
    console.log('✅ Deadline reminder cron job started (runs daily at 8:00 AM)');
  } catch (error) {
    console.error('❌ Failed to start deadline reminder cron:', error.message);
  }
  
  try {
    startOverdueTasksCron(getTasks, updateTaskStatus);
    console.log('✅ Overdue tasks cron job started (runs every hour)');
  } catch (error) {
    console.error('❌ Failed to start overdue tasks cron:', error.message);
  }
  
  console.log('✅ Server ready!');
});

// Error handlers
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});
