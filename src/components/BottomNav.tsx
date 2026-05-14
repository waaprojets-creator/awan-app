import React from 'react';
import { MoonMenu } from './MoonMenu';

interface BottomNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export default function BottomNav({ currentRoute, onNavigate }: BottomNavProps) {
  return <MoonMenu onNavigate={onNavigate} currentRoute={currentRoute} />;
}
