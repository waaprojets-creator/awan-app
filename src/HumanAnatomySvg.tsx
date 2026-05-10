import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { useTheme } from './hooks/useTheme';

/**
 * AWAN ANATOMICAL INTERFACE
 * SVG Vectoriel interactif pour le mapping des mesures.
 */
export const HumanAnatomySvg = ({ onPartPress, updatedParts = [] }: any) => {
  const theme = useTheme();
  const isUpdated = (part: any) => updatedParts.includes(part);

  const Part = ({ id, d, fill = theme.surface, stroke = theme.text }: any) => (
    <G onPress={() => onPartPress(id)}>
      <Path 
        d={d} 
        fill={isUpdated(id) ? theme.title + '40' : fill} 
        stroke={isUpdated(id) ? theme.title : stroke} 
        strokeWidth={isUpdated(id) ? 2 : 1}
      />
    </G>
  );

  return (
    <View style={s.container}>
      <Svg width="280" height="380" viewBox="0 0 200 300">
        {/* Simplified Human Silhouette - Front */}
        <G transform="translate(10, 10) scale(0.8)">
          {/* Head */}
          <Circle cx="100" cy="30" r="15" fill={theme.surface} stroke={theme.text} strokeWidth="1" />
          
          {/* Torso */}
          <Part 
            id="chest" 
            d="M75,50 Q100,45 125,50 L130,80 Q100,85 70,80 Z" 
          />
          <Part 
            id="waist" 
            d="M70,80 Q100,85 130,80 L125,120 Q100,125 75,120 Z" 
          />

          {/* Arms */}
          <Part 
            id="biceps_r" 
            d="M130,55 L150,60 L145,100 L125,95 Z" 
          />
          <Part 
            id="biceps_l" 
            d="M70,55 L50,60 L55,100 L75,95 Z" 
          />

          {/* Legs */}
          <Part 
            id="thigh_r" 
            d="M100,125 L130,130 L120,190 L100,185 Z" 
          />
          <Part 
            id="thigh_l" 
            d="M100,125 L70,130 L80,190 L100,185 Z" 
          />
          
          <Part 
            id="calf_r" 
            d="M100,190 L120,200 L110,260 L100,255 Z" 
          />
          <Part 
            id="calf_l" 
            d="M100,190 L80,200 L90,260 L100,255 Z" 
          />
        </G>
      </Svg>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  }
});
