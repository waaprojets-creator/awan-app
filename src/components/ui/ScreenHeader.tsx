import React from 'react';

interface ScreenHeaderProps {
  tag?: string;
  title: string;
  className?: string;
}

export function ScreenHeader({ title, className = '' }: ScreenHeaderProps) {
  return (
    <div className={`flex justify-between items-baseline mb-6 ${className}`}>
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '14px',
          fontWeight: 'var(--fw-label)' as any,
          color: 'var(--color-awan-tx)',
          letterSpacing: '0.05em',
        }}
      >
        {title}
      </span>
    </div>
  );
}
