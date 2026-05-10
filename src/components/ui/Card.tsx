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
      ${highlight ? 'border-awan-gold/30 bg-awan-bg-highlight shadow-[0_0_30px_rgba(212,175,55,0.08)]' : ''}
      ${variant === 'outline' ? 'bg-transparent border-white/10' : ''}
      ${variant === 'flat' ? 'border-none shadow-none bg-awan-bg-soft/50' : ''}
      ${className}
    `}>
      {/* Visual Accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-awan-gold/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-awan-gold/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-awan-gold/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-awan-gold/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

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

  if (onPress || onLongPress) {
    return (
      <Touch onPress={onPress} onLongPress={onLongPress} className="w-full text-left">
        {CardBase}
      </Touch>
    );
  }

  return CardBase;
}
