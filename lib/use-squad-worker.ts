"use client";

import { useRef, useCallback, useEffect } from "react";

export interface SquadBuilderInput {
  players: Array<{
    id: number; web_name: string; element_type: number; team: number;
    now_cost: number; total_points: number; goals_scored: number; assists: number;
    clean_sheets: number; form: string; status: string;
    chance_of_playing_next_round: number | null; minutes: number;
  }>;
  teams: Array<{ id: number; short_name: string }>;
  fixtures: Array<{
    event: number | null; finished: boolean; team_h: number; team_a: number;
    team_h_difficulty: number; team_a_difficulty: number;
  }>;
  currentGW: number;
  budget: number;
  strategy: 'balanced' | 'attack' | 'defense' | 'form' | 'xPts';
  formation: '3-4-3' | '3-5-2' | '4-3-3' | '4-4-2' | '4-5-1' | '5-3-2' | '5-4-1';
  builderContext: 'regular' | 'wildcard' | 'freehit';
}

export interface ScoredPlayer {
  id: number; web_name: string; element_type: number; team: number;
  now_cost: number; total_points: number; goals_scored: number; assists: number;
  clean_sheets: number; form: string; status: string;
  chance_of_playing_next_round: number | null; minutes: number;
  score: number; teamName: string; xPts: number;
  upcomingFixtures: { opponent: string; difficulty: number; isHome: boolean; gw: number }[];
}

export interface SquadBuilderResult {
  startingXI: ScoredPlayer[];
  bench: ScoredPlayer[];
  totalCost: number;
  totalPoints: number;
}

/**
 * Hook that manages a Web Worker for squad building.
 * Returns a generate function that posts to the worker and calls onResult when done.
 */
export function useSquadWorker(
  onResult: (result: SquadBuilderResult) => void,
  onError?: (error: string) => void,
) {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Create worker
    workerRef.current = new Worker(
      new URL('../workers/squad-builder.worker.ts', import.meta.url)
    );

    workerRef.current.onmessage = (e: MessageEvent<{ type: string; payload: SquadBuilderResult }>) => {
      if (e.data.type === 'result') {
        onResult(e.data.payload);
      }
    };

    workerRef.current.onerror = (e) => {
      onError?.(e.message || 'Worker error');
    };

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
    // Only create worker once — callbacks are captured via ref pattern below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep callbacks fresh via refs
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;
    worker.onmessage = (e: MessageEvent<{ type: string; payload: SquadBuilderResult }>) => {
      if (e.data.type === 'result') {
        onResultRef.current(e.data.payload);
      }
    };
    worker.onerror = (e) => {
      onErrorRef.current?.(e.message || 'Worker error');
    };
  });

  const generate = useCallback((input: SquadBuilderInput) => {
    workerRef.current?.postMessage({ type: 'generate', payload: input });
  }, []);

  return generate;
}
