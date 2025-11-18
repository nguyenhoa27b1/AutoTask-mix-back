import React, { createContext, useContext, useState, useCallback } from 'react';
import { Task, User, AppFile } from '../types';

interface DataContextType {
  tasks: Task[];
  users: User[];
  files: AppFile[];
  setTasks: (tasks: Task[]) => void;
  setUsers: (users: User[]) => void;
  setFiles: (files: AppFile[]) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  removeTask: (taskId: number) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [files, setFiles] = useState<AppFile[]>([]);

  const addTask = useCallback((task: Task) => {
    setTasks(prev => [...prev, task]);
  }, []);

  const updateTask = useCallback((updatedTask: Task) => {
    setTasks(prev =>
      prev.map(task => (task.id_task === updatedTask.id_task ? updatedTask : task))
    );
  }, []);

  const removeTask = useCallback((taskId: number) => {
    setTasks(prev => prev.filter(task => task.id_task !== taskId));
  }, []);

  const value: DataContextType = {
    tasks,
    users,
    files,
    setTasks,
    setUsers,
    setFiles,
    addTask,
    updateTask,
    removeTask,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within DataProvider');
  }
  return context;
};
