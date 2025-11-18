import { useState, useCallback } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';

interface UseUserManagementParams {
  onUsersUpdated?: (users: User[]) => void;
}

export const useUserManagement = ({ onUsersUpdated }: UseUserManagementParams) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addUser = useCallback(
    async (email: string, role: Role): Promise<User | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const newUser = await api.addUser(email, role);
        onUsersUpdated?.(await api.getUsers());
        return newUser;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to add user';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [onUsersUpdated]
  );

  const updateUserRole = useCallback(
    async (userId: number, role: Role): Promise<User | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const updatedUser = await api.updateUserRole(userId, role);
        onUsersUpdated?.(await api.getUsers());
        return updatedUser;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update user role';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [onUsersUpdated]
  );

  const deleteUser = useCallback(
    async (userId: number): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const success = await api.deleteUser(userId);
        if (success) {
          onUsersUpdated?.(await api.getUsers());
        }
        return success;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete user';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [onUsersUpdated]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    addUser,
    updateUserRole,
    deleteUser,
    isLoading,
    error,
    clearError,
  };
};
