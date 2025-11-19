import { User } from '../types';

export const getUserDisplayName = (user: User): string => {
  // Ensure safe access to email and name properties
  return user?.name || user?.email?.split('@')[0] || 'User';
};

export const getUserInitials = (user: User): string => {
  const name = getUserDisplayName(user);
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const findUser = (users: User[], userId: number): User | undefined => {
  return users.find(u => u.user_id === userId);
};

export const isSuperAdmin = (user: User): boolean => {
  return user.user_id === 1;
};
