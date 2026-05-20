import React from 'react';
import { motion } from 'motion/react';

interface HeadingProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4;
  className?: string;
  subtitle?: string;
  mono?: boolean;
  [x: string]: any;
}

export function Heading({ 
  children, 
  level = 1, 
  className = '', 
  subtitle,
  mono = false,
  ...props
}: HeadingProps) {
  const levels = {
    1: 'text-2xl font-bold tracking-tight',
    2: 'text-xl font-bold tracking-tight',
    3: 'text-lg font-semibold tracking-tight',
    4: 'text-awan-sm uppercase tracking-[0.2em] font-bold text-awan-tx-mute',
  };

  const Tag: any = `h${level}`;

  return (
    <div {...props} className={`mb-4 flex flex-col ${className}`}>
      {subtitle ? (
        <motion.p 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-awan-sm text-awan-tx-mute mb-1 uppercase tracking-[0.3em] font-mono font-bold"
        >
          {subtitle}
        </motion.p>
      ) : null}
      <Tag className={`${levels[level]} ${mono ? 'font-mono' : ''} text-awan-tx relative inline-block`}>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {children}
        </motion.span>
        {/* subtle scanning accent for high-level headings */}
        {level <= 2 && (
          <motion.div 
            initial={{ left: '-10%', opacity: 0 }}
            animate={{ left: '110%', opacity: [0, 0.4, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 5 }}
            className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-awan-gold/5 to-transparent skew-x-12 pointer-events-none"
          />
        )}
      </Tag>
    </div>
  );
}
