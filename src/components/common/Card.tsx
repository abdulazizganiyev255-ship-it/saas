import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'raised';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  style,
  ...props
}) => {
  const bgVar = variant === 'raised' ? 'var(--raised)' : 'var(--card)';

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-6 transition-colors shadow-sm ${className}`}
      style={{
        backgroundColor: bgVar,
        color: 'var(--text)',
        borderColor: 'var(--raised)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
