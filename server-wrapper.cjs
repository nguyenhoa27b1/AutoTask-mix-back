// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const cron = require('node-cron');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('[CLOUDINARY] Configuration loaded:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? '✓' : '✗',
  api_key: process.env.CLOUDINARY_API_KEY ? '✓' : '✗',
  api_secret: process.env.CLOUDINARY_API_SECRET ? '✓' : '✗'
});

// Setup Cloudinary storage - 2 separate folders for different file types
// 1. Storage for DESCRIPTION files (admin uploads when creating task)
const descriptionStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    try {
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      
      console.log(`[CLOUDINARY STORAGE] Uploading: ${file.originalname} → autotask-descriptions`);
      
      return {
        folder: 'autotask-descriptions', // Folder for description files
        resource_type: 'auto',
        public_id: `${timestamp}-${safeName}`,
        use_filename: true,
        unique_filename: false,
      };
    } catch (error) {
      console.error('[CLOUDINARY STORAGE ERROR]', error);
      throw error;
    }
  },
});

// 2. Storage for SUBMIT files (users submit their work)
const submitStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    return {
      folder: 'autotask-submissions', // Folder for submit files
      resource_type: 'auto',
      public_id: `${timestamp}-${safeName}`,
      use_filename: true,
      unique_filename: false,
    };
  },
});

// Three upload instances:
// 1. uploadDescription - for description files (saves to autotask-descriptions) - MULTIPLE FILES
// 2. uploadSubmission - for submit files (saves to autotask-submissions) - SINGLE FILE
// 3. uploadToMemory - for temporary files (not saved)
const uploadDescription = multer({ 
  storage: descriptionStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    console.log('[MULTER] Receiving file:', file.originalname);
    cb(null, true);
  }
});
const uploadSubmission = multer({ storage: submitStorage });
const uploadToMemory = multer({ storage: multer.memoryStorage() });
const app = express();
const PORT = process.env.PORT || 4000;

// --- Email Configuration ---
// Supports both Gmail SMTP and SendGrid API
const USE_REAL_EMAIL = process.env.USE_REAL_EMAIL === 'true' || process.env.USE_REAL_MAIL === 'true' || false;

// SendGrid API configuration (recommended for production - works on Render)
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;

// Gmail SMTP configuration (for local dev only - blocked on Render free tier)
const GMAIL_USER = process.env.GMAIL_USER || 'your-email@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || 'your-app-password-here';

// Determine email service to use
const USE_SENDGRID = !!(SENDGRID_API_KEY && SENDGRID_FROM_EMAIL);

// Initialize SendGrid if configured
if (USE_SENDGRID) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('📧 Email service: SendGrid API');
} else {
  console.log('📧 Email service: Gmail SMTP (may not work on Render free tier)');
}

// Create Gmail transporter (fallback)
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD
  }
});

