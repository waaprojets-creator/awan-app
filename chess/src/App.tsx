import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomeScreen from '@/screens/HomeScreen';
import PlaySetupScreen from '@/screens/PlaySetupScreen';
import GameScreen from '@/screens/GameScreen';
import AnalysisScreen from '@/screens/AnalysisScreen';
import PuzzlesScreen from '@/screens/PuzzlesScreen';
import HistoryScreen from '@/screens/HistoryScreen';
import NavBar from '@/components/ui/NavBar';

export default function App() {
  return (
    <HashRouter>
      <div className="flex flex-col min-h-dvh bg-chess-bg text-chess-text-primary">
        <div className="flex-1 pb-16">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/play" element={<PlaySetupScreen />} />
            <Route path="/game" element={<GameScreen />} />
            <Route path="/analysis" element={<AnalysisScreen />} />
            <Route path="/puzzles" element={<PuzzlesScreen />} />
            <Route path="/history" element={<HistoryScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <NavBar />
      </div>
    </HashRouter>
  );
}
