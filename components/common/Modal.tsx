import React, { memo } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = memo(
  ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
        <div
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
        >
          {title && (
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
              <button
                onClick={onClose}
                className="text-gray-500 text-3xl font-light hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                &times;
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

export default Modal;
