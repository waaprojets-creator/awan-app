import React from 'react';

interface ScreenHeaderProps {
  tag: string;
  title: string;
  statusText?: string;
  className?: string;
}

export function ScreenHeader({ tag, title, statusText = '● SYNC', className = '' }: ScreenHeaderProps) {
  return (
    <div className={`flex justify-between items-baseline mb-6 ${className}`}>
      <div className="flex flex-col">
        <span
          className="uppercase block mb-1"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '7px',
            fontWeight: 400,
            color: 'var(--color-awan-tx-mute)',
            letterSpacing: '0.3em',
          }}
        >
          AWAN · {tag}
        </span>
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
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '8px',
          fontWeight: 400,
          color: 'var(--color-awan-status-ok)',
          letterSpacing: '0.2em',
        }}
      >
        {statusText}
      </span>
    </div>
  );
}
