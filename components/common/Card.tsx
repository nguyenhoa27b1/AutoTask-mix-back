import React, { memo } from 'react';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = memo(({ className = '', children }) => (
  <div className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg ${className}`}>
    {children}
  </div>
));

Card.displayName = 'Card';

export default Card;
