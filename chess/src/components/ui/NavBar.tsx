import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/',        icon: '⊞', label: 'Accueil'  },
  { to: '/play',    icon: '♟',  label: 'Jouer'    },
  { to: '/puzzles', icon: '⚡', label: 'Puzzles'  },
  { to: '/history', icon: '📋', label: 'Parties'  },
];

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-chess-surface border-t border-chess-border flex items-stretch z-40">
      {NAV.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 ` +
            (isActive
              ? 'text-chess-accent'
              : 'text-chess-text-muted hover:text-chess-text-secondary')
          }
        >
          <span className="text-xl leading-none">{icon}</span>
          <span className="text-[10px] font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
