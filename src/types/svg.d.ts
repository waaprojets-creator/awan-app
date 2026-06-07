import 'react-native-svg';

/**
 * Transition DOM → RN : de nombreuses icônes lucide et éléments SVG utilisent
 * encore `className` (Tailwind via react-native-web) pour leur style/couleur.
 * react-native-svg ne type pas `className` ; on l'ajoute ici en attendant la
 * conversion className → color/style du jalon DOM→RN. Sans effet sur natif.
 */
declare module 'react-native-svg' {
  interface SvgProps {
    className?: string;
  }
}
