import React, { useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { Touch } from './Touch';
import { useTheme } from '../../hooks/useTheme';
import { FontMono, FontSans } from '../../constants/typography';
import { Fs, Fw, Ls } from '../../theme/tokens';

interface WidgetInfoProps {
  id: string;
  title: string;
  content: string;
}

export function WidgetInfo({ id, title, content }: WidgetInfoProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <View style={s.header}>
        <Text style={[s.id, { color: theme.mute }]}>{id}</Text>
        <Touch onPress={() => setOpen(true)} style={s.infoBtn}>
          <Text style={[s.infoChar, { color: theme.mute }]}>ⓘ</Text>
        </Touch>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)} />
        <View style={[s.popup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={s.popupHeader}>
            <View>
              <Text style={[s.popupId, { color: theme.mute }]}>{id}</Text>
              <Text style={[s.popupTitle, { color: theme.title }]}>{title}</Text>
            </View>
            <Touch onPress={() => setOpen(false)} style={s.closeBtn}>
              <X size={14} color={theme.mute} />
            </Touch>
          </View>
          <Text style={[s.content, { color: theme.title }]}>{content}</Text>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  id: {
    fontFamily: FontMono,
    fontSize: Fs.xxs,
    fontWeight: Fw.value,
    letterSpacing: Ls.xxs_02,
    textTransform: 'uppercase',
  },
  infoBtn: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  infoChar: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.value },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  popup: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -150,
    marginTop: -80,
    width: 300,
    borderWidth: 1,
    padding: 20,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  popupId: {
    fontFamily: FontMono,
    fontSize: Fs.xxs,
    fontWeight: Fw.value,
    letterSpacing: Ls.xxs_02,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  popupTitle: {
    fontFamily: FontMono,
    fontSize: Fs.lg,
    fontWeight: '800',
    letterSpacing: Ls.sm_015,
    textTransform: 'uppercase',
  },
  closeBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  content: { fontFamily: FontSans, fontSize: 12, lineHeight: 19 },
});
