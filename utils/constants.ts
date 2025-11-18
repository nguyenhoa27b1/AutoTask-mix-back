import { Priority } from '../types';

export const PRIORITY_CONFIG = {
  [Priority.LOW]: {
    bg: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-800 dark:text-blue-200',
    border: 'border-blue-500',
    label: 'Low',
  },
  [Priority.MEDIUM]: {
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    text: 'text-yellow-800 dark:text-yellow-200',
    border: 'border-yellow-500',
    label: 'Medium',
  },
  [Priority.HIGH]: {
    bg: 'bg-red-100 dark:bg-red-900',
    text: 'text-red-800 dark:text-red-200',
    border: 'border-red-500',
    label: 'High',
  },
};

export const STATUS = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
};

export const TASK_FILTERS = {
  ALL: 'all',
  PENDING: 'pending',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
};

export const INPUT_CLASSES = 'appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100';

export const BUTTON_PRIMARY = 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out';

export const BUTTON_SECONDARY = 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold py-2 px-4 rounded-md';
