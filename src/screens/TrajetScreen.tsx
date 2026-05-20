import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput as RNTextInput,
  Switch, ActivityIndicator, Platform
} from 'react-native';

const TextInput = RNTextInput as React.ComponentType<any>;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  MapContainer, TileLayer, Marker, Popup, Polyline, 
  useMapEvents, ZoomControl 
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Navigation, MapPin, Search, Navigation2, 
  Trash2, ChevronRight, Map as MapIcon, Layers, Info, Trash, X, Zap
} from 'lucide-react';

import { useTheme } from '../hooks/useTheme';
import { ds, uid } from '../utils/storage';
import { TRANSPORT_ICONS } from '../constants/icons';
import { L as LABELS, TRANSPORT_OPTIONS } from '../constants/labels';
import { useAppState } from '../context/AppStateContext';
import { useDaily } from '../context/DailyContext';
import { ORSService } from '../services/orsService';
import { GPSLogicService } from '../services/gpsLogicService';
import { MapService } from '../services/mapService';

import { PageWrapper, StaggerItem } from '../components/Animated';
import { DailyCanvas } from '../components/DailyCanvas';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER: [number, number] = [48.8566, 2.3522]; // Paris

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
  const ORS_MODE: Record<string, string> = { car: 'driving-car', moto: 'driving-car', bike: 'cycling-regular', foot: 'foot-walking', transit: 'foot-walking' };
  const activeKey = (TRANSPORT_OPTIONS as Array<{ key: string }>).find(o => ORS_MODE[o.key] === mode)?.key ?? 'car';
  const [showPois, setShowPois] = useState(true);
  const [mapType, setMapType] = useState('light');
  const [selPoi, setSelPoi] = useState<any>(null);

  const travelEntries = useMemo(() => entries.filter((e: any) => e.module === 'trajet'), [entries]);

  const mapEntries = useMemo(() => {
    return travelEntries.filter((e: any) => e.data && e.data.coords);
  }, [travelEntries]);

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
        coords: feat.geometry.coordinates, // [lng, lat]
        address: feat.properties.label,
      }
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
        <div className="px-6 pt-4 pb-1">
          <ScreenHeader tag="TRAJET" title="TRAJET" />
        </div>

        <div className="h-[400px] w-full bg-awan-surface relative">
          <MapComponent 
            entries={mapEntries} 
            route={route} 
            selPoi={selPoi}
            setSelPoi={setSelPoi}
            mapType={mapType}
            theme={theme}
          />
          
          <div className="absolute top-4 left-4 right-4 z-[1000]">
            <div className="flex flex-row gap-2">
              <div className="flex-1 bg-awan-bg/80 backdrop-blur-xl border border-white/10  flex flex-row items-center px-4 py-2 shadow-2xl">
                <Search size={18} className="text-awan-tx-mute mr-3" />
                <TextInput 
                  className="flex-1 text-sm font-bold text-awan-tx h-8 outline-none"
                  placeholder="Objectif de destination..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={handleSearch}
                />
                {loading && <ActivityIndicator size="small" color={theme.title} />}
              </div>
              <Touch className="w-12 h-12 bg-white/5 backdrop-blur-xl border border-white/10  items-center justify-center" onPress={() => setMapType(mapType === 'light' ? 'dark' : 'light')}>
                <Layers size={20} className="text-awan-tx" />
              </Touch>
            </div>

            <AnimatePresence>
              {results.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-2 bg-awan-bg/95 backdrop-blur-xl border border-white/10  overflow-hidden shadow-2xl"
                >
                  {results.slice(0, 5).map((r, i) => (
                    <Touch key={i} className="p-4 border-b border-white/5 flex flex-row items-center gap-3 hover:bg-white/5" onPress={() => addPoi(r)}>
                      <MapPin size={16} className="text-awan-gold" />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-awan-tx block mb-0.5">{r.properties.label}</span>
                        <span className="text-awan-md font-medium text-awan-tx-mute uppercase tracking-widest">{r.properties.region}</span>
                      </div>
                    </Touch>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="flex flex-row justify-between items-center mb-6">
              <Heading level={4} mono subtitle="Opératif" className="mb-0">ITINÉRAIRE</Heading>
              <div className="flex flex-row gap-2">
                <Touch 
                  className={`px-4 h-10  border border-white/10 flex flex-row items-center gap-3 transition-all ${loading ? 'opacity-30' : 'bg-awan-gold'}`} 
                  onPress={calculateRoute}
                  disabled={loading || mapEntries.length < 2}
                >
                  <Navigation2 size={14} className="text-black" />
                  <span className="text-awan-md font-black text-black uppercase tracking-widest">TRACER VECTEUR</span>
                </Touch>
                <Touch 
                  className="w-10 h-10  bg-white/5 border border-white/10 items-center justify-center hover:bg-awan-status-error/10 hover:border-awan-status-error/30" 
                  onPress={clearTrajets}
                >
                  <Trash2 size={16} className="text-awan-tx-mute" />
                </Touch>
              </div>
          </div>

          <div className="mb-10">
            <DailyCanvas 
              module="trajet" 
              renderItem={(item) => (
                <Card className="flex-row items-center gap-4 py-5 mb-3 bg-white/5 border-white/5" variant="flat">
                  <div className="w-12 h-12  bg-awan-gold/10 flex items-center justify-center border border-awan-gold/20">
                    <MapPin size={22} className="text-awan-gold" />
                  </div>
                  <div className="flex-1">
                    <span className="text-awan-md font-black text-awan-gold tracking-widest uppercase mb-1 block">Point de Passage</span>
                    <span className="text-sm font-bold text-awan-tx uppercase tracking-tight mb-0.5">{item.title}</span>
                    <span className="text-awan-sm font-medium text-awan-tx-mute uppercase tracking-[0.2em]">{item.data.address}</span>
                  </div>
                  <Touch onPress={() => removeEntry(item.id)} className="p-3">
                    <X size={16} className="text-white/20" />
                  </Touch>
                </Card>
              )}
            />
          </div>

          {route && (
            <Card className="border-awan-gold/40 bg-awan-gold/5 p-6 mb-8 shadow-xl shadow-awan-gold/5">
              <div className="flex flex-row justify-between mb-6">
                 <div className="flex flex-row items-center gap-2">
                    <Zap size={14} className="text-awan-gold" />
                    <span className="text-awan-md font-black text-awan-gold tracking-widest uppercase">Analyse de Trajectoire</span>
                 </div>
                 <div className="w-2 h-2 rounded-full bg-awan-gold animate-pulse" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-awan-md font-black text-awan-tx-mute uppercase tracking-widest mb-2 block">Distance de Projection</span>
                  <span className="text-3xl font-black text-awan-tx font-mono tracking-tighter">{(route.summary.distance / 1000).toFixed(1)}<span className="text-sm ml-1 text-awan-gold">KM</span></span>
                </div>
                <div>
                  <span className="text-awan-md font-black text-awan-tx-mute uppercase tracking-widest mb-2 block">Délai d'Infiltration</span>
                  <span className="text-3xl font-black text-awan-tx font-mono tracking-tighter">{Math.floor(route.summary.duration / 60)}<span className="text-sm ml-1 text-awan-gold">MIN</span></span>
                </div>
              </div>
            </Card>
          )}

          {/* Widget choix de véhicule */}
          <div className="p-4 border mb-6" style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: 'var(--color-awan-border)' }}>
            <span className="uppercase block mb-3" style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', fontWeight: 700, color: 'var(--color-awan-tx-mute)', letterSpacing: '0.3em' }}>
              {(LABELS as any).dash.widgets.transport}
            </span>
            <div className="flex flex-row gap-2">
              {(TRANSPORT_OPTIONS as Array<{ key: string; label: string }>).map((opt) => {
                const icons  = TRANSPORT_ICONS as Record<string, React.ComponentType<{ size: number; color: string }>>;
                const Icon   = icons[opt.key];
                const active = activeKey === opt.key;
                return (
                  <Touch key={opt.key} className="flex-1 flex flex-col items-center p-3 border transition-all"
                    style={{ backgroundColor: active ? 'rgba(212,175,55,0.08)' : 'transparent', borderColor: active ? 'var(--color-awan-gold)' : 'var(--color-awan-border)' }}
                    onPress={() => setMode(ORS_MODE[opt.key] ?? 'driving-car')}>
                    {Icon && <Icon size={18} color={active ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)'} />}
                    <span className="mt-1 uppercase" style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', fontWeight: active ? 700 : 400, color: active ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)', letterSpacing: '0.2em' }}>
                      {opt.label}
                    </span>
                  </Touch>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <Card className="flex-row items-center justify-between p-5 bg-white/5 border-white/5">
              <div className="flex flex-row items-center gap-4">
                <div className="w-10 h-10  bg-white/5 items-center justify-center border border-white/10">
                  <Info size={18} className="text-awan-tx-mute" />
                </div>
                <span className="text-xs font-black text-awan-tx uppercase tracking-wider">RADAR DE PROXIMITÉ</span>
              </div>
              <Switch 
                value={showPois} 
                onValueChange={setShowPois} 
                trackColor={{ false: '#1A1D1E', true: '#D4AF37' }}
                thumbColor="#fff"
              />
            </Card>
          </div>
        </div>
      </ScrollView>
    </PageWrapper>
  );
}

function MapComponent({ entries, route, selPoi, setSelPoi, mapType, theme }: any) {
  if (Platform.OS !== 'web') return null;

  const polyline = useMemo(() => {
    if (!route || !route.geometry || !route.geometry.coordinates) return null;
    // ORS returns [lng, lat], Leaflet wants [lat, lng]
    return route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
  }, [route]);

  const MapEvents = () => {
    useMapEvents({
      click(e) {
        // Optionnel: ajouter POI au clic ?
      }
    });
    return null;
  };

  const center = useMemo(() => {
    if (selPoi && selPoi.data && selPoi.data.coords) return [selPoi.data.coords[1], selPoi.data.coords[0]];
    if (entries.length > 0) return [entries[0].data.coords[1], entries[0].data.coords[0]];
    return DEFAULT_CENTER;
  }, [entries, selPoi]);

  return (
    <MapContainer 
      center={center as any} 
      zoom={13} 
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url={mapType === 'light' 
          ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <ZoomControl position="bottomleft" />
      <MapEvents />

      {entries.map((e: any) => (
        <Marker 
          key={e.id} 
          position={[e.data.coords[1], e.data.coords[0]] as any}
          eventHandlers={{
            click: () => setSelPoi(e)
          }}
        >
          <Popup>
            <span className="font-bold text-xs">{e.title}</span>
          </Popup>
        </Marker>
      ))}

      {polyline && <Polyline positions={polyline} color={theme.selected} weight={4} opacity={0.8} dashArray="8, 8" />}
    </MapContainer>
  );
}
