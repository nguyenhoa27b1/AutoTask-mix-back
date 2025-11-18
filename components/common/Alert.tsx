import React, { memo } from 'react';

interface AlertProps {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onClose?: () => void;
}

const Alert: React.FC<AlertProps> = memo(({ type, message, onClose }) => {
  const typeClasses = {
    success: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-500',
    error: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-500',
    info: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-500',
    warning: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-500',
  };

  return (
    <div className={`border-l-4 p-4 rounded ${typeClasses[type]}`}>
      <div className="flex justify-between items-center">
        <p className="font-medium">{message}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="text-lg font-semibold hover:opacity-75 transition-opacity"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
});

Alert.displayName = 'Alert';

export default Alert;
