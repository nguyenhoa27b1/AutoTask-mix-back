import React, { useMemo, useState } from 'react';
import { Task, User, Role } from '../types';
import TaskList from './TaskList';
import PlusIcon from './icons/PlusIcon';
import DownloadIcon from './icons/DownloadIcon';
import UserManagement from './UserManagement';
import SearchIcon from './icons/SearchIcon';
import LeaveManagement from './LeaveManagement';
import LeaveRequestModal from './LeaveRequestModal';
import { createLeaveRequest } from '../services/api';

interface DashboardProps {
  currentUser: User;
  tasks: Task[];
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  onPageChange: (page: number) => void;
  onSelectTask: (task: Task) => void;
  onCreateTask: () => void;
  onAddUser: (email: string, role: Role) => void;
  onUpdateUserRole: (userId: number, role: Role) => void;
  onDeleteUser: (userId: number) => void;
  onViewUserTasks: (userId: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    currentUser, 
    tasks, 
    users,
    pagination,
    onPageChange,
    onSelectTask, 
    onCreateTask,
    onAddUser,
    onUpdateUserRole,
    onDeleteUser,
    onViewUserTasks
}) => {
  console.log('🎯 [DASHBOARD] Rendering with currentUser:', currentUser);
  console.log('🎯 [DASHBOARD] currentUser type:', typeof currentUser);
  console.log('🎯 [DASHBOARD] currentUser.email:', currentUser?.email);
  console.log('🎯 [DASHBOARD] currentUser keys:', currentUser ? Object.keys(currentUser) : 'undefined');
  console.log('🎯 [DASHBOARD] Full currentUser JSON:', JSON.stringify(currentUser, null, 2));
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'leave' | 'users'>('tasks');
  const isAdmin = currentUser.role === Role.ADMIN;

  // Note: Backend now handles pagination and sorting (Overdue→Pending→Submitted→Completed)
  // We no longer filter by role here - backend returns appropriate tasks based on user
  
  // Filter tasks based on the search term (client-side filtering on current page)
  const searchedTasks = useMemo(() => tasks.filter(task => {
    if (!searchTerm.trim()) return true;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return (
        task.title.toLowerCase().includes(lowerCaseSearchTerm) ||
        task.description.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }), [tasks, searchTerm]);

  // Separate tasks by status for display sections
  const overdueTasks = searchedTasks.filter(task => task.status === 'Overdue' || task.isOverdue);
  const pendingTasks = searchedTasks.filter(task => task.status === 'Pending' && !task.isOverdue);
  const submittedTasks = searchedTasks.filter(task => task.status === 'Submitted');
  const completedTasks = searchedTasks.filter(task => task.status === 'Completed');

  const monthlyScore = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Calculate score ONLY for tasks assigned TO the current user (not tasks they created)
    return tasks
      .filter(task => {
        // Only count tasks where current user is the ASSIGNEE
        if (task.assignee_id !== currentUser.user_id) return false;
        if (task.status !== 'Completed' || !task.date_submit) return false;
        const submitDate = new Date(task.date_submit);
        return submitDate.getMonth() === currentMonth && submitDate.getFullYear() === currentYear;
      })
      .reduce((total, task) => total + (task.score ?? 0), 0);
  }, [tasks, currentUser.user_id]);

  const rankedUsers = useMemo(() => {
    if (!isAdmin) return users;

    const usersWithScores = users.map(user => {
      const totalScore = tasks
        .filter(task => task.assignee_id === user.user_id && task.status === 'Completed' && typeof task.score === 'number')
        .reduce((acc, task) => acc + (task.score ?? 0), 0);
      return { ...user, score: totalScore };
    });

    return usersWithScores.sort((a, b) => b.score - a.score);
  }, [users, tasks, isAdmin]);

  const handleLeaveRequest = async (startDate: string, endDate: string, reason: string) => {
    try {
      await createLeaveRequest(startDate, endDate, reason);
      alert('Leave request submitted successfully!');
      setShowLeaveModal(false);
    } catch (error) {
      console.error('Failed to create leave request:', error);
      alert('Failed to submit leave request');
    }
  };

  const handleExportExcel = async () => {
    try {
      const API_BASE_URL = typeof (import.meta as any).env !== 'undefined' && (import.meta as any).env.VITE_API_BASE_URL
        ? (import.meta as any).env.VITE_API_BASE_URL
        : `http://${window.location.hostname}:4000/api`;
      
      const url = `${API_BASE_URL}/export/excel`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to export Excel');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `AutoTask_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      alert('Excel file downloaded successfully!');
    } catch (error) {
      console.error('Failed to export Excel:', error);
      alert('Failed to export Excel file');
    }
  };
  
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Welcome back, {currentUser?.email?.split('@')[0] || currentUser?.name || 'User'}!</p>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
             <div className="text-center bg-white dark:bg-gray-800 p-3 rounded-lg shadow">
                 <p className="text-sm text-gray-500 dark:text-gray-400">{isAdmin ? "System Score This Month" : "This Month's Score"}</p>
                 <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{monthlyScore}</p>
             </div>
             <button 
               onClick={handleExportExcel} 
               className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-5 rounded-lg shadow-lg flex items-center gap-2"
               title="Export to Excel"
             >
                <DownloadIcon className="w-5 h-5"/>
                <span>Export</span>
             </button>
             <button onClick={onCreateTask} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-5 rounded-lg shadow-lg flex items-center gap-2">
                <PlusIcon className="w-5 h-5"/>
                <span>Create Task</span>
             </button>
          </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'tasks'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveTab('leave')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'leave'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Leave Requests
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'users'
                  ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              User Management
            </button>
          )}
        </nav>
      </div>
      
      {activeTab === 'tasks' && (
        <>
          <div className="mb-8">
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <SearchIcon className="w-5 h-5 text-gray-400" />
                </span>
                <input
                    type="text"
                    placeholder="Search tasks by title or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                    aria-label="Search tasks"
                />
            </div>
          </div>

          <div className="space-y-8">
            {overdueTasks.length > 0 && (
              <TaskList
                title="⚠️ Overdue Tasks"
                tasks={overdueTasks}
                users={users}
                onSelectTask={onSelectTask}
                variant="overdue"
              />
            )}
            {pendingTasks.length > 0 && (
              <TaskList
                title={isAdmin ? "All Pending Tasks" : "My Pending Tasks"}
                tasks={pendingTasks}
                users={users}
                onSelectTask={onSelectTask}
              />
            )}
            {submittedTasks.length > 0 && (
              <TaskList
                title="Submitted Tasks"
                tasks={submittedTasks}
                users={users}
                onSelectTask={onSelectTask}
              />
            )}
            {completedTasks.length > 0 && (
              <TaskList
                title={isAdmin ? "All Completed Tasks" : "My Completed Tasks"}
                tasks={completedTasks}
                users={users}
                onSelectTask={onSelectTask}
              />
            )}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Previous
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      pageNum === pagination.page
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={!pagination.hasMore}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Next
              </button>
              
              <span className="ml-4 text-sm text-gray-600 dark:text-gray-400">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total tasks)
              </span>
            </div>
          )}
        </>
      )}

      {activeTab === 'leave' && (
        <div>
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => setShowLeaveModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-5 rounded-lg shadow-lg flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5"/>
              <span>Request Leave</span>
            </button>
          </div>
          <LeaveManagement currentUser={currentUser} users={users} />
        </div>
      )}

      {activeTab === 'users' && isAdmin && (
        <UserManagement 
            users={rankedUsers}
            onAddUser={onAddUser}
            onUpdateUserRole={onUpdateUserRole}
            onDeleteUser={onDeleteUser}
            onViewUserTasks={onViewUserTasks}
        />
      )}

      <LeaveRequestModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        currentUser={currentUser}
        onSubmit={handleLeaveRequest}
      />
    </div>
  );
};

export default Dashboard;