import React from 'react';
import { View, Text } from 'react-native';
import { Info, Trash2, X, Play } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Touch } from '../../components/ui/Touch';
import type { RoutineLatest } from '../../data/schemas/sport/routine';
import { useTheme } from '../../hooks/useTheme';
import { FontMono, FontSans } from '../../constants/typography';
import { Fs, Fw, Ls, Clr } from '../../theme/tokens';
import { ss } from './shared';

interface RoutineCardProps {
  routine: RoutineLatest;
  isConfirmingDelete: boolean;
  onStart: (r: RoutineLatest) => void;
  onEdit: (r: RoutineLatest) => void;
  onDeleteExecute: (id: string) => void;
  onDeleteCancel: () => void;
  onDeleteRequest: (r: RoutineLatest) => void;
}

export const RoutineCard = React.memo(function RoutineCard({
  routine: r, isConfirmingDelete, onStart, onEdit, onDeleteExecute, onDeleteCancel, onDeleteRequest,
}: RoutineCardProps) {
  const theme = useTheme();
  return (
    <Card style={{ padding: 24, backgroundColor: theme.surface }} onPress={() => onStart(r)}>
      <View style={[ss.rowBetween, { marginBottom: 8 }]}>
        <Text style={{ fontSize: 18, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', letterSpacing: -0.45, flex: 1, fontFamily: FontSans }}>{r.name}</Text>
        <View style={[ss.row, { gap: 8 }]}>
          <Touch onPress={(e: any) => { e?.stopPropagation?.(); onEdit(r); }}>
            <Info size={16} color={theme.mute} />
          </Touch>
          {isConfirmingDelete ? (
            <View style={[ss.row, { gap: 8 }]}>
              <Touch onPress={(e: any) => { e?.stopPropagation?.(); onDeleteExecute(r.id); }}>
                <Text style={{ color: theme.danger, fontSize: 11, fontWeight: Fw.display, letterSpacing: 1.1 }}>SUPPR</Text>
              </Touch>
              <Touch onPress={(e: any) => { e?.stopPropagation?.(); onDeleteCancel(); }}>
                <X size={14} color={theme.mute} />
              </Touch>
            </View>
          ) : (
            <Touch onPress={(e: any) => { e?.stopPropagation?.(); onDeleteRequest(r); }}>
              <Trash2 size={16} color={Clr.white20} />
            </Touch>
          )}
        </View>
      </View>
      <View style={[ss.row, { gap: 12 }]}>
        {r.cycleLetter && (
          <View style={{ backgroundColor: Clr.gold10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: Clr.gold20 }}>
            <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, color: theme.selected, letterSpacing: Ls.sm_02, fontFamily: FontMono }}>CYCLE {r.cycleLetter}</Text>
          </View>
        )}
        <View style={{ backgroundColor: Clr.white5, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, color: theme.mute, letterSpacing: Ls.sm_02, fontFamily: FontMono }}>{r.exercises.length} EX</Text>
        </View>
      </View>
      <View style={{ position: 'absolute', right: 24, bottom: 24, width: 40, height: 40, backgroundColor: Clr.gold20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Clr.gold20 }}>
        <Play size={18} color={theme.selected} strokeWidth={3} />
      </View>
    </Card>
  );
});
