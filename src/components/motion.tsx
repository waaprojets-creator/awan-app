/**
 * Adaptateur de migration motion (framer-motion) → react-native-reanimated.
 *
 * Couche de transition J0.6 : `motion/react` est web-only et casse le bundling
 * natif Expo. Ce module expose la même surface d'API (`motion.<tag>`,
 * `AnimatePresence`) en s'appuyant sur les Layout Animations déclaratives de
 * reanimated, qui fonctionnent sur natif ET react-native-web.
 *
 * Mapping :
 *   initial/animate/exit (opacity + x/y) → entering / exiting (Fade* builders)
 *   transition.duration / delay          → .duration(ms) / .delay(ms)
 *   variants (clé string)                → résolu via l'objet variants
 *   whileTap / whileHover                → ignorés (le retour tactile passe par Touch)
 *   AnimatePresence                      → passthrough (reanimated anime à l'unmount)
 *
 * Les composants SVG animés (circle/line/text) et le DnD sont traités
 * directement dans leurs fichiers respectifs (MoonMenu, PlanningScreen).
 */
import React from 'react';
import Animated, {
  FadeIn, FadeOut,
  FadeInDown, FadeInUp, FadeInLeft, FadeInRight,
  FadeOutDown, FadeOutUp, FadeOutLeft, FadeOutRight,
} from 'react-native-reanimated';

type AnyObj = Record<string, unknown>;

interface MotionProps {
  initial?: AnyObj | string;
  animate?: AnyObj | string;
  exit?: AnyObj | string;
  transition?: AnyObj;
  variants?: AnyObj;
  whileTap?: AnyObj;
  whileHover?: AnyObj;
  style?: unknown;
  children?: React.ReactNode;
  [k: string]: unknown;
}

function resolve(v: AnyObj | string | undefined, variants?: AnyObj): AnyObj | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return variants?.[v] as AnyObj | undefined;
  return v;
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined;
}

function buildEntering(initial?: AnyObj, transition?: AnyObj): unknown {
  if (!initial) return undefined;
  const dur = num(transition?.['duration']);
  const delay = num(transition?.['delay']);
  const y = num(initial['y']);
  const x = num(initial['x']);
  let b: any = FadeIn;
  if (y !== undefined && y > 0) b = FadeInDown;
  else if (y !== undefined && y < 0) b = FadeInUp;
  else if (x !== undefined && x > 0) b = FadeInRight;
  else if (x !== undefined && x < 0) b = FadeInLeft;
  let anim = b.duration(dur !== undefined ? dur * 1000 : 300);
  if (delay) anim = anim.delay(delay * 1000);
  return anim;
}

function buildExiting(exit?: AnyObj, transition?: AnyObj): unknown {
  if (!exit) return undefined;
  const dur = num(transition?.['duration']);
  const y = num(exit['y']);
  const x = num(exit['x']);
  let b: any = FadeOut;
  if (y !== undefined && y > 0) b = FadeOutDown;
  else if (y !== undefined && y < 0) b = FadeOutUp;
  else if (x !== undefined && x > 0) b = FadeOutRight;
  else if (x !== undefined && x < 0) b = FadeOutLeft;
  return b.duration(dur !== undefined ? dur * 1000 : 200);
}

const cache: Record<string, React.ComponentType<any>> = {};

function makeComponent(): React.ComponentType<MotionProps> {
  // Props typées `any` : adaptateur traduisant une surface framer-motion hétérogène.
  return React.forwardRef<unknown, any>(function MotionComp(props: any, ref) {
    const {
      initial, animate, exit, transition, variants,
      whileTap, whileHover, style, children, ...rest
    } = props;
    void animate; void whileTap; void whileHover; // consommés pour ne pas polluer rest
    const entering = buildEntering(resolve(initial, variants), transition);
    const exiting = buildExiting(resolve(exit, variants), transition);
    const animProps: Record<string, unknown> = {};
    if (entering) animProps['entering'] = entering;
    if (exiting) animProps['exiting'] = exiting;
    return (
      <Animated.View ref={ref as never} style={style} {...animProps} {...rest}>
        {children}
      </Animated.View>
    );
  }) as React.ComponentType<MotionProps>;
}

/** Proxy renvoyant un composant reanimated par balise (motion.div, motion.span, …). */
export const motion: any = new Proxy(
  {} as Record<string, React.ComponentType<any>>,
  {
    get(_t, prop: string) {
      const key = cache[prop];
      if (key) return key;
      const comp = makeComponent();
      cache[prop] = comp;
      return comp;
    },
  },
);

export function AnimatePresence({ children }: { children?: React.ReactNode; mode?: string }) {
  return <>{children}</>;
}
