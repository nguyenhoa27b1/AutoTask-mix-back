import React, { useMemo, useState } from 'react';
import { Task, User, Role } from '../types';
import TaskList from './TaskList';
import PlusIcon from './icons/PlusIcon';
import UserManagement from './UserManagement';
import SearchIcon from './icons/SearchIcon';

interface DashboardProps {
  currentUser: User;
  tasks: Task[];
  users: User[];
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
  const isAdmin = currentUser.role === Role.ADMIN;

  // Memoize tasks specific to the current user's role
  const tasksForUser = useMemo(() => 
    isAdmin ? tasks : tasks.filter(task => task.assignee_id === currentUser.user_id),
    [isAdmin, tasks, currentUser.user_id]
  );

  // Filter tasks based on the search term
  const searchedTasks = useMemo(() => tasksForUser.filter(task => {
    if (!searchTerm.trim()) return true;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return (
        task.title.toLowerCase().includes(lowerCaseSearchTerm) ||
        task.description.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }), [tasksForUser, searchTerm]);

  const pendingTasks = searchedTasks.filter(task => task.status === 'Pending');
  const completedTasks = searchedTasks.filter(task => task.status === 'Completed');

  const monthlyScore = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Calculate score based on all of the user's tasks, not the searched/filtered ones
    return tasksForUser
      .filter(task => {
        if (task.status !== 'Completed' || !task.date_submit) return false;
        const submitDate = new Date(task.date_submit);
        return submitDate.getMonth() === currentMonth && submitDate.getFullYear() === currentYear;
      })
      .reduce((total, task) => total + (task.score ?? 0), 0);
  }, [tasksForUser]);

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
             <button onClick={onCreateTask} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-5 rounded-lg shadow-lg flex items-center gap-2">
                <PlusIcon className="w-5 h-5"/>
                <span>Create Task</span>
             </button>
          </div>
      </div>
      
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
        <TaskList
          title={isAdmin ? "All Pending Tasks" : "My Pending Tasks"}
          tasks={pendingTasks}
          users={users}
          onSelectTask={onSelectTask}
        />
        <TaskList
          title={isAdmin ? "All Completed Tasks" : "My Completed Tasks"}
          tasks={completedTasks}
          users={users}
          onSelectTask={onSelectTask}
        />
      </div>

      {isAdmin && (
        <UserManagement 
            users={rankedUsers}
            onAddUser={onAddUser}
            onUpdateUserRole={onUpdateUserRole}
            onDeleteUser={onDeleteUser}
            onViewUserTasks={onViewUserTasks}
        />
      )}
    </div>
  );
};

export default Dashboard;