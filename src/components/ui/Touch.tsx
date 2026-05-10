import React from 'react';
import { motion } from 'motion/react';

interface TouchProps {
  children?: React.ReactNode;
  onPress?: (e?: any) => void;
  onLongPress?: () => void;
  className?: string;
  disabled?: boolean;
  scale?: number;
  opacity?: number;
  style?: any;
  [x: string]: any;
}

export function Touch({ 
  children, 
  onPress, 
  onLongPress, 
  className = '', 
  disabled = false,
  scale = 0.98,
  opacity = 0.8,
  style = {},
  ...props
}: TouchProps) {
  return (
    <motion.button
      {...props}
      whileTap={disabled ? {} : { scale, opacity }}
      onClick={disabled ? undefined : onPress}
      onContextMenu={(e) => {
        if (onLongPress) {
          e.preventDefault();
          onLongPress();
        }
      }}
      className={`relative appearance-none border-none bg-transparent p-0 m-0 cursor-pointer disabled:cursor-not-allowed ${className}`}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}