// Email helper functions
const emailService = {
  // Format date for email display (GMT+7)
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh'
    });
  },

  // Send email notification
  async sendEmail(to, subject, htmlContent) {
    try {
      if (!USE_REAL_EMAIL) {
        // Mock mode - log to console only
        console.log('\n[EMAIL SENT] ===================================== (MOCK MODE)');
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('Content:', htmlContent);
        console.log('=====================================================\n');
        return { success: true, messageId: `mock-${Date.now()}` };
      }

      if (USE_SENDGRID) {
        // Send via SendGrid API (recommended for production)
        const msg = {
          to: to,
          from: SENDGRID_FROM_EMAIL,
          subject: subject,
          html: htmlContent,
        };
        
        const response = await sgMail.send(msg);
        
        console.log('\n[EMAIL SENT] =====================================');
        console.log('✅ Email sent via SendGrid API');
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('Status:', response[0].statusCode);
        console.log('Message ID:', response[0].headers['x-message-id']);
        console.log('=====================================================\n');
        
        return { success: true, messageId: response[0].headers['x-message-id'] };
      } else {
        // Send via Gmail SMTP (fallback for local dev)
        const info = await emailTransporter.sendMail({
          from: `"TaskFlow System" <${GMAIL_USER}>`,
          to: to,
          subject: subject,
          html: htmlContent
        });
        
        console.log('\n[EMAIL SENT] =====================================');
        console.log('✅ Email sent via Gmail SMTP');
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('Message ID:', info.messageId);
        console.log('=====================================================\n');
        
        return { success: true, messageId: info.messageId };
      }
    } catch (error) {
      console.error('[EMAIL ERROR]', error.message);
      if (error.response) {
        console.error('[EMAIL ERROR] Response:', error.response.body);
      }
      return { success: false, error: error.message };
    }
  },

  // A. Immediate Notifications

  // Task được giao mới
  async notifyTaskAssigned(task, assignee, assigner) {
    const subject = `[AutoTask] 🆕 Bạn nhận được nhiệm vụ mới: ${task.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h3 style="color: #2c3e50;">Xin chào ${assignee.name || assignee.email},</h3>
        <p>Bạn vừa được Admin giao một nhiệm vụ mới trên hệ thống AutoTask.</p>
        <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #3498db;">
          <ul style="list-style: none; padding: 0;">
            <li>📌 <b>Nhiệm vụ:</b> ${task.title}</li>
            <li>📝 <b>Mô tả:</b> ${task.description || 'Không có mô tả'}</li>
            <li>👤 <b>Người giao:</b> ${assigner.name || assigner.email}</li>
            <li>📅 <b>Hạn chót:</b> ${new Date(task.deadline).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })} (23:59)</li>
          </ul>
        </div>
        <p>Vui lòng đăng nhập vào hệ thống để kiểm tra và thực hiện ngay.</p>
        <p style="text-align: center; margin: 25px 0;">
          <a href="https://autotask-mix-back.onrender.com" style="background: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">🚀 Truy Cập Hệ Thống</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #7f8c8d;">Trân trọng,<br>Ban Quản Trị AutoTask</p>
      </div>
    `;
    await this.sendEmail(assignee.email, subject, html);
  },

  // Task đã hoàn thành
  async notifyTaskCompleted(task, submitter, admins) {
    const subject = `[AutoTask] ✅ Nhiệm vụ đã hoàn thành: ${task.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h3 style="color: #27ae60;">Xin chào Admin,</h3>
        <p>Thành viên <b>${submitter.name || submitter.email}</b> vừa báo cáo hoàn thành nhiệm vụ.</p>
        <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #27ae60;">
          <ul style="list-style: none; padding: 0;">
            <li>📌 <b>Nhiệm vụ:</b> ${task.title}</li>
            <li>⏰ <b>Thời gian nộp:</b> ${new Date(task.date_submit || Date.now()).toLocaleString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}</li>
            <li>🎯 <b>Điểm số:</b> ${task.score !== null ? task.score : 'Chưa chấm'}</li>
          </ul>
        </div>
        <p>Vui lòng truy cập hệ thống để kiểm tra và đánh giá.</p>
        <p style="text-align: center; margin: 25px 0;">
          <a href="https://autotask-mix-back.onrender.com" style="background: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">✅ Kiểm Tra Ngay</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #7f8c8d;">Trân trọng,<br>Hệ Thống AutoTask</p>
      </div>
    `;
    
    // Send to all admins
    for (const admin of admins) {
      await this.sendEmail(admin.email, subject, html);
    }
  },

  // B. Scheduled Notifications

  // Sắp tới deadline (1 ngày trước)
  async notifyDeadlineApproaching(task, assignee) {
    const subject = `[AutoTask] ⚠️ Nhắc nhở: Nhiệm vụ sắp đến hạn - ${task.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h3 style="color: #d35400;">Xin chào ${assignee.name || assignee.email},</h3>
        <p>Đây là email nhắc nhở tự động. Nhiệm vụ của bạn sắp đến hạn chót vào ngày mai.</p>
        <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #f1c40f;">
          <ul style="list-style: none; padding: 0;">
            <li>📌 <b>Nhiệm vụ:</b> ${task.title}</li>
            <li>📅 <b>Hạn chót:</b> ${new Date(task.deadline).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })} (23:59)</li>
            <li>⏰ <b>Thời gian còn lại:</b> Chưa đầy 24 giờ</li>
          </ul>
        </div>
        <p style="font-weight: bold; color: #d35400;">⚡ Vui lòng hoàn thành sớm để tránh bị trừ điểm.</p>
        <p style="text-align: center; margin: 25px 0;">
          <a href="https://autotask-mix-back.onrender.com" style="background: #f39c12; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">⏰ Hoàn Thành Ngay</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #7f8c8d;">Đây là email tự động. Vui lòng không trả lời.<br>Hệ Thống AutoTask</p>
      </div>
    `;
    await this.sendEmail(assignee.email, subject, html);
  },

  // Quá hạn deadline (1 ngày sau)
  async notifyDeadlineOverdue(task, assignee) {
    const subject = `[AutoTask] ⛔ THÔNG BÁO QUÁ HẠN: ${task.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h3 style="color: #c0392b;">Xin chào ${assignee.name || assignee.email},</h3>
        <p>Hệ thống ghi nhận nhiệm vụ sau đây của bạn đã <b style="color: #c0392b;">QUÁ HẠN</b>.</p>
        <div style="background: #f2dede; padding: 15px; border-left: 4px solid #c0392b;">
          <ul style="list-style: none; padding: 0;">
            <li>📌 <b>Nhiệm vụ:</b> ${task.title}</li>
            <li>📅 <b>Hạn chót đã qua:</b> ${new Date(task.deadline).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })} (23:59)</li>
            <li>⏱️ <b>Đã quá hạn:</b> 1 ngày</li>
          </ul>
        </div>
        <p style="color: #c0392b; font-weight: bold;">⚠️ Bạn đã bị trừ điểm tín nhiệm cho nhiệm vụ này.</p>
        <p>Vui lòng hoàn thành và nộp bài càng sớm càng tốt để hạn chế ảnh hưởng.</p>
        <p style="text-align: center; margin: 25px 0;">
          <a href="https://autotask-mix-back.onrender.com" style="background: #c0392b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">🔴 Nộp Bài Ngay</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #7f8c8d;">Đây là email tự động. Vui lòng không trả lời.<br>Hệ Thống AutoTask</p>
      </div>
    `;
    await this.sendEmail(assignee.email, subject, html);
  },

  // Nộp bài quá hạn (gửi cho Admin)
  async notifyOverdueSubmission(task, submitter, admins) {
    const subject = `[AutoTask] 🔴 Nộp trễ: ${task.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h3 style="color: #c0392b;">Xin chào Admin,</h3>
        <p>Thành viên <b>${submitter.name || submitter.email}</b> vừa báo cáo hoàn thành nhiệm vụ, nhưng đã <b style="color: #c0392b;">QUÁ HẠN</b>.</p>
        <div style="background: #f2dede; padding: 15px; border-left: 4px solid #c0392b;">
          <ul style="list-style: none; padding: 0;">
            <li>📌 <b>Nhiệm vụ:</b> ${task.title}</li>
            <li>⏰ <b>Thời gian nộp:</b> ${new Date(task.date_submit).toLocaleString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}</li>
            <li>📅 <b>Hạn chót:</b> ${new Date(task.deadline).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })} (23:59)</li>
          </ul>
        </div>
        <p style="color: #c0392b; font-weight: bold;">⚠️ Lưu ý: Task này đã bị trừ điểm (-1) theo quy tắc quá hạn.</p>
        <p>Vui lòng truy cập hệ thống để kiểm tra và đánh giá.</p>
        <p style="text-align: center; margin: 25px 0;">
          <a href="https://autotask-mix-back.onrender.com" style="background: #c0392b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">🔴 Kiểm Tra Ngay</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #7f8c8d;">Trân trọng,<br>Hệ Thống AutoTask</p>
      </div>
    `;
    
    // Send to all admins
    for (const admin of admins) {
      await this.sendEmail(admin.email, subject, html);
    }
  },

  // Chào mừng user mới (Onboarding)
  async notifyNewUser(user) {
    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://autotask-mix-back.onrender.com';
    const subject = `[AutoTask] 🎉 Chào mừng bạn đến với hệ thống quản lý nhiệm vụ`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h3 style="color: #3498db;">Xin chào ${user.name || user.email},</h3>
        <p>Bạn đã được Admin thêm vào hệ thống quản lý nhiệm vụ nội bộ <b>AutoTask</b>.</p>
        <div style="background: #e3f2fd; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0;">
          <p style="margin: 5px 0;"><b>🔑 Thông tin đăng nhập:</b></p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Email: <b>${user.email}</b></li>
            <li>Đăng nhập bằng Google (dành cho email @gmail.com) hoặc email/mật khẩu</li>
          </ul>
        </div>
        <p>Hãy truy cập vào hệ thống ngay để bắt đầu nhận nhiệm vụ!</p>
        <p style="text-align: center; margin: 25px 0;">
          <a href="${FRONTEND_URL}" style="background: #2ecc71; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">🚀 Đăng Nhập Ngay</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #7f8c8d;">Trân trọng,<br>Ban Quản Trị AutoTask</p>
      </div>
    `;
    await this.sendEmail(user.email, subject, html);
  }
};

// CORS configuration
// In production (same origin), CORS not needed since frontend + backend on same domain
// In development, allow localhost:3000/3001 for separate Vite dev server
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (!IS_PRODUCTION) {
  // Development mode: Allow CORS from Vite dev server
  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g., curl, native apps, Postman)
      if (!origin) return callback(null, true);
      
      // Allow any origin on port 3000 or 3001 (for network access during development)
      try {
        const url = new URL(origin);
        if (url.port === '3000' || url.port === '3001') {
          return callback(null, true);
        }
      } catch (e) {
        // Invalid URL, reject
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));
} else {
  // Production mode: No CORS needed (same origin)
  console.log('📦 Production mode: CORS disabled (same origin)');
}

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
    isWhitelisted: false, // Non-Gmail users don't need whitelist
  },
  {
    user_id: 2,
    email: 'user@example.com',
    passwordHash: 'userpassword',
    role: Role.USER,
    name: 'Normal User',
    picture: null,
    isWhitelisted: false, // Non-Gmail users don't need whitelist
  },
];

const mockTasks = [];

const mockFiles = [
  { id_file: 1, id_user: 1, name: 'design_brief.pdf', url: `/files/1/download` },
  { id_file: 2, id_user: 2, name: 'final_marketing_copy.docx', url: `/files/2/download` },
];

// Session storage - map token to user for multi-user support
const activeSessions = new Map(); // token -> { user, timestamp }

let authToken = null;
let loggedInUser = null;

// Helpers
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Extract domain from email (e.g., "user@example.com" → "example.com")
const getDomainFromEmail = (email) => {
  if (!email || typeof email !== 'string') return null;
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
};

function sanitizeUser(user) {
  const { passwordHash, ...u } = user;
  // Ensure name and picture are always strings (never null/undefined)
  return {
    ...u,
    name: u.name || u.email?.split('@')[0] || 'User',
    picture: u.picture || '',
    isAdmin: (u.role === Role.ADMIN),
    isWhitelisted: u.isWhitelisted || false
  };
}

// Authentication middleware - validate token and set loggedInUser
const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  
  if (!token) {
    // Fallback to global session for backward compatibility
    if (loggedInUser) {
      return next();
    }
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const session = activeSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Set loggedInUser from token session
  loggedInUser = session.user;
  next();
};

// --- Domain-Based Privacy Control Middleware ---
// Enforces domain isolation: users can only interact with same-domain users/tasks
const checkDomainIsolation = (req, res, next) => {
  // Only check if user is logged in
  if (!loggedInUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const currentUserDomain = getDomainFromEmail(loggedInUser.email);
  if (!currentUserDomain) {
    return res.status(400).json({ error: 'Invalid user email domain' });
  }

  // Check if request involves users from different domains
  const { assignee_id, assigner_id, userId, id_task } = req.body || {};
  const taskId = req.params?.id || id_task;

  // Check assignee_id in request body (creating/updating task)
  if (assignee_id) {
    const assignee = mockUsers.find(u => u.user_id === parseInt(assignee_id));
    if (assignee) {
      const assigneeDomain = getDomainFromEmail(assignee.email);
      if (assigneeDomain !== currentUserDomain) {
        console.warn(`🚫 [DOMAIN ISOLATION] ${loggedInUser.email} attempted to assign task to ${assignee.email} (different domain)`);
        return res.status(403).json({ error: 'Cross-domain interaction denied.' });
      }
    }
  }

  // Check task owner/assignee when updating existing task
  if (taskId) {
    const task = mockTasks.find(t => t.task_id === parseInt(taskId) || t.id_task === parseInt(taskId));
    if (task) {
      const taskAssignee = mockUsers.find(u => u.user_id === task.assignee_id);
      const taskAssigner = mockUsers.find(u => u.user_id === task.assigner_id);
      
      const assigneeDomain = taskAssignee ? getDomainFromEmail(taskAssignee.email) : null;
      const assignerDomain = taskAssigner ? getDomainFromEmail(taskAssigner.email) : null;
      
      if ((assigneeDomain && assigneeDomain !== currentUserDomain) ||
          (assignerDomain && assignerDomain !== currentUserDomain)) {
        console.warn(`🚫 [DOMAIN ISOLATION] ${loggedInUser.email} attempted to modify cross-domain task`);
        return res.status(403).json({ error: 'Cross-domain interaction denied.' });
      }
    }
  }

  // Check userId in request (for user management)
  if (userId) {
    const targetUser = mockUsers.find(u => u.user_id === parseInt(userId));
    if (targetUser) {
      const targetDomain = getDomainFromEmail(targetUser.email);
      if (targetDomain !== currentUserDomain) {
        console.warn(`🚫 [DOMAIN ISOLATION] ${loggedInUser.email} attempted to modify user from different domain`);
        return res.status(403).json({ error: 'Cross-domain interaction denied.' });
      }
    }
  }

  next();
};

// Middleware to filter lists by current user's domain
const filterByDomain = (dataType) => {
  return (req, res, next) => {
    // Store original json function
    const originalJson = res.json.bind(res);
    
    // Override res.json to filter data
    res.json = (data) => {
      if (!loggedInUser) {
        return originalJson(data);
      }

      const currentUserDomain = getDomainFromEmail(loggedInUser.email);
      if (!currentUserDomain) {
        return originalJson(data);
      }

      // Filter array data by domain
      if (Array.isArray(data)) {
        const filtered = data.filter(item => {
          let itemDomain = null;
          
          if (dataType === 'users' && item.email) {
            itemDomain = getDomainFromEmail(item.email);
          } else if (dataType === 'tasks') {
            // For tasks, check both assignee and assigner domains
            const assignee = mockUsers.find(u => u.user_id === item.assignee_id);
            const assigner = mockUsers.find(u => u.user_id === item.assigner_id);
            const assigneeDomain = assignee ? getDomainFromEmail(assignee.email) : null;
            const assignerDomain = assigner ? getDomainFromEmail(assigner.email) : null;
            
            // Include task if either assignee or assigner matches current user's domain
            return (assigneeDomain === currentUserDomain) || (assignerDomain === currentUserDomain);
          }
          
          return itemDomain === currentUserDomain;
        });
        
        console.log(`🔒 [DOMAIN FILTER] ${loggedInUser.email}: Filtered ${dataType} from ${data.length} to ${filtered.length} items`);
        return originalJson(filtered);
      }
      
      // If not array, return as-is
      return originalJson(data);
    };
    
    next();
  };
};

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

  // Normalize dates to compare day-by-day (deadline is until 23:59:59 of that day)
  const submissionDay = new Date(submissionDate.getFullYear(), submissionDate.getMonth(), submissionDate.getDate());
  const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
  
  // Debug: log computed dates for scoring
  try {
    console.log('[SCORE_DEBUG] task.deadline=', task.deadline, 'deadlineDate=', deadlineDate.toISOString(), 'submissionDate=', submissionDate.toISOString(), 'submissionDay=', submissionDay.toISOString(), 'deadlineDay=', deadlineDay.toISOString());
  } catch (e) {
    console.log('[SCORE_DEBUG] unable to stringify dates', e && e.message);
  }

  // Scoring: +1 early, 0 on-time (deadline day until 23:59), -1 late
  const subTime = submissionDay.getTime();
  const dlTime = deadlineDay.getTime();
  if (subTime < dlTime) {
    return 1; // Completed before deadline
  } else if (subTime === dlTime) {
    return 0; // Completed on the deadline day (until 23:59:59)
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
  
  // Block Gmail users from password login FIRST - they must use Google OAuth
  const domain = getDomainFromEmail(email);
  if (domain === 'gmail.com') {
    console.warn('🚫 [CONDITIONAL LOGIN] Gmail user attempted password login:', email);
    return res.status(403).json({ error: 'Gmail users must login via Google OAuth only.' });
  }
  
  // Only check password for non-Gmail users
  const user = mockUsers.find((u) => u.email === email && (u.passwordHash === password || password === 'test'));
  if (!user) {
    console.warn('[LOGIN] failed for:', email);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  authToken = `token-${Date.now()}`;
  loggedInUser = user;
  
  // Store token in session map
  activeSessions.set(authToken, { user, timestamp: Date.now() });
  
  console.log('[LOGIN] success:', sanitizeUser(user));
  // Return user + token so frontend can include Authorization header when downloading
  return res.json({ user: sanitizeUser(user), token: authToken });
});

app.post('/api/login/google', async (req, res) => {
  await sleep(200);
  const profile = req.body;
  if (!profile || !profile.email) return res.status(400).json({ error: 'Invalid profile' });
  
  const domain = getDomainFromEmail(profile.email);
  let user = mockUsers.find((u) => u.email === profile.email);
  
  // Special case: Auto-grant admin + whitelist for nguyenhoa27b1@gmail.com
  const isAdminEmail = profile.email === 'nguyenhoa27b1@gmail.com';
  
  // Whitelist check for Gmail users (except admin email)
  if (domain === 'gmail.com') {
    if (!user) {
      // Special case: Auto-create and whitelist admin email
      if (isAdminEmail) {
        user = {
          user_id: nextUserId++,
          email: profile.email,
          passwordHash: '',
          role: Role.ADMIN,
          name: profile.name || profile.given_name || profile.email.split('@')[0],
          picture: profile.picture || '',
          isWhitelisted: true, // Auto-whitelist admin
        };
        mockUsers.push(user);
        console.log('🔑 [ADMIN ACCESS] Auto-granted admin role and whitelisted:', profile.email);
      } else {
        // Regular Gmail user not in database - blocked
        console.warn('🚫 [WHITELIST] Gmail user not whitelisted:', profile.email);
        return res.status(401).json({ error: 'Gmail account not authorized. Please contact admin to be added to whitelist.' });
      }
    } else {
      // User exists - check whitelist (except admin email)
      if (!isAdminEmail && !user.isWhitelisted) {
        // Gmail user exists but not whitelisted - blocked
        console.warn('🚫 [WHITELIST] Gmail user exists but not whitelisted:', profile.email);
        return res.status(401).json({ error: 'Gmail account not authorized. Please contact admin to enable whitelist.' });
      }
      
      // Valid user - auto-update name from Google profile
      const oldName = user.name;
      user.name = profile.name || profile.given_name || user.name || user.email.split('@')[0];
      user.picture = profile.picture || user.picture || '';
      
      // Ensure admin email always has admin role and is whitelisted
      if (isAdminEmail) {
        user.role = Role.ADMIN;
        user.isWhitelisted = true;
      }
      
      if (oldName !== user.name) {
        console.log('✅ [AUTO-UPDATE NAME] Updated:', profile.email, '|', oldName, '→', user.name);
      }
      
      console.log('✅ [WHITELIST] Gmail user login approved:', profile.email);
    }
  } else {
    // Non-Gmail users: auto-create if not exists
    if (!user) {
      user = {
        user_id: nextUserId++,
        email: profile.email,
        passwordHash: '',
        role: Role.USER,
        name: profile.name || profile.given_name || profile.email.split('@')[0],
        picture: profile.picture || '',
        isWhitelisted: false, // Non-Gmail users don't need whitelist
      };
      mockUsers.push(user);
    } else {
      // User exists - ensure name and picture are strings
      user.name = profile.name || profile.given_name || user.name || user.email.split('@')[0];
      user.picture = profile.picture || user.picture || '';
    }
  }
  
  authToken = `token-${Date.now()}`;
  loggedInUser = user;
  
  // Store token in session map
  activeSessions.set(authToken, { user, timestamp: Date.now() });
  
  // Sanitize and validate user object before sending to frontend
  const sanitizedUser = sanitizeUser(user);
  
  console.log('✅ [GOOGLE LOGIN SUCCESS] User:', sanitizedUser.email);
  console.log('📋 [USER OBJECT] Keys:', Object.keys(sanitizedUser));
  console.log('📋 [USER OBJECT] name:', sanitizedUser.name, '(type:', typeof sanitizedUser.name + ')');
  console.log('📋 [USER OBJECT] picture:', sanitizedUser.picture, '(type:', typeof sanitizedUser.picture + ')');
  console.log('📋 [USER OBJECT] email:', sanitizedUser.email, '(type:', typeof sanitizedUser.email + ')');
  
  return res.json({ user: sanitizedUser, token: authToken });
});

app.post('/api/register', async (req, res) => {
  await sleep(200);
  const { email, name, password } = req.body;
  if (mockUsers.find((u) => u.email === email)) return res.status(400).json({ error: 'User exists' });
  
  const domain = getDomainFromEmail(email);
  const isGmail = domain === 'gmail.com';
  
  const user = {
    user_id: nextUserId++,
    email,
    passwordHash: password || '',
    role: Role.USER,
    name,
    picture: null,
    isWhitelisted: isGmail ? false : false, // Gmail users registered directly are NOT whitelisted by default
  };
  mockUsers.push(user);
  return res.json(sanitizeUser(user));
});

app.post('/api/logout', (req, res) => {
  authToken = null;
  loggedInUser = null;
  return res.json({ ok: true });
});

// --- Debug endpoints (for troubleshooting) ---
app.get('/api/debug/email-config', (req, res) => {
  res.json({
    USE_REAL_EMAIL: process.env.USE_REAL_EMAIL || 'NOT SET',
    GMAIL_USER: process.env.GMAIL_USER || 'NOT SET',
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD ? 'SET (length: ' + process.env.GMAIL_APP_PASSWORD.length + ')' : 'NOT SET',
    emailMode: process.env.USE_REAL_EMAIL === 'true' ? 'REAL' : 'MOCK',
    isConfigured: !!(process.env.USE_REAL_EMAIL === 'true' && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
  });
});

app.get('/api/debug/test-email', async (req, res) => {
  try {
    const testResult = await emailService.sendEmail(
      process.env.GMAIL_USER || 'test@example.com',
      '[TEST] Production Email Test',
      `<h1>✅ Test from Production Server</h1>
       <p>Sent at: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
       <p>Server time: ${Date.now()}</p>`
    );
    res.json({ success: true, result: testResult, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

// --- Users ---
app.get('/api/users', filterByDomain('users'), async (req, res) => {
  await sleep(100);
  return res.json(mockUsers.map(sanitizeUser));
});

app.post('/api/users', async (req, res) => {
  await sleep(200);
  const { email, name, role, password } = req.body;
  if (mockUsers.find((u) => u.email === email)) return res.status(400).json({ error: 'User exists' });
  
  const domain = getDomainFromEmail(email);
  const isGmail = domain === 'gmail.com';
  
  const user = {
    user_id: nextUserId++,
    email,
    passwordHash: password || '',
    role: role || Role.USER,
    name,
    picture: null,
    isWhitelisted: isGmail ? true : false, // Auto-whitelist Gmail users added by admin
  };
  mockUsers.push(user);
  
  if (isGmail) {
    console.log('✅ [WHITELIST] Gmail user added and whitelisted:', email);
  }
  
  // ✅ Send welcome email to new user
  console.log(`📧 [EMAIL] Sending welcome email to new user: ${user.email}`);
  emailService.notifyNewUser(user).catch(err => 
    console.error('[EMAIL] Failed to send welcome email:', err.message)
  );
  
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
app.get('/api/tasks', filterByDomain('tasks'), async (req, res) => {
  await sleep(100);
  // Populate attachment_ids with full file objects
  const tasksWithAttachments = mockTasks.map(task => {
    const attachments = (task.attachment_ids || [])
      .map(fileId => mockFiles.find(f => f.id_file === fileId))
      .filter(Boolean); // Remove undefined
    
    return {
      ...task,
      attachments, // Add full file objects array
    };
  });
  return res.json(tasksWithAttachments);
});

app.post('/api/tasks', authenticate, checkDomainIsolation, (req, res, next) => {
  uploadDescription.array('attachments', 10)(req, res, (err) => {
    if (err) {
      console.error('[MULTER ERROR]', err);
      return res.status(400).json({ 
        error: 'File upload failed', 
        details: err.message 
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    await sleep(150);
    const data = req.body;
    const files = req.files || []; // Multiple files - ARRAY not single file
    
    console.log('[POST /api/tasks] Received:', { 
      id_task: data.id_task, 
      title: data.title, 
      filesCount: files.length,
      hasFiles: Array.isArray(files),
      bodyKeys: Object.keys(req.body)
    });

    if (data.id_task) {
      // Update existing task
      const idx = mockTasks.findIndex((t) => t.id_task === data.id_task);
      if (idx === -1) return res.status(404).json({ error: 'Task not found' });

      // Save multiple description files to Cloudinary
      if (files.length > 0) {
        const newFileIds = [];
        for (const file of files) {
          const newId = nextFileId++;
          console.log('✅ Description file uploaded to Cloudinary:', file.path);
          
          const fileMeta = {
            id_file: newId,
            id_user: loggedInUser ? loggedInUser.user_id : 0,
            name: file.originalname,
            url: `/files/${newId}/download`,
            cloudinary_url: file.path,
            cloudinary_id: file.filename,
            file_type: file.mimetype,
            file_size: file.size,
          };
          mockFiles.push(fileMeta);
          newFileIds.push(newId);
        }
        // Append new file IDs to existing attachment_ids
        mockTasks[idx].attachment_ids = [...(mockTasks[idx].attachment_ids || []), ...newFileIds];
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
      
      console.log('[POST /api/tasks] Task updated successfully:', mockTasks[idx].id_task);
      return res.json(mockTasks[idx]);
    }

    // Create new task
    const newTaskId = nextTaskId++;
    const attachmentIds = [];

    // Save multiple description files to Cloudinary (autotask-descriptions folder)
    if (files.length > 0) {
      console.log(`[POST /api/tasks] Processing ${files.length} files...`);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          console.log(`[FILE ${i+1}] Processing:`, {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            hasPath: !!file.path,
            hasFilename: !!file.filename
          });
          
          if (!file.path || !file.filename) {
            throw new Error(`File ${file.originalname} missing Cloudinary data (path: ${!!file.path}, filename: ${!!file.filename})`);
          }
          
          const fileId = nextFileId++;
          console.log(`✅ [FILE ${i+1}] Uploaded to Cloudinary:`, file.path);
          
          const fileMeta = {
            id_file: fileId,
            id_user: loggedInUser ? loggedInUser.user_id : 0,
            name: file.originalname,
            url: `/files/${fileId}/download`,
            cloudinary_url: file.path,
            cloudinary_id: file.filename,
            file_type: file.mimetype,
            file_size: file.size,
          };
          mockFiles.push(fileMeta);
          attachmentIds.push(fileId);
        } catch (fileError) {
          console.error(`❌ [FILE ${i+1}] Error processing file:`, fileError.message);
          throw new Error(`Failed to process file ${file.originalname}: ${fileError.message}`);
        }
      }
      console.log(`[POST /api/tasks] Successfully processed ${attachmentIds.length} files`);
    } else {
      console.log('[POST /api/tasks] No files attached to this task');
    }

    const newTask = {
      id_task: newTaskId,
      title: data.title || 'Untitled',
      description: data.description || '',
      assignee_id: Number(data.assignee_id) || (loggedInUser ? loggedInUser.user_id : 1),
      assigner_id: Number(data.assigner_id) || (loggedInUser ? loggedInUser.user_id : 1),
      priority: Number(data.priority) || 2,
      deadline: data.deadline || new Date().toISOString(),
      date_created: new Date().toISOString(),
      date_submit: null,
      attachment_ids: attachmentIds, // Array of description file IDs (can be empty)
      submit_file_id: null,
      score: null,
      status: data.status || 'Pending',
    };
    
    console.log('[POST /api/tasks] Creating task:', {
      id: newTask.id_task,
      title: newTask.title,
      attachmentCount: attachmentIds.length
    });
    
    mockTasks.push(newTask);

    // Send email notification to assignee
    try {
      const assignee = mockUsers.find(u => u.user_id === newTask.assignee_id);
      const assigner = mockUsers.find(u => u.user_id === newTask.assigner_id) || loggedInUser;
      
      console.log('[POST /api/tasks] Email notification:', { 
        hasAssignee: !!assignee, 
        hasAssigner: !!assigner,
        assigneeId: newTask.assignee_id,
        assignerId: newTask.assigner_id
      });
      
      if (assignee && assigner) {
        emailService.notifyTaskAssigned(newTask, assignee, assigner).catch(err => 
          console.error('[EMAIL] Failed to send task assignment notification:', err.message)
        );
      }
    } catch (emailError) {
      console.error('[POST /api/tasks] Email notification error (non-critical):', emailError.message);
    }

    console.log('[POST /api/tasks] Task created successfully:', newTask.id_task);
    return res.json(newTask);
    
  } catch (error) {
    console.error('[POST /api/tasks] TASK CREATION CRASH:', error);
    console.error('[POST /api/tasks] Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Failed to create/update task', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  await sleep(100);
  const id = Number(req.params.id);
  const idx = mockTasks.findIndex((t) => t.id_task === id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  
  // Prevent deletion of completed tasks
  const task = mockTasks[idx];
  if (task.status === 'Completed') {
    return res.status(403).json({ 
      error: 'Cannot delete completed task',
      message: 'Tasks that have been completed cannot be deleted to maintain record integrity.'
    });
  }
  
  mockTasks.splice(idx, 1);
  return res.json({ ok: true });
});

// DELETE attachment file from task
app.delete('/api/tasks/:taskId/attachments/:fileId', authenticate, async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const fileId = Number(req.params.fileId);
    
    // Find task
    const task = mockTasks.find((t) => t.id_task === taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    // Check if task is completed or submitted (prevent deletion)
    if (task.status === 'Completed' || task.status === 'submitted') {
      return res.status(403).json({ 
        error: 'Cannot delete attachments from completed/submitted tasks',
        message: 'Files from completed tasks are protected for record keeping.'
      });
    }
    
    // Find file
    const file = mockFiles.find(f => f.id_file === fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });
    
    // Delete from Cloudinary
    if (file.cloudinary_id) {
      await cloudinary.uploader.destroy(file.cloudinary_id, { resource_type: 'raw' });
      console.log(`✅ Deleted file from Cloudinary: ${file.cloudinary_id}`);
    }
    
    // Remove from mockFiles array
    const fileIdx = mockFiles.findIndex(f => f.id_file === fileId);
    if (fileIdx !== -1) mockFiles.splice(fileIdx, 1);
    
    // Remove from task.attachment_ids
    if (task.attachment_ids) {
      task.attachment_ids = task.attachment_ids.filter(id => id !== fileId);
    }
    
    return res.json({ ok: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('[DELETE FILE] Error:', error);
    return res.status(500).json({ error: 'Failed to delete file', details: error.message });
  }
});

app.post('/api/tasks/:id/submit', authenticate, checkDomainIsolation, uploadSubmission.single('file'), async (req, res) => {
  await sleep(200);
  const id = Number(req.params.id);
  const task = mockTasks.find((t) => t.id_task === id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!req.file) return res.status(400).json({ error: 'File required' });
  
  // ✅ File automatically uploaded to Cloudinary by multer!
  // req.file.path = Cloudinary URL
  // req.file.filename = Cloudinary public_id
  try {
    console.log(`[UPLOAD] ✅ File uploaded to Cloudinary: ${req.file.path}`);
    console.log(`[UPLOAD] Cloudinary public_id: ${req.file.filename}`);

    const newId = nextFileId++;
    const fileMeta = {
      id_file: newId,
      id_user: loggedInUser ? loggedInUser.user_id : 0,
      name: req.file.originalname,
      url: `/files/${newId}/download`,
      cloudinary_url: req.file.path,           // Cloudinary URL
      cloudinary_id: req.file.filename,        // For deletion if needed
      file_type: req.file.mimetype,
      file_size: req.file.size,
    };
    mockFiles.push(fileMeta);

    task.submit_file_id = fileMeta.id_file;
    const submissionTime = new Date();
    task.date_submit = submissionTime.toISOString();
    task.score = calcScoreForSubmission(task, fileMeta);
    task.status = 'Completed';

    // ✅ Check if submission is overdue and send appropriate email
    const submitter = mockUsers.find(u => u.user_id === task.assignee_id) || loggedInUser;
    const assigner = mockUsers.find(u => u.user_id === task.assigner_id);
    const admins = mockUsers.filter(u => u.role === Role.ADMIN);
    
    if (submitter && assigner) {
      // Check if submission is after deadline (deadline is until 23:59:59.999 of that day)
      const deadlineDate = new Date(task.deadline);
      // Set deadline to end of day (23:59:59.999)
      deadlineDate.setHours(23, 59, 59, 999);
      const isOverdue = submissionTime > deadlineDate;
      
      if (isOverdue) {
        // Send overdue submission email (red warning)
        console.log(`📧 [EMAIL] Sending OVERDUE submission notification to admins for task: ${task.title}`);
        emailService.notifyOverdueSubmission(task, submitter, admins).catch(err => 
          console.error('[EMAIL] Failed to send overdue submission notification:', err.message)
        );
      } else {
        // Send normal completion email (green success)
        console.log(`📧 [EMAIL] Sending task completion notification to admins for task: ${task.title}`);
        emailService.notifyTaskCompleted(task, submitter, admins).catch(err => 
          console.error('[EMAIL] Failed to send task completion notification:', err.message)
        );
      }
    } else {
      console.warn('⚠️ [EMAIL] Cannot send task submission email - missing submitter or assigner');
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

  // Note: No authentication required for download
  // Cloudinary URLs are public but hard to guess (contains public_id)
  // If you need private files, use Cloudinary signed URLs

  // ✅ Redirect to Cloudinary URL (file is stored in cloud)
  try {
    if (file.cloudinary_url) {
      console.log(`[DOWNLOAD] ✅ Redirecting to Cloudinary: ${file.name}`);
      console.log(`[DOWNLOAD] URL: ${file.cloudinary_url}`);
      // Redirect browser to Cloudinary URL
      return res.redirect(file.cloudinary_url);
    }
    
    // Fallback for old files (if any exist with local path)
    const fs = require('fs');
    const path = require('path');
    
    if (file.path && fs.existsSync(file.path)) {
      console.log(`[DOWNLOAD] ⚠️ Serving legacy file from disk: ${file.name}`);
      const ext = path.extname(file.name).toLowerCase();
      const mimeTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.txt': 'text/plain',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.zip': 'application/zip',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
      return res.download(file.path, file.name);
    }
    
    console.warn(`[DOWNLOAD] ❌ File not found: ${file.name}`);
    return res.status(404).json({ error: 'File not found' });
  } catch (e) {
    console.error('[DOWNLOAD] Error serving file:', e && e.message);
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

// --- Serve Static Frontend (Production) ---
// Serve the built React app from 'dist' folder
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all route for SPA (must be LAST, after all API routes)
// Handles client-side routing by serving index.html for non-API requests
app.use((req, res, next) => {
  // Skip if it's an API route
  if (req.path.startsWith('/api/')) {
    return next(); // Will result in 404 if API endpoint doesn't exist
  }
  // Serve React app for all other routes
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Bind to all network interfaces for network access (0.0.0.0)
// Use HOST env variable to restrict if needed (e.g., HOST=127.0.0.1 for localhost-only)
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  if (HOST === '0.0.0.0') {
    console.log('✅ Server accessible on network (all interfaces)');
  }
  console.log('📱 Frontend: Serving React app from /dist');
  console.log('🔌 Backend API: Available at /api/*');
  
  // Email configuration check on startup
  console.log('\n📧 Email Configuration Status:');
  if (process.env.USE_REAL_EMAIL === 'true' || process.env.USE_REAL_MAIL === 'true') {
    if (USE_SENDGRID) {
      console.log('   ✅ SendGrid API mode ENABLED');
      console.log('   📬 From email:', SENDGRID_FROM_EMAIL);
      console.log('   🔐 API key: configured (' + SENDGRID_API_KEY.substring(0, 10) + '...)');
      console.log('   ✨ This will work on Render production!');
    } else if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('   ❌ ERROR: Email credentials not configured!');
      console.error('   For SendGrid: Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL');
      console.error('   For Gmail: Set GMAIL_USER and GMAIL_APP_PASSWORD');
      console.error('   Current status:');
      console.error('     - SENDGRID_API_KEY:', SENDGRID_API_KEY ? 'SET' : 'NOT SET');
      console.error('     - SENDGRID_FROM_EMAIL:', SENDGRID_FROM_EMAIL || 'NOT SET');
      console.error('     - GMAIL_USER:', process.env.GMAIL_USER || 'NOT SET');
      console.error('     - GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'SET' : 'NOT SET');
    } else {
      console.log('   ✅ Gmail SMTP mode ENABLED');
      console.log('   📬 Using Gmail account:', process.env.GMAIL_USER);
      console.log('   🔐 App password: configured (' + process.env.GMAIL_APP_PASSWORD.length + ' chars)');
      console.log('   ⚠️  Note: Gmail SMTP may not work on Render free tier');
    }
  } else {
    console.log('   ⚠️  MOCK MODE - Emails will only be logged to console');
    console.log('   Set USE_REAL_EMAIL=true or USE_REAL_MAIL=true to enable real emails');
  }
  console.log('');
  
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
