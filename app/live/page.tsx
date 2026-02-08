"use client";

import { useCallback } from "react";
import { useFPL } from "@/lib/use-fpl-data";
import { getCurrentGW, getTeamName, getTeamShort } from "@/lib/fpl-utils";
import { PageSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { LiveRegion } from "@/components/LiveRegion";
import MatchCard from "@/components/live/MatchCard";
import { useState, useEffect, useMemo } from "react";
import { Fixture, LiveElement } from "@/types/fpl";

interface LiveData {
  fixtures: Fixture[];
  elements: LiveElement[];
}

export default function LivePage() {
  const { players, teams, gameweeks, loading: fplLoading, error: fplError, refresh } = useFPL();

  const currentGW = useMemo(() => getCurrentGW(gameweeks), [gameweeks]);
  const [selectedGW, setSelectedGW] = useState<number | null>(null);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const gw = selectedGW ?? currentGW;

  useEffect(() => {
    if (currentGW > 0 && selectedGW === null) setSelectedGW(currentGW);
  }, [currentGW, selectedGW]);

  const fetchLive = useCallback(async () => {
    if (gw < 1) return;
    setLiveLoading(true);
    setLiveError(null);
    try {
      const res = await fetch(`/api/live/${gw}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: LiveData = await res.json();
      setLiveData(data);
      setLastRefresh(new Date());
    } catch {
      setLiveError("Failed to load live data");
    } finally {
      setLiveLoading(false);
    }
  }, [gw]);

  useEffect(() => {
    if (gw >= 1) fetchLive();
  }, [gw, fetchLive]);

  useEffect(() => {
    if (!autoRefresh || !liveData) return;
    const hasLiveMatches = liveData.fixtures.some(f => f.started && !f.finished && !f.finished_provisional);
    if (!hasLiveMatches) return;
    const interval = setInterval(fetchLive, 30_000);
    return () => clearInterval(interval);
  }, [autoRefresh, liveData, fetchLive]);

  const summary = useMemo(() => {
    if (!liveData) return null;
    const { fixtures } = liveData;
    return {
      live: fixtures.filter(f => f.started && !f.finished && !f.finished_provisional).length,
      finished: fixtures.filter(f => f.finished || f.finished_provisional).length,
      upcoming: fixtures.filter(f => !f.started).length,
      totalGoals: fixtures.reduce((sum, f) => sum + (f.team_h_score ?? 0) + (f.team_a_score ?? 0), 0),
      total: fixtures.length,
    };
  }, [liveData]);

  const sortedFixtures = useMemo(() => {
    if (!liveData) return [];
    return [...liveData.fixtures].sort((a, b) => {
      const aLive = a.started && !a.finished && !a.finished_provisional;
      const bLive = b.started && !b.finished && !b.finished_provisional;
      const aFinished = a.finished || a.finished_provisional;
      const bFinished = b.finished || b.finished_provisional;
      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;
      if (!aFinished && bFinished) return -1;
      if (aFinished && !bFinished) return 1;
      return new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime();
    });
  }, [liveData]);

  const fixtureGroups = useMemo(() => {
    const groups: { label: string; fixtures: Fixture[] }[] = [];
    let currentLabel = "";
    for (const f of sortedFixtures) {
      let label: string;
      try {
        label = new Date(f.kickoff_time).toLocaleDateString("en-GB", {
          weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
        });
      } catch {
        label = "TBD";
      }
      if (label !== currentLabel) {
        groups.push({ label, fixtures: [] });
        currentLabel = label;
      }
      groups[groups.length - 1].fixtures.push(f);
    }
    return groups;
  }, [sortedFixtures]);

  const isLoading = fplLoading || (liveLoading && !liveData);
  const isError = fplError || liveError;

  const gwOptions = useMemo(
    () => gameweeks.filter(g => g.id <= currentGW + 1).sort((a, b) => b.id - a.id),
    [gameweeks, currentGW],
  );

  const hasLiveMatches = liveData?.fixtures.some(f => f.started && !f.finished && !f.finished_provisional);

  return (
    <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-6">
      {isLoading ? (
        <PageSkeleton />
      ) : isError ? (
        <ErrorState message={liveError || fplError || "Something went wrong"} retry={() => { refresh(); fetchLive(); }} />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">Live Matches</h1>
              <p className="text-[12px] text-[var(--text-muted)] font-mono mt-0.5">
                Gameweek {gw}
                {lastRefresh && ` · Updated ${lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`text-[11px] font-mono px-2 py-1 rounded border transition-colors ${
                  autoRefresh && hasLiveMatches
                    ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                    : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-muted)]"
                }`}
                title={autoRefresh ? "Auto-refresh ON (30s)" : "Auto-refresh OFF"}
              >
                {autoRefresh ? "⟳ AUTO" : "⟳ OFF"}
              </button>
              <button
                onClick={fetchLive}
                disabled={liveLoading}
                className="text-[11px] font-mono px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] transition-colors disabled:opacity-50"
              >
                {liveLoading ? "..." : "Refresh"}
              </button>
              <select
                value={gw}
                onChange={e => setSelectedGW(parseInt(e.target.value))}
                className="text-[12px] font-mono px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] outline-none"
                aria-label="Select gameweek"
              >
                {gwOptions.map(g => (
                  <option key={g.id} value={g.id}>
                    GW{g.id}{g.is_current ? " (current)" : ""}{g.is_next ? " (next)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary Bar */}
          {summary && (
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: "LIVE", value: summary.live, accent: summary.live > 0 },
                { label: "FINISHED", value: summary.finished, accent: false },
                { label: "UPCOMING", value: summary.upcoming, accent: false },
                { label: "GOALS", value: summary.totalGoals, accent: false },
              ].map(s => (
                <div key={s.label} className="bg-[var(--bg-card)] rounded border border-[var(--border)] p-3 text-center">
                  <div className={`font-mono font-bold text-xl ${s.accent ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>{s.value}</div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Live indicator */}
          {hasLiveMatches && (
            <div className="flex items-center gap-2 mb-4">
              <span className="status-dot status-live" />
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                Matches in progress · Auto-refreshing every 30s
              </span>
            </div>
          )}

          <LiveRegion
            message={summary ? `Gameweek ${gw}: ${summary.live} live, ${summary.finished} finished, ${summary.totalGoals} goals` : 'Loading live data'}
          />

          {/* Fixture Groups */}
          {fixtureGroups.length === 0 && (
            <div className="text-center py-12">
              <div className="text-[var(--text-muted)] text-sm">No fixtures for this gameweek yet</div>
            </div>
          )}

          {fixtureGroups.map((group, gi) => (
            <div key={gi} className="mb-6">
              <div className="text-[10px] font-mono font-semibold text-[var(--text-muted)] uppercase mb-2 px-1">
                {group.label}
              </div>
              <div className="space-y-2">
                {group.fixtures.map(fixture => (
                  <MatchCard
                    key={fixture.id}
                    fixture={fixture}
                    players={players}
                    liveElements={liveData?.elements || []}
                    homeTeamName={getTeamName(teams, fixture.team_h)}
                    awayTeamName={getTeamName(teams, fixture.team_a)}
                    homeTeamShort={getTeamShort(teams, fixture.team_h)}
                    awayTeamShort={getTeamShort(teams, fixture.team_a)}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </main>
  );
}
