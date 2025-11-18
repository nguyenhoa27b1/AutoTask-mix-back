import React, { memo } from 'react';
import { INPUT_CLASSES } from '../../utils/constants';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const FormInput: React.FC<FormInputProps> = memo(
  ({ label, error, className, ...props }) => {
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
            {label}
          </label>
        )}
        <input {...props} className={`${INPUT_CLASSES} ${className || ''}`} />
        {error && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

export default FormInput;
