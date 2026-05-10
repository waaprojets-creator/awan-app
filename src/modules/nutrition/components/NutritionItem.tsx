import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { AnimatedPressable } from '../../../components/Animated';
import { Ingredient } from '../types';

interface NutritionItemProps {
  ingredient: Ingredient;
  onAdd: (ingredient: Ingredient) => void;
}

export function NutritionItem({ ingredient, onAdd }: NutritionItemProps) {
  const theme = useTheme();
  const s = React.useMemo(() => makeStyles(theme), [theme]);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <AnimatedPressable style={s.container} onPress={() => onAdd(ingredient)}>
        <View style={s.imagePlaceholder}>
          <Text style={s.imageText}>IMG</Text>
        </View>
        
        <View style={s.content}>
          <Text style={s.name} numberOfLines={1}>{ingredient.name}</Text>
          <Text style={s.macros}>
            {ingredient.macros.calories} kcal • P: {ingredient.macros.protein}g • G: {ingredient.macros.carbs}g • L: {ingredient.macros.fat}g
          </Text>
        </View>

        <TouchableOpacity 
          style={s.infoButton} 
          onPress={() => setShowInfo(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={s.infoIcon}>i</Text>
        </TouchableOpacity>
      </AnimatedPressable>

      <Modal visible={showInfo} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>{ingredient.name}</Text>
            
            <View style={s.tokenList}>
              {ingredient.certifications.map(cert => (
                <View key={cert} style={s.token}><Text style={s.tokenText}>{cert.toUpperCase()}</Text></View>
              ))}
            </View>

            <View style={s.modalSection}>
              <Text style={s.sectionTitle}>Additifs & Traçabilité</Text>
              {ingredient.additives.length === 0 ? (
                <Text style={s.sectionText}>Aucun additif signalé. (Sain)</Text>
              ) : (
                ingredient.additives.map(a => (
                  <Text key={a.code} style={s.sectionText}>• {a.code} : {a.status}</Text>
                ))
              )}
            </View>

            <TouchableOpacity style={s.closeButton} onPress={() => setShowInfo(false)}>
              <Text style={s.closeText}>FERMER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.text,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  imagePlaceholder: {
    width: 40, height: 40,
    borderRadius: 8,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  imageText: { color: theme.text, fontSize: 10 },
  content: { flex: 1 },
  name: { fontSize: 14, color: theme.title, fontWeight: '600', marginBottom: 4 },
  macros: { fontSize: 11, color: theme.text, letterSpacing: 0.5 },
  infoButton: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: theme.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  infoIcon: { color: theme.title, fontSize: 12, fontWeight: '700', fontStyle: 'italic' },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: theme.bg,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.text,
  },
  modalTitle: { fontSize: 16, color: theme.title, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  tokenList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16, justifyContent: 'center' },
  token: { backgroundColor: theme.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tokenText: { color: theme.text, fontSize: 10, letterSpacing: 1 },
  modalSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, color: theme.title, marginBottom: 6, letterSpacing: 1 },
  sectionText: { fontSize: 12, color: theme.text, lineHeight: 18 },
  closeButton: { backgroundColor: theme.surface, padding: 12, borderRadius: 10, alignItems: 'center' },
  closeText: { color: theme.title, fontSize: 12, fontWeight: '600', letterSpacing: 2 },
});
