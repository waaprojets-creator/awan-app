import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { FontSans, FwLabel } from '../../constants/typography';

interface ScreenHeaderProps {
  tag?: string;
  title: string;
  className?: string;
}

export function ScreenHeader({ title, className = '' }: ScreenHeaderProps) {
  const theme = useTheme();
  return (
    <div className={`flex justify-between items-baseline mb-6 ${className}`}>
      <span
        style={{
          fontFamily: FontSans,
          fontSize: '14px',
          fontWeight: FwLabel as any,
          color: theme.title,
          letterSpacing: '0.05em',
        }}
      >
        {title}
      </span>
    </div>
  );
}
