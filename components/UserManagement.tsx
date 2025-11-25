import React, { useState, memo, useCallback } from 'react';
import { User, Role } from '../types';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import PlusIcon from './icons/PlusIcon';
import ListBulletIcon from './icons/ListBulletIcon';
import { isSuperAdmin } from '../utils/userHelpers';
import { Card, ActionButton, FormInput } from './common';

interface UserWithScore extends User {
  score?: number;
}

interface UserManagementProps {
  users: UserWithScore[];
  onAddUser: (email: string, role: Role) => void;
  onUpdateUserRole: (userId: number, role: Role) => void;
  onDeleteUser: (userId: number) => void;
  onViewUserTasks: (userId: number) => void;
}

const UserManagement: React.FC<UserManagementProps> = memo(
  ({ users, onAddUser, onUpdateUserRole, onDeleteUser, onViewUserTasks }) => {
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState<Role>(Role.USER);

    const handleAddUser = useCallback(() => {
      if (newUserEmail.trim()) {
        onAddUser(newUserEmail, newUserRole);
        setNewUserEmail('');
        setNewUserRole(Role.USER);
      }
    }, [newUserEmail, newUserRole, onAddUser]);

    const handleRoleChange = useCallback(
      (userId: number, role: Role) => {
        onUpdateUserRole(userId, role);
      },
      [onUpdateUserRole]
    );

    return (
      <Card className="mt-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">User Management</h2>

        <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 border dark:border-gray-700 rounded-lg">
          <input
            type="email"
            placeholder="New user email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            className="flex-grow bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 text-gray-900 dark:text-gray-100"
          />
          <select
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value as Role)}
            className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 text-gray-900 dark:text-gray-100"
          >
            <option value={Role.USER}>User</option>
            <option value={Role.ADMIN}>Admin</option>
          </select>
          <ActionButton onClick={handleAddUser} variant="primary">
            <PlusIcon className="w-5 h-5" /> Add User
          </ActionButton>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">
                  ID
                </th>
                <th scope="col" className="px-6 py-3">
                  Name
                </th>
                <th scope="col" className="px-6 py-3">
                  Email
                </th>
                <th scope="col" className="px-6 py-3">
                  Role
                </th>
                <th scope="col" className="px-6 py-3">
                  Total Tasks
                </th>
                <th scope="col" className="px-6 py-3">
                  Completed
                </th>
                <th scope="col" className="px-6 py-3">
                  Avg Score
                </th>
                <th scope="col" className="px-6 py-3">
                  On Time
                </th>
                <th scope="col" className="px-6 py-3">
                  Late
                </th>
                <th scope="col" className="px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr
                  key={user.user_id}
                  className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{user.user_id}</td>
                  <td className="px-6 py-4">{user.name || 'N/A'}</td>
                  <td className="px-6 py-4">{user.email}</td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.user_id, e.target.value as Role)}
                      disabled={isSuperAdmin(user)}
                      className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value={Role.USER}>User</option>
                      <option value={Role.ADMIN}>Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-semibold">
                      {user.totalTasksAssigned ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-semibold">
                      {user.totalTasksCompleted ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-lg text-indigo-600 dark:text-indigo-400">
                    {user.averageScore ? user.averageScore.toFixed(1) : '0.0'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-semibold">
                      {user.tasksCompletedOnTime ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 font-semibold">
                      {user.tasksCompletedLate ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex items-center space-x-4">
                    <button
                      onClick={() => onViewUserTasks(user.user_id)}
                      className="text-blue-500 hover:text-blue-700"
                      title="View User's Tasks"
                    >
                      <ListBulletIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDeleteUser(user.user_id)}
                      disabled={isSuperAdmin(user)}
                      className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }
);

UserManagement.displayName = 'UserManagement';

export default UserManagement;