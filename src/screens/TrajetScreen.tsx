import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput as RNTextInput,
  Switch, ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Navigation2, Search, Trash2, Layers, Info, X, Zap, MapPin,
} from 'lucide-react-native';

import { useTheme } from '../hooks/useTheme';
import { FontSans, FontMono } from '../constants/typography';
import { Fs, Fw, Ls, Sp, Clr } from '../theme/tokens';
import { ds, uid } from '../utils/storage';
import { TRANSPORT_ICONS } from '../constants/icons';
import { L as LABELS, TRANSPORT_OPTIONS } from '../constants/labels';
import { useAppState } from '../context/AppStateContext';
import { useDaily } from '../context/DailyContext';
import { ORSService } from '../services/orsService';

import { PageWrapper } from '../components/Animated';
import { DailyCanvas } from '../components/DailyCanvas';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';

const TextInput = RNTextInput as React.ComponentType<any>;

export default function TrajetScreen() {
  const insets = useSafeAreaInsets();
  const { db, updateDb } = useAppState();
  const { getEntriesByDate, addEntry, removeEntry } = useDaily();
  const entries = getEntriesByDate(ds(new Date()));
  const theme = useTheme();

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('driving-car');
  const ORS_MODE: Record<string, string> = {
    car: 'driving-car', moto: 'driving-car',
    bike: 'cycling-regular', foot: 'foot-walking', transit: 'foot-walking',
  };
  const activeKey = (TRANSPORT_OPTIONS as Array<{ key: string }>).find(
    o => ORS_MODE[o.key] === mode,
  )?.key ?? 'car';
  const [showPois, setShowPois] = useState(true);

  const travelEntries = useMemo(() => entries.filter((e: any) => e.module === 'trajet'), [entries]);
  const mapEntries = useMemo(() => travelEntries.filter((e: any) => e.data && e.data.coords), [travelEntries]);

  const config = db?.config || {};
  const orsKey = config.orsApiKey;

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await ORSService.geocode(search, orsKey);
      setResults(res?.features || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addPoi = (feat: any) => {
    const poi = {
      id: uid(),
      title: feat.properties.label || feat.properties.name,
      module: 'trajet',
      type: 'poi',
      data: {
        coords: feat.geometry.coordinates,
        address: feat.properties.label,
      },
    };
    addEntry(poi);
    setResults([]);
    setSearch('');
  };

  const calculateRoute = async () => {
    if (mapEntries.length < 2) return;
    setLoading(true);
    try {
      const coords = mapEntries.map((e: any) => e.data.coords);
      const res = await ORSService.getRoute(coords, orsKey, mode);
      setRoute(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const clearTrajets = () => {
    travelEntries.forEach((e: any) => removeEntry(e.id));
    setRoute(null);
  };

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.px6, s.pt4]}>
          <ScreenHeader tag="TRAJET" title="TRAJET" />
        </View>

        {/* Carte — placeholder natif (Leaflet non disponible sur mobile) */}
        <View style={[s.mapPlaceholder, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <MapPin size={32} color={theme.mute} />
          <Text style={[s.mapPlaceholderText, { color: theme.mute }]}>
            CARTE NON DISPONIBLE
          </Text>
          <Text style={[s.mapPlaceholderSub, { color: theme.mute }]}>
            Migration react-native-maps prévue
          </Text>
        </View>

        {/* Barre de recherche */}
        <View style={[s.px6, { marginTop: Sp[4] }]}>
          <View style={[s.row, s.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Search size={18} color={theme.mute} />
            <TextInput
              style={[s.searchInput, { color: theme.title }]}
              placeholder="Objectif de destination..."
              placeholderTextColor={Clr.white40}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
            />
            {loading && <ActivityIndicator size="small" color={theme.title} />}
          </View>

          {/* Résultats recherche */}
          {results.length > 0 && (
            <View style={[s.resultsBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {results.slice(0, 5).map((r, i) => (
                <Touch
                  key={i}
                  onPress={() => addPoi(r)}
                  style={[s.resultRow, { borderBottomColor: Clr.white10 }]}
                >
                  <MapPin size={16} color={theme.selected} />
                  <View style={{ flex: 1, marginLeft: Sp[3] }}>
                    <Text style={[s.resultLabel, { color: theme.title }]}>{r.properties.label}</Text>
                    <Text style={[s.resultRegion, { color: theme.mute }]}>{r.properties.region}</Text>
                  </View>
                </Touch>
              ))}
            </View>
          )}
        </View>

        <View style={s.px6}>
          {/* Header itinéraire */}
          <View style={[s.rowBetween, s.section]}>
            <Heading level={4} subtitle="Opératif">ITINÉRAIRE</Heading>
            <View style={[s.row, { gap: Sp[2] }]}>
              <Touch
                style={[
                  s.btnCalc,
                  { backgroundColor: loading ? 'transparent' : theme.selected, opacity: loading || mapEntries.length < 2 ? 0.3 : 1 },
                ]}
                onPress={calculateRoute}
                disabled={loading || mapEntries.length < 2}
              >
                <Navigation2 size={14} color="#000" />
                <Text style={s.btnCalcLabel}>TRACER VECTEUR</Text>
              </Touch>
              <Touch style={[s.btnIcon, { borderColor: theme.border, backgroundColor: Clr.white5 }]} onPress={clearTrajets}>
                <Trash2 size={16} color={theme.mute} />
              </Touch>
            </View>
          </View>

          {/* Liste des points */}
          <View style={{ marginBottom: Sp[10] }}>
            <DailyCanvas
              module="trajet"
              renderItem={(item) => (
                <Card style={{ marginBottom: Sp[3] }}>
                  <View style={[s.row, { gap: Sp[4] }]}>
                    <View style={[s.poiIcon, { backgroundColor: Clr.gold10, borderColor: Clr.gold20 }]}>
                      <MapPin size={22} color={theme.selected} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.poiMod, { color: theme.selected }]}>Point de Passage</Text>
                      <Text style={[s.poiTitle, { color: theme.title }]}>{item.title}</Text>
                      <Text style={[s.poiAddr, { color: theme.mute }]}>{item.data.address}</Text>
                    </View>
                    <Touch onPress={() => removeEntry(item.id)} style={{ padding: Sp[3] }}>
                      <X size={16} color={Clr.white20} />
                    </Touch>
                  </View>
                </Card>
              )}
            />
          </View>

          {/* Résultat itinéraire */}
          {route && (
            <View style={[s.routeCard, { borderColor: Clr.gold30, backgroundColor: Clr.gold8 }]}>
              <View style={[s.rowBetween, { marginBottom: Sp[6] }]}>
                <View style={s.row}>
                  <Zap size={14} color={theme.selected} />
                  <Text style={[s.routeTitle, { color: theme.selected, marginLeft: Sp[2] }]}>Analyse de Trajectoire</Text>
                </View>
                <View style={[s.routeDot, { backgroundColor: theme.selected }]} />
              </View>
              <View style={[s.row, { gap: Sp[4] }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.routeStatLabel, { color: theme.mute }]}>Distance de Projection</Text>
                  <Text style={[s.routeStatVal, { color: theme.title }]}>
                    {(route.summary.distance / 1000).toFixed(1)}
                    <Text style={[s.routeStatUnit, { color: theme.selected }]}> KM</Text>
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.routeStatLabel, { color: theme.mute }]}>Délai d'Infiltration</Text>
                  <Text style={[s.routeStatVal, { color: theme.title }]}>
                    {Math.floor(route.summary.duration / 60)}
                    <Text style={[s.routeStatUnit, { color: theme.selected }]}> MIN</Text>
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Sélection transport */}
          <View style={[s.transportBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[s.transportLabel, { color: theme.mute }]}>
              {(LABELS as any).dash?.widgets?.transport ?? 'Transport'}
            </Text>
            <View style={[s.row, { gap: Sp[2] }]}>
              {(TRANSPORT_OPTIONS as Array<{ key: string; label: string }>).map((opt) => {
                const icons = TRANSPORT_ICONS as Record<string, React.ComponentType<{ size: number; color: string }>>;
                const Icon = icons[opt.key];
                const active = activeKey === opt.key;
                return (
                  <Touch
                    key={opt.key}
                    style={[
                      s.transportItem,
                      {
                        flex: 1,
                        backgroundColor: active ? Clr.gold8 : 'transparent',
                        borderColor: active ? theme.selected : theme.border,
                      },
                    ]}
                    onPress={() => setMode(ORS_MODE[opt.key] ?? 'driving-car')}
                  >
                    {Icon && <Icon size={18} color={active ? theme.selected : theme.mute} />}
                    <Text style={[s.transportItemLabel, { color: active ? theme.selected : theme.mute, fontWeight: active ? Fw.value : Fw.body }]}>
                      {opt.label}
                    </Text>
                  </Touch>
                );
              })}
            </View>
          </View>

          {/* Toggle radar */}
          <Card style={{ marginTop: Sp[4] }}>
            <View style={[s.rowBetween]}>
              <View style={[s.row, { gap: Sp[4] }]}>
                <View style={[s.iconBox, { backgroundColor: Clr.white5, borderColor: Clr.white10 }]}>
                  <Info size={18} color={theme.mute} />
                </View>
                <Text style={[s.radarLabel, { color: theme.title }]}>RADAR DE PROXIMITÉ</Text>
              </View>
              <Switch
                value={showPois}
                onValueChange={setShowPois}
                trackColor={{ false: '#1A1D1E', true: '#D4AF37' }}
                thumbColor="#fff"
              />
            </View>
          </Card>
        </View>
      </ScrollView>
    </PageWrapper>
  );
}

const s = StyleSheet.create({
  px6: { paddingHorizontal: Sp[6] },
  pt4: { paddingTop: Sp[4] },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { marginBottom: Sp[6] },

  mapPlaceholder: {
    height: 200, alignItems: 'center', justifyContent: 'center',
    borderTopWidth: 1, borderBottomWidth: 1, gap: Sp[2],
  },
  mapPlaceholderText: {
    fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.value,
    letterSpacing: Ls.md_02, textTransform: 'uppercase',
  },
  mapPlaceholderSub: {
    fontFamily: FontSans, fontSize: Fs.xs, fontWeight: Fw.mute,
    letterSpacing: Ls.xs_02, textTransform: 'uppercase',
  },

  searchBar: {
    paddingHorizontal: Sp[4], paddingVertical: Sp[2],
    borderWidth: 1, gap: Sp[3],
  },
  searchInput: {
    flex: 1, height: 32,
    fontFamily: FontSans, fontSize: Fs.body, fontWeight: Fw.value,
  },

  resultsBox: {
    marginTop: Sp[2], borderWidth: 1,
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: Sp[4], borderBottomWidth: 1,
  },
  resultLabel: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.value },
  resultRegion: { fontFamily: FontMono, fontSize: Fs.xxs, fontWeight: Fw.body, textTransform: 'uppercase', letterSpacing: Ls.xxs_02 },

  btnCalc: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Sp[4], height: Sp[10], gap: Sp[3],
  },
  btnCalcLabel: {
    fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display,
    color: '#000', textTransform: 'uppercase', letterSpacing: Ls.xs_02,
  },
  btnIcon: {
    width: Sp[10], height: Sp[10],
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },

  poiIcon: { width: 48, height: 48, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  poiMod: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, letterSpacing: Ls.xs_02, textTransform: 'uppercase', marginBottom: Sp[0.5] },
  poiTitle: { fontFamily: FontSans, fontSize: Fs.body, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: -0.5 },
  poiAddr: { fontFamily: FontSans, fontSize: Fs.xs, fontWeight: Fw.body, textTransform: 'uppercase', letterSpacing: Ls.xs_02 },

  routeCard: { borderWidth: 1, padding: Sp[6], marginBottom: Sp[8] },
  routeTitle: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, letterSpacing: Ls.xs_02, textTransform: 'uppercase' },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeStatLabel: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.xs_02, marginBottom: Sp[2] },
  routeStatVal: { fontFamily: FontMono, fontSize: 30, fontWeight: Fw.display, letterSpacing: -1 },
  routeStatUnit: { fontSize: Fs.body },

  transportBox: { padding: Sp[4], borderWidth: 1, marginBottom: Sp[6] },
  transportLabel: { fontFamily: FontSans, fontSize: Fs.xxs, fontWeight: Fw.value, letterSpacing: Ls.xxs_02 * 1.5, textTransform: 'uppercase', marginBottom: Sp[3] },
  transportItem: { flexDirection: 'column', alignItems: 'center', padding: Sp[3], borderWidth: 1 },
  transportItemLabel: { marginTop: Sp[1], fontFamily: FontSans, fontSize: Fs.xxs, textTransform: 'uppercase', letterSpacing: Ls.xxs_02 },

  iconBox: { width: Sp[10], height: Sp[10], borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  radarLabel: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.xs_02 },
});
