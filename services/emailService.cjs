const sgMail = require('@sendgrid/mail');
require('dotenv').config();

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Helper functions
function formatDeadline(deadline) {
  const date = new Date(deadline);
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return date.toLocaleDateString('en-US', options);
}

function getPriorityLabel(priority) {
  const labels = {
    1: '🟢 Low',
    2: '🟡 Medium',
    3: '🔴 High'
  };
  return labels[priority] || 'Medium';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Email template wrapper
function createEmailTemplate(title, content) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📋 AutoTask</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px;">
          ${content}
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            AutoTask Management System
          </p>
          <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">
            This is an automated email. Please do not reply.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 1. Email when task is assigned
async function sendTaskAssignedEmail(userEmail, userName, task, assignerName, fileUrls = []) {
  try {
    const fileLinksHtml = fileUrls.length > 0 ? `
      <div style="margin: 20px 0; padding: 15px; background-color: #f9fafb; border-radius: 6px; border-left: 4px solid #667eea;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #374151;">📎 Attached Files:</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${fileUrls.map(url => {
            const fileName = url.split('/').pop().split('?')[0];
            return `<li style="margin: 5px 0;"><a href="${url}" style="color: #667eea; text-decoration: none;">${decodeURIComponent(fileName)}</a></li>`;
          }).join('')}
        </ul>
      </div>
    ` : '';

    const content = `
      <h2 style="color: #1f2937; margin: 0 0 10px 0;">🎯 New Task Assigned</h2>
      <p style="color: #6b7280; margin: 0 0 20px 0;">Hi ${userName}, you have been assigned a new task by ${assignerName}.</p>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <div style="margin-bottom: 15px;">
          <strong style="color: #374151;">Title:</strong>
          <p style="margin: 5px 0 0 0; color: #1f2937; font-size: 18px;">${task.title}</p>
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong style="color: #374151;">Description:</strong>
          <p style="margin: 5px 0 0 0; color: #4b5563;">${task.description || 'No description provided'}</p>
        </div>
        
        <div style="display: flex; gap: 20px; margin-top: 15px;">
          <div>
            <strong style="color: #374151;">Priority:</strong>
            <p style="margin: 5px 0 0 0; color: #4b5563;">${getPriorityLabel(task.priority)}</p>
          </div>
          <div>
            <strong style="color: #374151;">Deadline:</strong>
            <p style="margin: 5px 0 0 0; color: #ef4444;">${formatDeadline(task.deadline)}</p>
          </div>
        </div>
      </div>

      ${fileLinksHtml}

      <div style="text-align: center; margin-top: 30px;">
        <a href="${FRONTEND_URL}/tasks/${task.id_task}" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; 
                  font-weight: bold;">
          View Task Details
        </a>
      </div>
    `;

    const msg = {
      to: userEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `📋 New Task: ${task.title}`,
      html: createEmailTemplate('New Task Assigned', content)
    };

    await sgMail.send(msg);
    console.log(`✅ Task assigned email sent to ${userEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending task assigned email:', error);
    if (error.response) {
      console.error('SendGrid error:', error.response.body);
    }
    return { success: false, error: error.message };
  }
}

// 2. Email when deadline is approaching (1 day before)
async function sendDeadlineReminderEmail(userEmail, userName, task, fileUrls = []) {
  try {
    const hoursLeft = Math.round((new Date(task.deadline) - new Date()) / (1000 * 60 * 60));
    
    const fileLinksHtml = fileUrls.length > 0 ? `
      <div style="margin: 20px 0; padding: 15px; background-color: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #92400e;">📎 Task Files:</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${fileUrls.map(url => {
            const fileName = url.split('/').pop().split('?')[0];
            return `<li style="margin: 5px 0;"><a href="${url}" style="color: #d97706; text-decoration: none;">${decodeURIComponent(fileName)}</a></li>`;
          }).join('')}
        </ul>
      </div>
    ` : '';

    const content = `
      <h2 style="color: #dc2626; margin: 0 0 10px 0;">⏰ Task Deadline Reminder</h2>
      <p style="color: #6b7280; margin: 0 0 20px 0;">Hi ${userName}, this is a reminder that your task deadline is approaching!</p>
      
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <div style="margin-bottom: 15px;">
          <strong style="color: #991b1b;">⚠️ Time Remaining:</strong>
          <p style="margin: 5px 0 0 0; color: #dc2626; font-size: 20px; font-weight: bold;">${hoursLeft} hours</p>
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong style="color: #374151;">Task:</strong>
          <p style="margin: 5px 0 0 0; color: #1f2937; font-size: 18px;">${task.title}</p>
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong style="color: #374151;">Deadline:</strong>
          <p style="margin: 5px 0 0 0; color: #dc2626;">${formatDeadline(task.deadline)}</p>
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong style="color: #374151;">Priority:</strong>
          <p style="margin: 5px 0 0 0;">${getPriorityLabel(task.priority)}</p>
        </div>
      </div>

      ${fileLinksHtml}

      <div style="text-align: center; margin-top: 30px;">
        <a href="${FRONTEND_URL}/tasks/${task.id_task}" 
           style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
                  color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; 
                  font-weight: bold;">
          Complete Task Now
        </a>
      </div>
    `;

    const msg = {
      to: userEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `⏰ Reminder: "${task.title}" deadline in ${hoursLeft} hours`,
      html: createEmailTemplate('Task Deadline Reminder', content)
    };

    await sgMail.send(msg);
    console.log(`✅ Deadline reminder sent to ${userEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending deadline reminder:', error);
    if (error.response) {
      console.error('SendGrid error:', error.response.body);
    }
    return { success: false, error: error.message };
  }
}

// 3. Email when task is scored and completed
async function sendTaskScoredEmail(userEmail, userName, task, score, adminName) {
  try {
    const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
    const scoreEmoji = score >= 80 ? '🌟' : score >= 60 ? '👍' : '📝';
    
    const content = `
      <h2 style="color: #1f2937; margin: 0 0 10px 0;">${scoreEmoji} Task Completed & Scored</h2>
      <p style="color: #6b7280; margin: 0 0 20px 0;">Hi ${userName}, your task has been reviewed and scored by ${adminName}.</p>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <div style="margin-bottom: 15px;">
          <strong style="color: #374151;">Task:</strong>
          <p style="margin: 5px 0 0 0; color: #1f2937; font-size: 18px;">${task.title}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; background: ${scoreColor}; color: white; 
                      padding: 20px 40px; border-radius: 50%; font-size: 36px; font-weight: bold;">
            ${score}
          </div>
          <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">out of 100</p>
        </div>
        
        <div style="margin-top: 20px;">
          <strong style="color: #374151;">Completed on:</strong>
          <p style="margin: 5px 0 0 0; color: #4b5563;">${formatDeadline(task.date_submit)}</p>
        </div>
        
        <div style="margin-top: 15px;">
          <strong style="color: #374151;">Original Deadline:</strong>
          <p style="margin: 5px 0 0 0; color: #4b5563;">${formatDeadline(task.deadline)}</p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${FRONTEND_URL}/tasks/${task.id_task}" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; 
                  font-weight: bold;">
          View Task Details
        </a>
      </div>
    `;

    const msg = {
      to: userEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `${scoreEmoji} Task Scored: "${task.title}" - ${score}/100`,
      html: createEmailTemplate('Task Scored', content)
    };

    await sgMail.send(msg);
    console.log(`✅ Task scored email sent to ${userEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending task scored email:', error);
    if (error.response) {
      console.error('SendGrid error:', error.response.body);
    }
    return { success: false, error: error.message };
  }
}

// 4. Email when task is deleted
async function sendTaskDeletedEmail(userEmail, userName, task, adminName) {
  try {
    const content = `
      <h2 style="color: #dc2626; margin: 0 0 10px 0;">🗑️ Task Deleted</h2>
      <p style="color: #6b7280; margin: 0 0 20px 0;">Hi ${userName}, a task assigned to you has been deleted by ${adminName}.</p>
      
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <div style="margin-bottom: 15px;">
          <strong style="color: #991b1b;">Deleted Task:</strong>
          <p style="margin: 5px 0 0 0; color: #1f2937; font-size: 18px;">${task.title}</p>
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong style="color: #374151;">Description:</strong>
          <p style="margin: 5px 0 0 0; color: #4b5563;">${task.description || 'No description'}</p>
        </div>
        
        <div style="margin-top: 15px;">
          <strong style="color: #374151;">Original Deadline:</strong>
          <p style="margin: 5px 0 0 0; color: #4b5563;">${formatDeadline(task.deadline)}</p>
        </div>
        
        <div style="margin-top: 15px;">
          <strong style="color: #374151;">Status:</strong>
          <p style="margin: 5px 0 0 0; color: #4b5563;">${task.status}</p>
        </div>
      </div>

      <p style="color: #6b7280; font-size: 14px; font-style: italic; margin-top: 20px;">
        If you have questions about this deletion, please contact ${adminName}.
      </p>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${FRONTEND_URL}" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; 
                  font-weight: bold;">
          View All Tasks
        </a>
      </div>
    `;

    const msg = {
      to: userEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `🗑️ Task Deleted: "${task.title}"`,
      html: createEmailTemplate('Task Deleted', content)
    };

    await sgMail.send(msg);
    console.log(`✅ Task deleted email sent to ${userEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending task deleted email:', error);
    if (error.response) {
      console.error('SendGrid error:', error.response.body);
    }
    return { success: false, error: error.message };
  }
}

// Test function to verify email configuration
async function testEmailConfiguration() {
  try {
    const msg = {
      to: process.env.SENDGRID_FROM_EMAIL,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'AutoTask Email System Test',
      text: 'This is a test email from AutoTask system. If you receive this, email configuration is working correctly.',
      html: '<p>This is a test email from <strong>AutoTask</strong> system.</p><p>If you receive this, email configuration is working correctly. ✅</p>'
    };

    await sgMail.send(msg);
    console.log('✅ Test email sent successfully!');
    return { success: true, message: 'Test email sent successfully' };
  } catch (error) {
    console.error('❌ Test email failed:', error);
    if (error.response) {
      console.error('SendGrid error:', error.response.body);
    }
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendTaskAssignedEmail,
  sendDeadlineReminderEmail,
  sendTaskScoredEmail,
  sendTaskDeletedEmail,
  testEmailConfiguration
};
