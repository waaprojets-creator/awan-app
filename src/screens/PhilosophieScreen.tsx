import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { BookOpen, Feather, Archive, Compass } from 'lucide-react-native';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Heading } from '../components/ui/Heading';
import { useTheme } from '../hooks/useTheme';
import type { NavProps } from '../types/nav';
import { FontSans, FontMono } from '../constants/typography';
import { Fs, Fw, Ls, T } from '../theme/tokens';

interface PilierProps { icon: React.ReactNode; temps: string; question: string; surfaces: string; }
interface PrincipeProps { n: number; titre: string; desc: string; }

const PRINCIPES: PrincipeProps[] = [
  { n: 1, titre: 'Offline-first, local-only', desc: 'Tes données t\'appartiennent. Aucun serveur tiers, aucune transmission silencieuse. La souveraineté des données découle directement de la devise.' },
  { n: 2, titre: 'Données versionnées (verzod)', desc: 'Chaque schéma porte un numéro de version. Quand l\'app évolue, les anciennes données survivent via des migrators. On n\'efface jamais le passé — on l\'enrichit.' },
  { n: 3, titre: 'Halal strict permanent', desc: 'L\'identité musulmane n\'est pas une option. Filtre non désactivable, intégré dans chaque couche : catalogue alimentaire, prières, journal.' },
  { n: 4, titre: 'Coach evidence-based', desc: 'Chaque règle Coach porte un DOI ou URL PMC. Pas d\'opinions — des références scientifiques vérifiables. Le futur s\'esquisse sur la science.' },
  { n: 5, titre: 'Zéro dette technique', desc: 'Pas d\'implémentation partielle, pas de fonction fantôme. Ce qui est écrit doit tenir. L\'encre ne ment pas.' },
  { n: 6, titre: 'Design system absolu', desc: 'Zéro couleur ni police en dur — uniquement les variables CSS du système AWAN. La forme reflète la rigueur du fond.' },
  { n: 7, titre: 'Saisie consciente', desc: 'L\'acte d\'écrire compte autant que la donnée elle-même. Photos et codes-barres ne remplacent pas l\'attention portée à ce qu\'on mange ou ressent.' },
  { n: 8, titre: 'Mutex temporel', desc: '1 440 minutes par jour. Jamais deux tâches simultanées. Le Planning respecte cette contrainte — le temps est fini, le reconnaître est une éthique.' },
];

function Devise() {
  const theme = useTheme();
  return (
    <View style={{ borderLeftWidth: 4, borderLeftColor: theme.selected, paddingLeft: 20, paddingVertical: 8, marginBottom: 40 }}>
      <Text style={{ fontFamily: FontSans, fontSize: Fs.body, fontWeight: Fw.display, color: theme.title, fontStyle: 'italic', lineHeight: Math.round(Fs.body * 1.35), marginBottom: 8 }}>
        {'« L\'avenir s\'esquisse en encrant aujourd\'hui dans les lignes du passé. »'}
      </Text>
      <Text style={[T.label, { color: theme.mute }]}>{'— Genèse AWAN'}</Text>
    </View>
  );
}

function Pilier({ icon, temps, question, surfaces }: PilierProps) {
  const theme = useTheme();
  return (
    <View style={[s.pilier, { borderColor: theme.borderSoft, backgroundColor: theme.surfaceDim }]}>
      <View style={{ paddingTop: 2 }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[T.label, { color: theme.selected, marginBottom: 4 }]}>{temps}</Text>
        <Text style={{ fontFamily: FontSans, fontSize: Fs.body, fontWeight: Fw.display, color: theme.title, marginBottom: 4 }}>{question}</Text>
        <Text style={{ fontFamily: FontSans, fontSize: Fs.sm, fontWeight: Fw.body, color: theme.mute, lineHeight: Math.round(Fs.sm * 1.6) }}>{surfaces}</Text>
      </View>
    </View>
  );
}

function Principe({ n, titre, desc }: PrincipeProps) {
  const theme = useTheme();
  return (
    <View style={[s.principe, { borderBottomColor: theme.borderSoft }]}>
      <Text style={[T.label, { color: theme.selected, width: 24, flexShrink: 0 }]}>{String(n).padStart(2, '0')}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FontSans, fontSize: Fs.body, fontWeight: Fw.display, color: theme.title, marginBottom: 4 }}>{titre}</Text>
        <Text style={{ fontFamily: FontSans, fontSize: Fs.sm, fontWeight: Fw.body, color: theme.mute, lineHeight: Math.round(Fs.sm * 1.6) }}>{desc}</Text>
      </View>
    </View>
  );
}

export default function PhilosophieScreen(_props: NavProps): React.ReactElement {
  const theme = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, width: '100%', backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader tag="MANIFESTE · AWAN" title="PHILOSOPHIE" />

      <Devise />

      <Heading level={4} mono subtitle="Boucle fondatrice">LES TROIS TEMPS</Heading>
      <View style={{ gap: 12, marginBottom: 40, marginTop: 16 }}>
        <Pilier icon={<Feather size={18} color={theme.selected} />} temps="AUJOURD'HUI — Encrer" question="Que se passe-t-il maintenant ?" surfaces="Sport · Nutrition · Sommeil · Anthropo · Prière · Journal · Planning" />
        <Pilier icon={<Archive size={18} color={theme.mute} />} temps="HIER — Les lignes" question="Que dit la trajectoire ?" surfaces="Analyse · Bilans hebdo & cycle · Heatmap · Jumeau numérique" />
        <Pilier icon={<Compass size={18} color={theme.mute} />} temps="DEMAIN — L'esquisse" question="Que faut-il ajuster ?" surfaces="Coach réactif (règles) · Forecasts (deload · refeed · prochaine séance)" />
      </View>

      <Heading level={4} mono subtitle="Règles immuables">PRINCIPES</Heading>
      <View style={[s.principesBox, { borderColor: theme.borderSoft, backgroundColor: theme.surfaceDim, marginTop: 16, marginBottom: 40 }]}>
        {PRINCIPES.map(p => <Principe key={p.n} {...p} />)}
      </View>

      <View style={[s.conclusionBox, { borderColor: `${theme.selected}26`, backgroundColor: `${theme.selected}08` }]}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <BookOpen size={18} color={theme.selected} />
          <Text style={{ fontFamily: FontSans, fontSize: Fs.sm, fontWeight: Fw.body, color: theme.text, lineHeight: Math.round(Fs.sm * 1.6), fontStyle: 'italic', flex: 1 }}>
            {'AWAN n\'est pas un tracker. C\'est un atelier où l\'on écrit chaque jour la version de soi qui régnera demain. Le Coach lit les lignes. Les Forecasts esquissent l\'avenir. L\'utilisateur encre le présent. La boucle se referme.'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  pilier: { flexDirection: 'row', gap: 16, padding: 16, borderWidth: 1 },
  principe: { flexDirection: 'row', gap: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  principesBox: { borderWidth: 1, paddingHorizontal: 16 },
  conclusionBox: { padding: 20, borderWidth: 1 },
});
