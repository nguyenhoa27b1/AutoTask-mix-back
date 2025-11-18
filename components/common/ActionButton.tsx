import React, { memo } from 'react';
import PlusIcon from '../icons/PlusIcon';

interface ActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = memo(
  ({
    onClick,
    children,
    variant = 'primary',
    className = '',
    disabled = false,
  }) => {
    const variantClasses = {
      primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      secondary: 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100',
      danger: 'bg-red-600 hover:bg-red-700 text-white',
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          variantClasses[variant]
        } ${className}`}
      >
        {children}
      </button>
    );
  }
);

ActionButton.displayName = 'ActionButton';

export default ActionButton;
