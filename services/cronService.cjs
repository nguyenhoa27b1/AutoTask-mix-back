const cron = require('node-cron');
const { sendDeadlineReminderEmail } = require('./emailService.cjs');

let cronJobs = [];

/**
 * Start cron job to check for upcoming deadlines
 * Runs every day at 8:00 AM
 */
function startDeadlineReminderCron(getTasks, getUsers, getFiles) {
  // Schedule: Every day at 8:00 AM
  // Format: minute hour day month weekday
  const job = cron.schedule('0 8 * * *', async () => {
    console.log('🔔 Running deadline reminder cron job...');
    
    try {
      const tasks = await getTasks();
      const users = await getUsers();
      const files = await getFiles();
      
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);
      
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      // Find tasks with deadline tomorrow and status is Pending
      const upcomingTasks = tasks.filter(task => {
        const deadline = new Date(task.deadline);
        return (
          task.status === 'Pending' &&
          deadline >= todayStart &&
          deadline <= tomorrow
        );
      });
      
      console.log(`📋 Found ${upcomingTasks.length} tasks with upcoming deadlines`);
      
      // Send reminder emails
      for (const task of upcomingTasks) {
        const assignee = users.find(u => u.user_id === task.assignee_id);
        
        if (!assignee || !assignee.email) {
          console.warn(`⚠️ No email found for task ${task.id_task} assignee`);
          continue;
        }
        
        // Get file URLs for this task
        const fileUrls = [];
        if (task.attachment_ids && task.attachment_ids.length > 0) {
          for (const fileId of task.attachment_ids) {
            const file = files.find(f => f.id_file === fileId);
            if (file && file.url) {
              fileUrls.push(file.url);
            }
          }
        }
        
        await sendDeadlineReminderEmail(
          assignee.email,
          assignee.name || assignee.email.split('@')[0],
          task,
          fileUrls
        );
      }
      
      console.log(`✅ Deadline reminder cron job completed. Sent ${upcomingTasks.length} emails.`);
    } catch (error) {
      console.error('❌ Error in deadline reminder cron job:', error);
    }
  });
  
  cronJobs.push({ name: 'deadlineReminder', job });
  console.log('✅ Deadline reminder cron job started (runs daily at 8:00 AM)');
  
  return job;
}

/**
 * Start cron job to check for overdue tasks
 * Runs every hour
 */
function startOverdueTasksCron(getTasks, updateTaskStatus) {
  // Schedule: Every hour at minute 0
  const job = cron.schedule('0 * * * *', async () => {
    console.log('🔍 Running overdue tasks check...');
    
    try {
      const tasks = await getTasks();
      const now = new Date();
      
      let updatedCount = 0;
      
      for (const task of tasks) {
        if (task.status === 'Pending') {
          const deadline = new Date(task.deadline);
          if (now > deadline) {
            // Update task status to overdue
            await updateTaskStatus(task.id_task, 'Overdue');
            updatedCount++;
            console.log(`⏰ Task ${task.id_task} "${task.title}" marked as overdue`);
          }
        }
      }
      
      console.log(`✅ Overdue check completed. Updated ${updatedCount} tasks.`);
    } catch (error) {
      console.error('❌ Error in overdue tasks cron job:', error);
    }
  });
  
  cronJobs.push({ name: 'overdueCheck', job });
  console.log('✅ Overdue tasks cron job started (runs every hour)');
  
  return job;
}

/**
 * Stop all cron jobs
 */
function stopAllCronJobs() {
  cronJobs.forEach(({ name, job }) => {
    job.stop();
    console.log(`⏹️ Stopped cron job: ${name}`);
  });
  cronJobs = [];
}

/**
 * Get status of all cron jobs
 */
function getCronJobsStatus() {
  return cronJobs.map(({ name, job }) => ({
    name,
    running: job.running || false
  }));
}

/**
 * Manual trigger for deadline reminders (for testing)
 */
async function triggerDeadlineRemindersNow(getTasks, getUsers, getFiles) {
  console.log('🔔 Manually triggering deadline reminders...');
  
  try {
    const tasks = await getTasks();
    const users = await getUsers();
    const files = await getFiles();
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const upcomingTasks = tasks.filter(task => {
      const deadline = new Date(task.deadline);
      return (
        task.status === 'Pending' &&
        deadline >= todayStart &&
        deadline <= tomorrow
      );
    });
    
    console.log(`📋 Found ${upcomingTasks.length} tasks with upcoming deadlines`);
    
    const results = [];
    
    for (const task of upcomingTasks) {
      const assignee = users.find(u => u.user_id === task.assignee_id);
      
      if (!assignee || !assignee.email) {
        results.push({ taskId: task.id_task, success: false, error: 'No email' });
        continue;
      }
      
      const fileUrls = [];
      if (task.attachment_ids && task.attachment_ids.length > 0) {
        for (const fileId of task.attachment_ids) {
          const file = files.find(f => f.id_file === fileId);
          if (file && file.url) {
            fileUrls.push(file.url);
          }
        }
      }
      
      const result = await sendDeadlineReminderEmail(
        assignee.email,
        assignee.name || assignee.email.split('@')[0],
        task,
        fileUrls
      );
      
      results.push({ taskId: task.id_task, ...result });
    }
    
    return { success: true, count: upcomingTasks.length, results };
  } catch (error) {
    console.error('❌ Error manually triggering reminders:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  startDeadlineReminderCron,
  startOverdueTasksCron,
  stopAllCronJobs,
  getCronJobsStatus,
  triggerDeadlineRemindersNow
};
