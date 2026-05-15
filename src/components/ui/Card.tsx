import React from 'react';
import { Touch } from './Touch';

interface CardProps {
  title?: string;
  value?: string | number;
  subtitle?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  children?: React.ReactNode;
  className?: string;
  innerClassName?: string;
  highlight?: boolean;
  variant?: 'default' | 'outline' | 'flat';
  [x: string]: any;
}

export function Card({ 
  title, 
  value, 
  subtitle, 
  onPress, 
  onLongPress,
  children, 
  className = '',
  innerClassName = '',
  highlight = false,
  variant = 'default',
  ...props
}: CardProps) {
  const CardBase = (
    <div 
      {...props}
      className={`
      awan-card p-5 flex flex-col gap-3 relative overflow-hidden group
      ${highlight ? 'border-awan-gold/30 bg-awan-surface shadow-[0_0_30px_rgba(212,175,55,0.08)]' : ''}
      ${variant === 'outline' ? 'bg-transparent border-white/10' : ''}
      ${variant === 'flat' ? 'border-none shadow-none bg-awan-bg/50' : ''}
      ${className}
    `}>
{(title || value) && (
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            {title && <span className="awan-label mb-1">{title}</span>}
            {subtitle && <span className="awan-value text-xs text-awan-tx-mute font-medium opacity-80">{subtitle}</span>}
          </div>
          {value && (
            <div className="flex flex-col items-end">
              <span className="awan-value text-awan-gold font-bold text-lg tracking-tighter">{value}</span>
              {highlight && <div className="w-1 h-1 rounded-full bg-awan-gold mt-1 shadow-[0_0_8px_rgba(212,175,55,1)]" />}
            </div>
          )}
        </div>
      )}
      <div className={`flex-1 ${innerClassName}`}>
        {children}
      </div>
    </div>
  );

  if (onPress !== undefined || onLongPress !== undefined) {
    const touchProps: Record<string, unknown> = { className: 'w-full text-left' };
    if (onPress !== undefined) touchProps['onPress'] = onPress;
    if (onLongPress !== undefined) touchProps['onLongPress'] = onLongPress;
    return <Touch {...touchProps}>{CardBase}</Touch>;
  }

  return CardBase;
}
