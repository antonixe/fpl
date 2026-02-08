"use client";

import { useState, useEffect, useCallback } from "react";
import { FPLEntry, FPLPick } from "@/types/fpl";

const TEAM_ID_KEY = 'fpl_team_id';

function getSavedTeamId(): string {
  try {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(TEAM_ID_KEY) || '';
  } catch {
    return '';
  }
}

function saveTeamId(id: string) {
  try {
    if (typeof window !== 'undefined') localStorage.setItem(TEAM_ID_KEY, id);
  } catch {
    // localStorage unavailable (private browsing, etc.)
  }
}

export interface TeamData {
  entry: FPLEntry;
  picks: FPLPick[];
  bank: number;
  chipsPlayed: { name: string; event: number }[];
  freeTransfers: number;
}

/**
 * Shared hook for FPL team ID input, fetching, and state management.
 * Used by Transfer Advisor and Chip Advisor.
 */
export function useTeamData() {
  const [teamIdInput, setTeamIdInput] = useState('');
  const [teamId, setTeamId] = useState<number | null>(null);
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entry, setEntry] = useState<FPLEntry | null>(null);
  const [picks, setPicks] = useState<FPLPick[]>([]);
  const [bank, setBank] = useState(0);
  const [chipsPlayed, setChipsPlayed] = useState<{ name: string; event: number }[]>([]);
  const [freeTransfers, setFreeTransfers] = useState(1);

  // Load saved team ID on mount
  useEffect(() => {
    const saved = getSavedTeamId();
    if (saved) setTeamIdInput(saved);
  }, []);

  const fetchTeamData = useCallback(async () => {
    const id = parseInt(teamIdInput, 10);
    if (isNaN(id) || id <= 0) {
      setEntryError('Please enter a valid FPL Team ID');
      return;
    }

    setEntryLoading(true);
    setEntryError(null);
    setTeamId(id);
    saveTeamId(teamIdInput);

    try {
      const res = await fetch(`/api/entry/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch (${res.status})`);
      }

      const data = await res.json();
      setEntry(data.entry);
      setPicks(data.picks?.picks || []);
      setBank(data.picks?.entry_history?.bank || data.entry?.last_deadline_bank || 0);
      setChipsPlayed(data.chips || []);

      const seasonHistory = data.season_history;
      const chipsData = data.chips || [];
      if (Array.isArray(seasonHistory) && seasonHistory.length > 0) {
        let ft = 1;
        for (const gw of seasonHistory) {
          const chipThisGW = chipsData.find((c: { event: number; name: string }) =>
            c.event === gw.event && (c.name === 'wildcard' || c.name === 'freehit')
          );
          if (chipThisGW) {
            ft = 1;
          } else {
            const used = gw.event_transfers || 0;
            ft = Math.min(5, Math.max(1, ft - used + 1));
          }
        }
        setFreeTransfers(ft);
      } else {
        setFreeTransfers(1);
      }
    } catch (err) {
      setEntryError(err instanceof Error ? err.message : 'Failed to fetch team');
    } finally {
      setEntryLoading(false);
    }
  }, [teamIdInput]);

  return {
    teamIdInput, setTeamIdInput,
    teamId, entryLoading, entryError,
    entry, picks, bank, chipsPlayed, freeTransfers,
    fetchTeamData,
  };
}
