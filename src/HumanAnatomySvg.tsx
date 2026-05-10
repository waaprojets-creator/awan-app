import React from 'react';

interface HumanAnatomySvgProps {
  onPartPress?: (partId: string) => void;
  updatedParts?: Record<string, unknown>;
}

export function HumanAnatomySvg({ onPartPress: _onPartPress, updatedParts: _updatedParts = {} }: HumanAnatomySvgProps) {
  return <div style={{ width: 200, height: 400, background: '#1C1C1C', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#6C665E', fontSize: 12 }}>SVG Sprint 5</span></div>;
}
