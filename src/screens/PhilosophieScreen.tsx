import React from 'react';
import { ScrollView } from 'react-native';
import { BookOpen, Feather, Archive, Compass } from 'lucide-react-native';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Heading } from '../components/ui/Heading';
import { useTheme } from '../hooks/useTheme';
import type { NavProps } from '../types/nav';

// ─── Blocs texte ──────────────────────────────────────────────────────────────

function Devise() {
  return (
    <div className="border-l-4 border-awan-gold pl-5 py-2 mb-10">
      <span className="block text-lg font-black text-awan-tx italic leading-snug mb-2">
        « L'avenir s'esquisse en encrant aujourd'hui dans les lignes du passé. »
      </span>
      <span className="awan-label text-awan-tx-mute">— Genèse AWAN</span>
    </div>
  );
}

interface PilierProps {
  icon: React.ReactNode;
  temps: string;
  question: string;
  surfaces: string;
}

function Pilier({ icon, temps, question, surfaces }: PilierProps) {
  return (
    <div className="border border-white/8 bg-white/[0.02] p-4 flex flex-row gap-4">
      <div className="flex-shrink-0 pt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="awan-label text-awan-gold block mb-1">{temps}</span>
        <span className="text-sm font-black text-awan-tx block mb-1">{question}</span>
        <span className="text-xs text-awan-tx-mute leading-relaxed">{surfaces}</span>
      </div>
    </div>
  );
}

interface PrincipeProps {
  n: number;
  titre: string;
  desc: string;
}

function Principe({ n, titre, desc }: PrincipeProps) {
  return (
    <div className="flex flex-row gap-4 py-4 border-b border-white/5 last:border-0">
      <span className="font-mono text-awan-gold font-black text-sm w-6 flex-shrink-0 pt-0.5">
        {String(n).padStart(2, '0')}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-black text-awan-tx block mb-1">{titre}</span>
        <span className="text-xs text-awan-tx-mute leading-relaxed">{desc}</span>
      </div>
    </div>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PhilosophieScreen(_props: NavProps): React.ReactElement {
  const theme = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, width: '100%' }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader tag="MANIFESTE · AWAN" title="PHILOSOPHIE" />

      <Devise />

      {/* Les trois temps */}
      <Heading level={4} mono subtitle="Boucle fondatrice" className="mb-4">
        LES TROIS TEMPS
      </Heading>
      <div className="flex flex-col gap-3 mb-10">
        <Pilier
          icon={<Feather size={18} color={theme.selected} />}
          temps="AUJOURD'HUI — Encrer"
          question="Que se passe-t-il maintenant ?"
          surfaces="Sport · Nutrition · Sommeil · Anthropo · Prière · Journal · Planning"
        />
        <Pilier
          icon={<Archive size={18} color={theme.mute} />}
          temps="HIER — Les lignes"
          question="Que dit la trajectoire ?"
          surfaces="Analyse · Bilans hebdo & cycle · Heatmap · Jumeau numérique"
        />
        <Pilier
          icon={<Compass size={18} color={theme.mute} />}
          temps="DEMAIN — L'esquisse"
          question="Que faut-il ajuster ?"
          surfaces="Coach réactif (règles) · Forecasts (deload · refeed · prochaine séance)"
        />
      </div>

      {/* Principes */}
      <Heading level={4} mono subtitle="Règles immuables" className="mb-4">
        PRINCIPES
      </Heading>
      <div className="border border-white/8 bg-white/[0.02] px-4 mb-10">
        <Principe n={1} titre="Offline-first, local-only"
          desc="Tes données t'appartiennent. Aucun serveur tiers, aucune transmission silencieuse. La souveraineté des données découle directement de la devise." />
        <Principe n={2} titre="Données versionnées (verzod)"
          desc="Chaque schéma porte un numéro de version. Quand l'app évolue, les anciennes données survivent via des migrators. On n'efface jamais le passé — on l'enrichit." />
        <Principe n={3} titre="Halal strict permanent"
          desc="L'identité musulmane n'est pas une option. Filtre non désactivable, intégré dans chaque couche : catalogue alimentaire, prières, journal." />
        <Principe n={4} titre="Coach evidence-based"
          desc="Chaque règle Coach porte un DOI ou URL PMC. Pas d'opinions — des références scientifiques vérifiables. Le futur s'esquisse sur la science." />
        <Principe n={5} titre="Zéro dette technique"
          desc="Pas d'implémentation partielle, pas de fonction fantôme. Ce qui est écrit doit tenir. L'encre ne ment pas." />
        <Principe n={6} titre="Design system absolu"
          desc="Zéro couleur ni police en dur — uniquement les variables CSS du système AWAN. La forme reflète la rigueur du fond." />
        <Principe n={7} titre="Saisie consciente"
          desc="L'acte d'écrire compte autant que la donnée elle-même. Photos et codes-barres ne remplacent pas l'attention portée à ce qu'on mange ou ressent." />
        <Principe n={8} titre="Mutex temporel"
          desc="1 440 minutes par jour. Jamais deux tâches simultanées. Le Planning respecte cette contrainte — le temps est fini, le reconnaître est une éthique." />
      </div>

      {/* Conclusion */}
      <div className="border border-awan-gold/15 bg-awan-gold/[0.03] p-5">
        <div className="flex flex-row gap-3 items-start">
          <BookOpen size={18} color={theme.selected} className="flex-shrink-0 mt-0.5" />
          <span className="text-xs text-awan-tx-dim leading-relaxed italic flex-1">
            AWAN n'est pas un tracker. C'est un atelier où l'on écrit chaque jour la version de soi qui régnera demain. Le Coach lit les lignes. Les Forecasts esquissent l'avenir. L'utilisateur encre le présent. La boucle se referme.
          </span>
        </div>
      </div>
    </ScrollView>
  );
}
