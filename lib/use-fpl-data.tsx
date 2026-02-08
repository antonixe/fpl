"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";
import { Player, Team, Fixture, GameWeek, FPLData, ElementType } from "@/types/fpl";

// Split into two contexts: data (stable) and status (changes during fetching)
// This prevents re-rendering the entire tree when only loading/error state changes.

interface FPLDataContextType {
  players: Player[];
  teams: Team[];
  fixtures: Fixture[];
  gameweeks: GameWeek[];
  elementTypes: ElementType[];
}

interface FPLStatusContextType {
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

// Combined type for the public hook (backward-compatible)
type FPLContextType = FPLDataContextType & FPLStatusContextType;

const FPLDataContext = createContext<FPLDataContextType | null>(null);
const FPLStatusContext = createContext<FPLStatusContextType | null>(null);

// In-memory cache shared across the app
let cachedData: {
  players: Player[];
  teams: Team[];
  fixtures: Fixture[];
  gameweeks: GameWeek[];
  elementTypes: ElementType[];
  timestamp: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const LS_KEY = 'fpl-data-cache';

function isCacheValid(): boolean {
  return cachedData !== null && Date.now() - cachedData.timestamp < CACHE_TTL;
}

/** Try to restore data from localStorage on cold start */
function loadFromStorage(): typeof cachedData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Accept stale localStorage data (up to 24h) as a fallback
    if (parsed?.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
      return parsed;
    }
  } catch { /* ignore parse errors */ }
  return null;
}

/** Persist latest data to localStorage for offline fallback */
function saveToStorage(data: NonNullable<typeof cachedData>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch { /* ignore quota errors */ }
}

interface FPLProviderProps {
  children: ReactNode;
  /** Server-fetched data for SSR hydration — skips client-side loading */
  initialData?: {
    players: Player[];
    teams: Team[];
    fixtures: Fixture[];
    gameweeks: GameWeek[];
    elementTypes: ElementType[];
  };
}

export function FPLProvider({ children, initialData }: FPLProviderProps) {
  // Seed module cache from server data on first render (runs once)
  const [_seeded] = useState(() => {
    if (initialData?.players?.length && !cachedData) {
      cachedData = {
        players: initialData.players,
        teams: initialData.teams,
        fixtures: initialData.fixtures,
        gameweeks: initialData.gameweeks,
        elementTypes: initialData.elementTypes,
        timestamp: Date.now(),
      };
    }
    return true;
  });

  const seed = cachedData;
  const hasData = !!(seed?.players?.length);

  const [players, setPlayers] = useState<Player[]>(seed?.players || []);
  const [teams, setTeams] = useState<Team[]>(seed?.teams || []);
  const [fixtures, setFixtures] = useState<Fixture[]>(seed?.fixtures || []);
  const [gameweeks, setGameweeks] = useState<GameWeek[]>(seed?.gameweeks || []);
  const [elementTypes, setElementTypes] = useState<ElementType[]>(seed?.elementTypes || []);
  const [loading, setLoading] = useState(!hasData && !isCacheValid());
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    seed ? new Date(seed.timestamp) : null
  );

  const fetchData = useCallback(async (force = false) => {
    if (!force && isCacheValid()) {
      setPlayers(cachedData!.players);
      setTeams(cachedData!.teams);
      setFixtures(cachedData!.fixtures);
      setGameweeks(cachedData!.gameweeks);
      setElementTypes(cachedData!.elementTypes);
      setLastUpdated(new Date(cachedData!.timestamp));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [fplRes, fixturesRes] = await Promise.all([
        fetch('/api/fpl'),
        fetch('/api/fixtures'),
      ]);

      if (!fplRes.ok) throw new Error(`FPL API error: ${fplRes.status}`);
      if (!fixturesRes.ok) throw new Error(`Fixtures API error: ${fixturesRes.status}`);

      const fplData: FPLData = await fplRes.json();
      const fixturesData: Fixture[] = await fixturesRes.json();

      // Check for error responses
      if ('error' in fplData) throw new Error((fplData as unknown as { error: string }).error);

      const now = Date.now();
      cachedData = {
        players: fplData.elements,
        teams: fplData.teams,
        fixtures: fixturesData,
        gameweeks: fplData.events,
        elementTypes: fplData.element_types,
        timestamp: now,
      };

      saveToStorage(cachedData);

      setPlayers(fplData.elements);
      setTeams(fplData.teams);
      setFixtures(fixturesData);
      setGameweeks(fplData.events);
      setElementTypes(fplData.element_types);
      setLastUpdated(new Date(now));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load FPL data';

      // Fallback: try localStorage if API is unreachable and we have no in-memory data
      if (!cachedData) {
        const stored = loadFromStorage();
        if (stored) {
          cachedData = stored;
          setPlayers(stored.players);
          setTeams(stored.teams);
          setFixtures(stored.fixtures);
          setGameweeks(stored.gameweeks);
          setElementTypes(stored.elementTypes);
          setLastUpdated(new Date(stored.timestamp));
          setError('Using cached data — FPL API is currently unreachable');
          setLoading(false);
          return;
        }
      }

      setError(message);
      console.error('FPL data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Stable data reference — only changes when data actually changes
  const dataValue = useMemo<FPLDataContextType>(() => ({
    players, teams, fixtures, gameweeks, elementTypes,
  }), [players, teams, fixtures, gameweeks, elementTypes]);

  // Status reference — changes on loading/error state transitions
  const statusValue = useMemo<FPLStatusContextType>(() => ({
    loading, error, lastUpdated, refresh: () => fetchData(true),
  }), [loading, error, lastUpdated, fetchData]);

  return (
    <FPLDataContext.Provider value={dataValue}>
      <FPLStatusContext.Provider value={statusValue}>
        {children}
      </FPLStatusContext.Provider>
    </FPLDataContext.Provider>
  );
}

/** Use FPL data only (players, teams, fixtures, etc.) — won't re-render on loading state changes */
export function useFPLData(): FPLDataContextType {
  const context = useContext(FPLDataContext);
  if (!context) throw new Error('useFPLData must be used within a FPLProvider');
  return context;
}

/** Use FPL status only (loading, error, refresh) — won't re-render on data changes */
export function useFPLStatus(): FPLStatusContextType {
  const context = useContext(FPLStatusContext);
  if (!context) throw new Error('useFPLStatus must be used within a FPLProvider');
  return context;
}

/** Combined hook (backward-compatible) — re-renders on both data and status changes */
export function useFPL(): FPLContextType {
  const data = useFPLData();
  const status = useFPLStatus();
  return { ...data, ...status };
}
