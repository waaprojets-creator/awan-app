// @ts-nocheck — legacy, rewritten per sprint
import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Card } from './ui/Card';
import { Heading } from './ui/Heading';
import { Touch } from './ui/Touch';

interface BilanZenProps {
  summary: string;
  onRefresh?: () => void;
  loading?: boolean;
}

export function BilanZen({ summary, onRefresh, loading }: BilanZenProps) {
  if (!summary && !loading) return null;

  return (
    <Card className="border-awan-gold/20 bg-awan-gold/5 shadow-[0_0_40px_rgba(212,175,55,0.05)] relative">
      {/* Decorative corners */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-awan-gold/10 to-transparent -mr-8 -mt-8 rounded-full blur-2xl" />
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-awan-gold/10 flex items-center justify-center border border-awan-gold/20 shadow-inner">
            <Sparkles size={18} className="text-awan-gold" />
          </div>
          <div>
            <span className="awan-label text-awan-xs text-awan-gold block mb-0.5 tracking-[0.3em]">SYNTHÈSE IA</span>
            <Heading level={3} className="mb-0 leading-none">CONSCIENCE TACTIQUE</Heading>
          </div>
        </div>
        {onRefresh && (
          <Touch 
            onPress={onRefresh} 
            disabled={loading}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
          >
            <motion.div animate={loading ? { rotate: 360 } : {}} transition={loading ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}>
              <Sparkles size={14} className="text-awan-tx-mute" />
            </motion.div>
          </Touch>
        )}
      </div>

      <div className="relative z-10">
        <p className="text-sm text-awan-tx leading-relaxed font-serif italic antialiased opacity-90">
          {loading ? 'Interrogation des vecteurs de données...' : `"${summary}"`}
        </p>
      </div>

      <div className="mt-5 pt-3 border-t border-white/5 flex justify-between items-center relative z-10">
        <div className="flex gap-1.5">
          <div className="w-1 h-1 rounded-full bg-awan-gold/40" />
          <div className="w-1 h-1 rounded-full bg-awan-gold/20" />
          <div className="w-1 h-1 rounded-full bg-awan-gold/10" />
        </div>
        <Touch className="flex flex-row items-center gap-2 opacity-60">
          <span className="awan-label text-awan-xs">LOGS D'INFÉRENCE</span>
          <ArrowRight size={10} className="text-awan-tx-mute" />
        </Touch>
      </div>
    </Card>
  );
}
