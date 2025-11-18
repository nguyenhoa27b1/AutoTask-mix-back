import { useState, useCallback } from 'react';
import { User } from '../types';
import { api } from '../services/api';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string): Promise<User | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await api.login(email, password);
      if (!user) {
        setError('Invalid email or password');
        return null;
      }
      return user;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(
    async (credentialResponse: any): Promise<User | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const user = await api.loginWithGoogle(credentialResponse);
        if (!user) {
          setError('Failed to login with Google');
          return null;
        }
        return user;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Google login failed';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    setError(null);
    api.logout();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    login,
    loginWithGoogle,
    logout,
    isLoading,
    error,
    clearError,
  };
};
