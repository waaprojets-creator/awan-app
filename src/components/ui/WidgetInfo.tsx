import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Touch } from './Touch';
import { useTheme } from '../../hooks/useTheme';
import { FontMono, FontSans } from '../../constants/typography';

interface WidgetInfoProps {
  id: string;       // ex: "W1", "WN3"
  title: string;
  content: string;
}

export function WidgetInfo({ id, title, content }: WidgetInfoProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Badge ID + i button — inline flex row */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: FontMono, fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', color: theme.mute, textTransform: 'uppercase' }}>
          {id}
        </span>
        <Touch onPress={() => setOpen(true)} style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: FontMono, fontSize: 10, fontWeight: 700, color: theme.mute, lineHeight: 1 }}>ⓘ</span>
        </Touch>
      </div>

      {/* Popup */}
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 1998, background: 'rgba(0,0,0,0.6)' }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            zIndex: 1999, width: 300, maxWidth: '90vw',
            background: theme.surface, border: `1px solid ${theme.border}`,
            padding: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span style={{ fontFamily: FontMono, fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', color: theme.mute, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>{id}</span>
                <span style={{ fontFamily: FontMono, fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: theme.title, textTransform: 'uppercase' }}>{title}</span>
              </div>
              <Touch onPress={() => setOpen(false)} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} style={{ color: theme.mute }} />
              </Touch>
            </div>
            <p style={{ fontFamily: FontSans, fontSize: 12, color: theme.title, lineHeight: 1.6, margin: 0 }}>
              {content}
            </p>
          </div>
        </>
      )}
    </>
  );
}
