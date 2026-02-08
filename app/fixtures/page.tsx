"use client";

import { useState, useMemo, useEffect } from "react";
import { useFPL } from "@/lib/use-fpl-data";
import {
  getTeamShort, getTeamName, getFDRClass, getCurrentGW,
  getUpcomingFixtures, formatDate,
} from "@/lib/fpl-utils";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";

export default function FixturesPage() {
  const { fixtures, teams, gameweeks, loading, error, refresh } = useFPL();
  const [selectedGW, setSelectedGW] = useState<number | null>(null);
  const [view, setView] = useState<'list' | 'fdr'>('fdr');

  const currentGW = useMemo(() => getCurrentGW(gameweeks), [gameweeks]);

  // Set default GW when data loads
  useEffect(() => {
    if (gameweeks.length && !selectedGW) {
      const gw = gameweeks.find(g => g.is_current || g.is_next);
      if (gw) setSelectedGW(gw.id);
    }
  }, [gameweeks, selectedGW]);

  const rankedTeams = useMemo(() =>
    [...teams].sort((a, b) => {
      const aFix = getUpcomingFixtures(fixtures, teams, a.id, currentGW, 6);
      const bFix = getUpcomingFixtures(fixtures, teams, b.id, currentGW, 6);
      const aAvg = aFix.length ? aFix.reduce((s, f) => s + f.difficulty, 0) / aFix.length : 3;
      const bAvg = bFix.length ? bFix.reduce((s, f) => s + f.difficulty, 0) / bFix.length : 3;
      return aAvg - bAvg;
    }),
    [teams, fixtures, currentGW]
  );

  const filteredFixtures = selectedGW
    ? fixtures.filter(f => f.event === selectedGW)
    : [];

  const visibleGWs = useMemo(() =>
    gameweeks.filter(gw => !gw.finished || gw.is_current).slice(0, 10),
    [gameweeks]
  );

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Fixtures</h1>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              Fixture Difficulty Ratings
            </p>
          </div>

          <div className="flex border border-[var(--border)] rounded overflow-hidden self-start">
            <button
              onClick={() => setView('fdr')}
              className={`px-3 py-1.5 text-xs font-medium ${
                view === 'fdr' ? 'bg-[var(--bg-active)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
              }`}
            >
              FDR Matrix
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-xs font-medium border-l border-[var(--border)] ${
                view === 'list' ? 'bg-[var(--bg-active)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
              }`}
            >
              By Gameweek
            </button>
          </div>
        </div>

        {error ? <ErrorState message={error} retry={refresh} /> : loading ? <TableSkeleton rows={10} /> : (
          <>
            {/* Legend */}
            <div className="card p-3 mb-6">
              <div className="flex items-center justify-center gap-4 sm:gap-6 text-xs flex-wrap">
                <span className="text-[var(--text-tertiary)]">Difficulty:</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="fixture-badge fdr-2">2</span> Easy
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="fixture-badge fdr-3">3</span> Medium
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="fixture-badge fdr-4">4</span> Hard
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="fixture-badge fdr-5">5</span> Very Hard
                </span>
              </div>
            </div>

            {view === 'fdr' ? (
              /* FDR Matrix */
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--bg-primary)]">
                        <th className="sticky left-0 bg-[var(--bg-primary)] z-10 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-4 py-2.5 whitespace-nowrap" style={{ minWidth: 140 }}>Team</th>
                        {Array.from({ length: 6 }, (_, i) => (
                          <th key={i} className="text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-4 py-2.5 whitespace-nowrap" style={{ minWidth: 120 }}>GW{currentGW + i}</th>
                        ))}
                        <th className="text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-4 py-2.5 whitespace-nowrap" style={{ minWidth: 60 }}>Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankedTeams.map(team => {
                        const teamFixtures = getUpcomingFixtures(fixtures, teams, team.id, currentGW, 6);
                        const avgDiff = teamFixtures.length
                          ? (teamFixtures.reduce((s, f) => s + f.difficulty, 0) / teamFixtures.length).toFixed(1)
                          : '—';

                        return (
                          <tr key={team.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)]">
                            <td className="sticky left-0 bg-[var(--bg-card)] z-10 px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-[var(--text-tertiary)] w-8">
                                  {team.short_name}
                                </span>
                                <span className="font-medium text-sm hidden sm:inline">{team.name}</span>
                              </div>
                            </td>
                            {teamFixtures.map((fixture, idx) => (
                              <td key={idx} className="text-center px-4 py-2.5">
                                <span className={`fixture-badge ${getFDRClass(fixture.difficulty)}`}>
                                  {fixture.opponent}
                                  <span className="text-[8px] ml-0.5 opacity-70">
                                    {fixture.isHome ? 'H' : 'A'}
                                  </span>
                                </span>
                              </td>
                            ))}
                            {Array.from({ length: 6 - teamFixtures.length }).map((_, idx) => (
                              <td key={`empty-${idx}`} className="text-center px-4 py-2.5 text-[var(--text-muted)]">—</td>
                            ))}
                            <td className="text-center px-4 py-2.5">
                              <span className={`font-mono font-semibold ${
                                parseFloat(avgDiff) <= 2.5 ? 'text-[var(--success)]' :
                                parseFloat(avgDiff) >= 3.5 ? 'text-[var(--danger)]' : ''
                              }`}>
                                {avgDiff}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Gameweek List View */
              <>
                {/* GW Selector */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
                  {visibleGWs.map(gw => (
                    <button
                      key={gw.id}
                      onClick={() => setSelectedGW(gw.id)}
                      className={`flex-shrink-0 px-4 py-2 text-sm font-medium border transition-colors ${
                        selectedGW === gw.id
                          ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                          : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div>GW{gw.id}</div>
                      {(gw.is_current || gw.is_next) && (
                        <div className="text-[10px] opacity-70 uppercase">
                          {gw.is_current ? 'Current' : 'Next'}
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Fixtures List */}
                <div className="card overflow-hidden">
                  <div className="divide-y divide-[var(--border)]">
                    {filteredFixtures.map(fixture => (
                      <div key={fixture.id} className="flex items-center px-3 sm:px-4 py-3 hover:bg-[var(--bg-hover)]">
                        {/* Home Team */}
                        <div className="flex-1 text-right">
                          <span className="font-semibold text-sm sm:text-base">
                            <span className="hidden sm:inline">{getTeamName(teams, fixture.team_h)}</span>
                            <span className="sm:hidden">{getTeamShort(teams, fixture.team_h)}</span>
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] ml-1">(H)</span>
                        </div>

                        {/* Score / FDR */}
                        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6">
                          <span className={`fixture-badge ${getFDRClass(fixture.team_h_difficulty)}`}>
                            {fixture.team_h_difficulty}
                          </span>

                          {fixture.finished ? (
                            <span className="font-mono font-bold text-base sm:text-lg min-w-[50px] sm:min-w-[60px] text-center">
                              {fixture.team_h_score} - {fixture.team_a_score}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] text-sm min-w-[50px] sm:min-w-[60px] text-center">vs</span>
                          )}

                          <span className={`fixture-badge ${getFDRClass(fixture.team_a_difficulty)}`}>
                            {fixture.team_a_difficulty}
                          </span>
                        </div>

                        {/* Away Team */}
                        <div className="flex-1">
                          <span className="text-[10px] text-[var(--text-muted)] mr-1">(A)</span>
                          <span className="font-semibold text-sm sm:text-base">
                            <span className="hidden sm:inline">{getTeamName(teams, fixture.team_a)}</span>
                            <span className="sm:hidden">{getTeamShort(teams, fixture.team_a)}</span>
                          </span>
                        </div>

                        {/* Time */}
                        <div className="text-xs font-mono text-[var(--text-muted)] w-16 sm:w-24 text-right hidden sm:block">
                          {formatDate(fixture.kickoff_time)}
                        </div>
                      </div>
                    ))}
                    {filteredFixtures.length === 0 && (
                      <div className="text-center py-8 text-sm text-[var(--text-tertiary)]">
                        No fixtures for this gameweek
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
  );
}
