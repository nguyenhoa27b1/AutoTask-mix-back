import { Task, Priority } from '../types';
import { STATUS } from './constants';

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

export const isOverdue = (task: Task): boolean => {
  return new Date(task.deadline) < new Date() && task.status === STATUS.PENDING;
};

export const getPriorityLabel = (priority: Priority): string => {
  return Priority[priority];
};

export const filterTasksBySearch = (tasks: Task[], searchTerm: string): Task[] => {
  if (!searchTerm.trim()) return tasks;
  const lower = searchTerm.toLowerCase();
  return tasks.filter(task =>
    task.title.toLowerCase().includes(lower) ||
    task.description.toLowerCase().includes(lower)
  );
};

export const separateTasksByStatus = (tasks: Task[]) => {
  return {
    pending: tasks.filter(task => task.status === STATUS.PENDING),
    completed: tasks.filter(task => task.status === STATUS.COMPLETED),
  };
};

export const calculateMonthlyScore = (tasks: Task[]): number => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return tasks
    .filter(task => {
      const taskDate = new Date(task.date_submit || task.date_created);
      return (
        taskDate.getMonth() === currentMonth &&
        taskDate.getFullYear() === currentYear
      );
    })
    .reduce((total, task) => total + (task.score ?? 0), 0);
};

export const rankUsersByScore = (users: any[], tasks: Task[]) => {
  const usersWithScores = users.map(user => ({
    ...user,
    score: calculateMonthlyScore(
      tasks.filter(task => task.assignee_id === user.user_id)
    ),
  }));

  return usersWithScores.sort((a, b) => b.score - a.score);
};
