import { useState, useCallback } from 'react';
import { Task, User, Role, Priority, AppFile } from '../types';
import { api } from '../services/api';

interface UseTaskParams {
  currentUser: User;
  onTasksUpdated?: (tasks: Task[]) => void;
}

export const useTaskManagement = ({ currentUser, onTasksUpdated }: UseTaskParams) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveTask = useCallback(
    async (
      taskData: Omit<Task, 'id_task' | 'date_created'> & { id_task?: number },
      descriptionFiles?: FileList | null
    ): Promise<Task | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const savedTask = await api.saveTask(taskData, descriptionFiles, currentUser);
        onTasksUpdated?.(await api.getTasks());
        return savedTask;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to save task';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [currentUser, onTasksUpdated]
  );

  const deleteTask = useCallback(
    async (taskId: number): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const success = await api.deleteTask(taskId);
        if (success) {
          onTasksUpdated?.(await api.getTasks());
        }
        return success;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete task';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [onTasksUpdated]
  );

  const submitTask = useCallback(
    async (taskId: number, file: File): Promise<Task | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.submitTask(taskId, file, currentUser);
        onTasksUpdated?.(await api.getTasks());
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to submit task';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [currentUser, onTasksUpdated]
  );

  const clearError = useCallback(() => setError(null), []);

  const deleteAttachment = useCallback(
    async (taskId: number, fileId: number): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const success = await api.deleteAttachment(taskId, fileId);
        if (success) {
          onTasksUpdated?.(await api.getTasks());
        }
        return success;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete attachment';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [onTasksUpdated]
  );

  return {
    saveTask,
    deleteTask,
    deleteAttachment,
    submitTask,
    isLoading,
    error,
    clearError,
  };
};
