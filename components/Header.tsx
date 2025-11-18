
import React from 'react';
import { User } from '../types';
import { getUserDisplayName } from '../utils/userHelpers';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout }) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">TaskFlow</h1>
          </div>
          {currentUser && (
            <div className="flex items-center">
              {currentUser.picture && (
                <img
                  src={currentUser.picture}
                  alt="Profile"
                  className="w-10 h-10 rounded-full mr-3"
                />
              )}
              <div className="text-right mr-4 hidden sm:block">
                <p className="text-gray-700 dark:text-gray-300">
                  Welcome, <span className="font-semibold">{getUserDisplayName(currentUser)}</span>
                </p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium capitalize">
                  {currentUser.role}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
