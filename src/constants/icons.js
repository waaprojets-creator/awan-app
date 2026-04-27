import React from 'react';
import Svg, { Polygon, Circle, Line, Path, Rect, G } from 'react-native-svg';
import { T } from './theme';

/**
 * Tous les SVG de l'app sont centralisés ici.
 * Pour modifier l'apparence d'un logo ou d'une icône partout dans l'app,
 * il suffit de modifier le composant correspondant ici.
 *
 * Convention : chaque icône accepte au minimum { size, color, opacity }.
 */

// =============================================================================
// LOGO HEXAGONAL — symbole central d'AWAN
// =============================================================================

/**
 * Hexagone d'AWAN.
 * variant:
 *   - 'rich'   : version complète (lock screen) — double cadre, lignes radiales, halo
 *   - 'simple' : version épurée (header) — cadre + point central
 *   - 'outline': cadre seul (placeholders d'écrans en travaux)
 */
export function HexagonLogo({ size = 32, color = T.gold, opacity = 1, variant = 'simple' }) {
  const stroke = variant === 'rich' ? 1.2 : 1.6;

  if (variant === 'rich') {
    return (
      <Svg width={size} height={size} viewBox="0 0 66 66">
        <Polygon points="33,3 59,18 59,48 33,63 7,48 7,18" stroke={color} strokeWidth="1.2" fill="none" opacity={opacity}/>
        <Polygon points="33,11 51,22 51,44 33,55 15,44 15,22" stroke={color} strokeWidth=".5" fill="none" opacity={opacity * 0.4}/>
        {[
          ["33,3","33,11"],["59,18","51,22"],["59,48","51,44"],
          ["33,63","33,55"],["7,48","15,44"],["7,18","15,22"],
        ].map(([p1,p2],i) => {
          const [x1,y1]=p1.split(','); const [x2,y2]=p2.split(',');
          return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth=".5" opacity={opacity * 0.28}/>;
        })}
        <Circle cx="33" cy="33" r="3.5" fill={color} opacity={opacity}/>
        <Circle cx="33" cy="33" r="7.5" stroke={color} strokeWidth=".5" fill="none" opacity={opacity * 0.22}/>
      </Svg>
    );
  }

  if (variant === 'outline') {
    return (
      <Svg width={size} height={size} viewBox="0 0 66 66">
        <Polygon points="33,3 59,18 59,48 33,63 7,48 7,18" stroke={color} strokeWidth={stroke} fill="none" opacity={opacity}/>
      </Svg>
    );
  }

  // simple (default)
  return (
    <Svg width={size} height={size} viewBox="0 0 66 66">
      <Polygon points="33,3 59,18 59,48 33,63 7,48 7,18" stroke={color} strokeWidth={stroke} fill="none" opacity={opacity}/>
      <Circle cx="33" cy="33" r="3.5" fill={color} opacity={opacity}/>
    </Svg>
  );
}

// =============================================================================
// ICÔNES DE NAVIGATION — onglets du bas
// =============================================================================

/** Planning — calendrier */
export function IconPlanning({ size = 22, color = T.tx2, opacity = 1 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Rect x="3" y="5" width="18" height="16" rx="2" stroke={color} strokeWidth="1.6" fill="none"/>
      <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="1.6"/>
      <Line x1="8" y1="3" x2="8" y2="7" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <Line x1="16" y1="3" x2="16" y2="7" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    </Svg>
  );
}

/** Trajet — pin de localisation */
export function IconTrajet({ size = 22, color = T.tx2, opacity = 1 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Path
        d="M12 2 C8 2 5 5 5 9 C5 14 12 22 12 22 C12 22 19 14 19 9 C19 5 16 2 12 2 Z"
        stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round"
      />
      <Circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth="1.6" fill="none"/>
    </Svg>
  );
}

/** Santé — battement de cœur stylisé */
export function IconSante({ size = 22, color = T.tx2, opacity = 1 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Path
        d="M3 12 L7 12 L9 8 L12 16 L14 12 L17 12"
        stroke={color} strokeWidth="1.6" fill="none"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <Circle cx="20" cy="12" r="1.2" fill={color}/>
    </Svg>
  );
}

/** Réglages — engrenage simplifié */
export function IconReglages({ size = 22, color = T.tx2, opacity = 1 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Circle cx="12" cy="12" r="3.5" stroke={color} strokeWidth="1.6" fill="none"/>
      <Path
        d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M5 5 L7 7 M17 17 L19 19 M5 19 L7 17 M17 7 L19 5"
        stroke={color} strokeWidth="1.6" strokeLinecap="round"
      />
    </Svg>
  );
}

// =============================================================================
// ÉTATS / FEEDBACK — icônes utilitaires
// =============================================================================

/** "En travaux" — remplace l'emoji 🚧 partout dans l'app */
export function IconWip({ size = 14, color = T.tx3, opacity = 1 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Path
        d="M3 20 L21 20 L21 14 L3 14 Z"
        stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round"
      />
      <Line x1="6" y1="14" x2="6" y2="20" stroke={color} strokeWidth="1.4"/>
      <Line x1="12" y1="14" x2="12" y2="20" stroke={color} strokeWidth="1.4"/>
      <Line x1="18" y1="14" x2="18" y2="20" stroke={color} strokeWidth="1.4"/>
      <Path d="M5 14 L7 8 L17 8 L19 14" stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round"/>
    </Svg>
  );
}

/** Marqueur "R" pour identifier les routines (lettre seule, dorée, top-right). */
export function RoutineMark({ size = 11, color = T.gold }) {
  // Composant texte plutôt que SVG car c'est juste une lettre.
  // Fourni ici pour rester dans le fichier centralisé des marqueurs visuels.
  return null; // implémenté côté composant, voir tokens ROUTINE_MARK ci-dessous
}

// =============================================================================
// TOKENS — paramètres visuels réutilisables
// =============================================================================

/**
 * Tailles standardisées pour les icônes selon le contexte.
 * Utiliser ces tokens plutôt que des nombres en dur dans les composants.
 */
export const ICON_SIZE = {
  tab:    22,  // onglets du bas
  header: 32,  // logo central du header
  inline: 14,  // dans le texte (WIP, R, etc.)
  big:    64,  // placeholders plein écran
  hero:   80,  // lock screen
};

/**
 * Style du marqueur Routine (lettre R en haut à droite).
 * À utiliser tel quel dans les composants : <Text style={ROUTINE_MARK.style}>R</Text>
 */
export const ROUTINE_MARK = {
  letter: 'R',
  style: {
    position: 'absolute',
    top: 6,
    right: 8,
    fontSize: 10,
    color: T.gold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
};
