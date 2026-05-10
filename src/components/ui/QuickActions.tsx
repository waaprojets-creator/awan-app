import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, CheckSquare, Utensils, PenLine, Dumbbell } from 'lucide-react';
import { Touch } from './Touch';

const ACTIONS = [
  { id: 'task', label: 'Tâche', icon: CheckSquare, color: '#D4AF37', route: 'Tasks' },
  { id: 'nutrition', label: 'Repas', icon: Utensils, color: '#8C7E6E', route: 'Nutrition' },
  { id: 'sport', label: 'Sport', icon: Dumbbell, color: '#F0EDE8', route: 'Sport' },
  { id: 'journal', label: 'Pensée', icon: PenLine, color: '#D4AF37', route: 'Journal' },
];

interface QuickActionsProps {
  onNavigate: (route: string) => void;
}

export function QuickActions({ onNavigate }: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleAction = (route: string) => {
    setIsOpen(false);
    onNavigate(route);
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <div className="flex flex-col items-end gap-3 mb-2">
            {ACTIONS.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Touch
                  onPress={() => handleAction(action.route)}
                  className="flex flex-row items-center gap-3 bg-awan-bg-highlight border border-white/10 px-4 py-2 rounded-full shadow-2xl"
                >
                  <span className="text-xs font-bold uppercase tracking-widest text-awan-tx">
                    {action.label}
                  </span>
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${action.color}20` }}
                  >
                    <action.icon size={20} color={action.color} />
                  </div>
                </Touch>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <Touch
        onPress={toggleMenu}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl border border-white/10 transition-all duration-300 ${isOpen ? 'bg-awan-bg-highlight rotate-90' : 'bg-awan-gold-active'}`}
      >
        {isOpen ? (
          <X size={28} color="#D4AF37" />
        ) : (
          <Plus size={28} color="white" />
        )}
      </Touch>
    </div>
  );
}
