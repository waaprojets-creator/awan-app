import React from 'react';
import Svg, { Polygon, Circle, Line, Path, Rect } from 'react-native-svg';

export function HexagonLogo({ size = 32, color = '#D4AF37', opacity = 1, variant = 'simple' }) {
  const stroke = variant === 'rich' ? 1.2 : 1.6;

  if (variant === 'rich') {
    return (
      <Svg width={size} height={size} viewBox="0 0 66 66">
        <Polygon points="33,3 59,18 59,48 33,63 7,48 7,18" stroke={color} strokeWidth="1.2" fill="none" opacity={opacity}/>
        <Polygon points="33,11 51,22 51,44 33,55 15,44 15,22" stroke={color} strokeWidth=".5" fill="none" opacity={opacity * 0.4}/>
        {[["33,3","33,11"],["59,18","51,22"],["59,48","51,44"],["33,63","33,55"],["7,48","15,44"],["7,18","15,22"]].map(([p1,p2],i) => {
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

  return (
    <Svg width={size} height={size} viewBox="0 0 66 66">
      <Polygon points="33,3 59,18 59,48 33,63 7,48 7,18" stroke={color} strokeWidth={stroke} fill="none" opacity={opacity}/>
      <Circle cx="33" cy="33" r="3.5" fill={color} opacity={opacity}/>
    </Svg>
  );
}

export function IconPlanning({ size = 22, color = '#8C7E6E', opacity = 1 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Rect x="3" y="5" width="18" height="16" rx="2" stroke={color} strokeWidth="1.6" fill="none"/>
      <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="1.6"/>
      <Line x1="8" y1="3" x2="8" y2="7" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <Line x1="16" y1="3" x2="16" y2="7" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    </Svg>
  );
}

export function IconTrajet({ size = 22, color = '#8C7E6E', opacity = 1 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Path d="M12 2 C8 2 5 5 5 9 C5 14 12 22 12 22 C12 22 19 14 19 9 C19 5 16 2 12 2 Z" stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round"/>
      <Circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth="1.6" fill="none"/>
    </Svg>
  );
}

export function IconSante({ size = 22, color = '#8C7E6E', opacity = 1 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Path d="M3 12 L7 12 L9 8 L12 16 L14 12 L17 12" stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <Circle cx="20" cy="12" r="1.2" fill={color}/>
    </Svg>
  );
}

export function IconReglages({ size = 22, color = '#8C7E6E', opacity = 1 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Circle cx="12" cy="12" r="3.5" stroke={color} strokeWidth="1.6" fill="none"/>
      <Path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M5 5 L7 7 M17 17 L19 19 M5 19 L7 17 M17 7 L19 5" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    </Svg>
  );
}

export function IconWip({ size = 14, color = '#8C7E6E', opacity = 1 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Path d="M3 20 L21 20 L21 14 L3 14 Z" stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round"/>
      <Line x1="6" y1="14" x2="6" y2="20" stroke={color} strokeWidth="1.4"/>
      <Line x1="12" y1="14" x2="12" y2="20" stroke={color} strokeWidth="1.4"/>
      <Line x1="18" y1="14" x2="18" y2="20" stroke={color} strokeWidth="1.4"/>
      <Path d="M5 14 L7 8 L17 8 L19 14" stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round"/>
    </Svg>
  );
}

export function IconCar({ size = 22, color = '#8C7E6E', opacity = 1 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Path d="M4 14 L4 17 L20 17 L20 14 L18.5 9 L5.5 9 Z" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      <Circle cx="7.5" cy="17.5" r="1.6" stroke={color} strokeWidth="1.5" fill="none"/>
      <Circle cx="16.5" cy="17.5" r="1.6" stroke={color} strokeWidth="1.5" fill="none"/>
    </Svg>
  );
}

export function IconMoto({ size = 22, color = '#8C7E6E', opacity = 1 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Circle cx="5" cy="17" r="3" stroke={color} strokeWidth="1.5" fill="none"/>
      <Circle cx="19" cy="17" r="3" stroke={color} strokeWidth="1.5" fill="none"/>
      <Path d="M8 17 L12 11 L16 11 L19 17 M11 11 L9 7 L7 7" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
    </Svg>
  );
}

export function IconBike({ size = 22, color = '#8C7E6E', opacity = 1 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Circle cx="5" cy="17" r="3" stroke={color} strokeWidth="1.5" fill="none"/>
      <Circle cx="19" cy="17" r="3" stroke={color} strokeWidth="1.5" fill="none"/>
      <Path d="M5 17 L10 8 L15 17 L12 8 L16 8" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
    </Svg>
  );
}

export function IconFoot({ size = 22, color = '#8C7E6E', opacity = 1 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Circle cx="13" cy="4" r="2" stroke={color} strokeWidth="1.5" fill="none"/>
      <Path d="M13 7 L11 12 L8 14 M13 7 L15 11 L13 16 L15 21 M13 16 L9 21" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
    </Svg>
  );
}

export function IconTransit({ size = 22, color = '#8C7E6E', opacity = 1 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Rect x="5" y="3" width="14" height="15" rx="2" stroke={color} strokeWidth="1.5" fill="none"/>
      <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="1.5"/>
      <Circle cx="8.5" cy="15" r="0.9" fill={color}/>
      <Circle cx="15.5" cy="15" r="0.9" fill={color}/>
      <Path d="M8 18 L7 21 M16 18 L17 21" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </Svg>
  );
}

export const TRANSPORT_ICONS = {
  car:     IconCar,
  moto:    IconMoto,
  bike:    IconBike,
  foot:    IconFoot,
  transit: IconTransit,
};

export const ICON_SIZE = {
  tab:    22,
  header: 32,
  inline: 14,
  big:    64,
  hero:   80,
};

export const ROUTINE_MARK = {
  letter: 'R',
  style: {
    position: 'absolute',
    top: 6,
    right: 8,
    fontSize: 10,
    color: '#D4AF37',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
};
