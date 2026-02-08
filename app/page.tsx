"use client";

import Link from "next/link";
import { useFPL } from "@/lib/use-fpl-data";
import {
  getPositionLabel, getPositionClass, getTeamShort,
  calcPPM, getCurrentGW, calcExpectedPoints, formatPrice,
  getUpcomingFixtures, getFDRClass, isPlayerAvailable,
} from "@/lib/fpl-utils";
import { PageSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { useMemo } from "react";

export default function HomePage() {
  const { players, teams, fixtures, gameweeks, loading, error, lastUpdated, refresh } = useFPL();

  const currentGW = useMemo(() => getCurrentGW(gameweeks), [gameweeks]);
  const gwInfo = gameweeks.find(e => e.is_current);
  const nextGW = gameweeks.find(e => e.is_next);
  const deadlineGW = gwInfo?.is_current ? nextGW : gwInfo;

  // ----- Computed Data -----

  const topPlayers = useMemo(() =>
    [...players]
      .filter(p => p.minutes > 0)
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 10)
      .map(p => ({ ...p, xPts: calcExpectedPoints(p, fixtures, teams, currentGW) })),
    [players, fixtures, teams, currentGW]
  );

  const topForm = useMemo(() =>
    [...players]
      .filter(p => p.minutes > 0)
      .sort((a, b) => parseFloat(b.form) - parseFloat(a.form))
      .slice(0, 5),
    [players]
  );

  const topValue = useMemo(() =>
    [...players]
      .filter(p => p.minutes > 0 && p.now_cost > 0)
      .map(p => ({ ...p, ppm: calcPPM(p) }))
      .sort((a, b) => b.ppm - a.ppm)
      .slice(0, 5),
    [players]
  );

  // Captain picks — mids/fwds ranked by xPts × 2 + form
  const captainPicks = useMemo(() =>
    [...players]
      .filter(p => p.minutes > 0 && p.status === 'a' && (p.element_type === 3 || p.element_type === 4))
      .map(p => {
        const xPts = calcExpectedPoints(p, fixtures, teams, currentGW);
        const form = parseFloat(p.form) || 0;
        return { ...p, xPts, captainScore: xPts * 2 + form };
      })
      .sort((a, b) => b.captainScore - a.captainScore)
      .slice(0, 5),
    [players, fixtures, teams, currentGW]
  );

  // Differentials — high xPts, <10% ownership
  const differentials = useMemo(() =>
    [...players]
      .filter(p => p.minutes > 0 && p.status === 'a' && parseFloat(p.selected_by_percent) < 10)
      .map(p => ({
        ...p,
        xPts: calcExpectedPoints(p, fixtures, teams, currentGW),
        ownership: parseFloat(p.selected_by_percent),
      }))
      .filter(p => p.xPts > 0)
      .sort((a, b) => b.xPts - a.xPts)
      .slice(0, 5),
    [players, fixtures, teams, currentGW]
  );

  // Most transferred in this GW
  const mostTransferredIn = useMemo(() =>
    [...players]
      .filter(p => p.transfers_in_event > 0)
      .sort((a, b) => b.transfers_in_event - a.transfers_in_event)
      .slice(0, 3),
    [players]
  );

  // Most transferred out this GW
  const mostTransferredOut = useMemo(() =>
    [...players]
      .filter(p => p.transfers_out_event > 0)
      .sort((a, b) => b.transfers_out_event - a.transfers_out_event)
      .slice(0, 3),
    [players]
  );

  // Quick stats
  const availablePlayers = useMemo(() => players.filter(p => isPlayerAvailable(p) && p.minutes > 0).length, [players]);

  // Deadline formatting
  const deadlineStr = useMemo(() => {
    if (!deadlineGW?.deadline_time) return null;
    try {
      const d = new Date(deadlineGW.deadline_time);
      const now = new Date();
      const diff = d.getTime() - now.getTime();
      if (diff < 0) return 'Passed';
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      if (days > 0) return `${days}d ${hours}h`;
      const mins = Math.floor((diff % 3600000) / 60000);
      return `${hours}h ${mins}m`;
    } catch { return null; }
  }, [deadlineGW]);

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      {loading ? <PageSkeleton /> : error ? (
        <ErrorState message={error} retry={refresh} />
      ) : (
        <>
          {/* ===== HEADER ===== */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">
                Gameweek {gwInfo?.id || '—'} • {gwInfo?.is_current ? 'In Progress' : 'Upcoming'}
                {deadlineStr && (
                  <span className="ml-2 font-mono text-[var(--accent)]">⏱ {deadlineStr} to deadline</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdated && (
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Link href="/optimizer" className="btn btn-primary text-xs">
                Optimize Team →
              </Link>
            </div>
          </div>

          {/* ===== STATS STRIP ===== */}
          <div className="card mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[var(--border)]">
              <div className="p-4">
                <div className="stat-value text-[var(--accent)] font-mono">{currentGW}</div>
                <div className="stat-label">Gameweek</div>
              </div>
              <div className="p-4">
                <div className="stat-value font-mono">{topPlayers[0]?.total_points || 0}</div>
                <div className="stat-label">Top Season Score</div>
              </div>
              <div className="p-4">
                <div className="stat-value font-mono text-[var(--success)]">{topForm[0]?.form || '0.0'}</div>
                <div className="stat-label">Best Form</div>
              </div>
              <div className="p-4">
                <div className="stat-value font-mono">{availablePlayers}</div>
                <div className="stat-label">Available Players</div>
              </div>
            </div>
          </div>

          {/* ===== CAPTAIN PICKS — HERO SECTION ===== */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                ★ Captain Picks — GW{currentGW}
              </h2>
            </div>

            {captainPicks.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* #1 Pick — Featured */}
                <Link
                  href={`/players/${captainPicks[0].id}`}
                  className="md:col-span-4 card border-l-[3px] border-l-[var(--accent)] p-5 hover:bg-[var(--bg-hover)] transition-colors group focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-[var(--accent)] text-white rounded-sm">
                      Top Pick
                    </span>
                    <span className={`label ${getPositionClass(captainPicks[0].element_type)}`}>
                      {getPositionLabel(captainPicks[0].element_type)}
                    </span>
                  </div>
                  <div className="font-bold text-lg group-hover:text-[var(--accent)] transition-colors">
                    {captainPicks[0].web_name}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {getTeamShort(teams, captainPicks[0].team)} • {formatPrice(captainPicks[0].now_cost)} • Form {captainPicks[0].form}
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="stat-value text-[var(--accent)]">{captainPicks[0].xPts.toFixed(1)}</div>
                      <div className="stat-label">Projected xPts</div>
                    </div>
                    <div className="flex gap-1">
                      {getUpcomingFixtures(fixtures, teams, captainPicks[0].team, currentGW, 4).map((f, i) => (
                        <span key={i} className={`fixture-badge ${getFDRClass(f.difficulty)}`}>
                          {f.opponent}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>

                {/* Runners up */}
                <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {captainPicks.slice(1).map((player, idx) => (
                    <Link
                      key={player.id}
                      href={`/players/${player.id}`}
                      className="card p-3 hover:bg-[var(--bg-hover)] transition-colors group focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="font-mono text-[10px] font-bold text-[var(--text-muted)]">#{idx + 2}</span>
                        <span className={`label text-[9px] ${getPositionClass(player.element_type)}`}>
                          {getPositionLabel(player.element_type)}
                        </span>
                      </div>
                      <div className="font-semibold text-sm group-hover:text-[var(--accent)] transition-colors truncate">
                        {player.web_name}
                      </div>
                      <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                        {getTeamShort(teams, player.team)} • {formatPrice(player.now_cost)}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-mono font-bold text-[var(--accent)] text-sm">{player.xPts.toFixed(1)}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">xPts</span>
                      </div>
                      <div className="flex gap-0.5 mt-2">
                        {getUpcomingFixtures(fixtures, teams, player.team, currentGW, 3).map((f, i) => (
                          <span key={i} className={`fixture-badge text-[9px] py-0 px-1 ${getFDRClass(f.difficulty)}`}>
                            {f.opponent}
                          </span>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ===== MIDDLE GRID: Differentials + Form + Transfers ===== */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {/* Differentials */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    ◆ Differentials
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] ml-2">&lt;10% owned</span>
                </div>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {differentials.map((player, idx) => (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs text-[var(--text-muted)] w-4 shrink-0">{idx + 1}</span>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{player.web_name}</div>
                        <div className="text-[11px] text-[var(--text-tertiary)]">
                          {getTeamShort(teams, player.team)} • {getPositionLabel(player.element_type)} • {formatPrice(player.now_cost)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="font-mono font-semibold text-[var(--accent)] text-sm">{player.xPts.toFixed(1)}</div>
                      <div className="text-[10px] font-mono text-[var(--text-muted)]">{player.ownership.toFixed(1)}%</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Hot Form */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c-2-2.67-4-4-4-6a4 4 0 1 1 8 0c0 2-2 3.33-4 6Z"/><path d="M12 21a8 8 0 0 0 4-15c0 4-2 6-4 8-2-2-4-4-4-8a8 8 0 0 0 4 15Z"/></svg>
                  Hot Form
                </span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {topForm.map((player, idx) => (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs text-[var(--text-muted)] w-4 shrink-0">{idx + 1}</span>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{player.web_name}</div>
                        <div className="text-[11px] text-[var(--text-tertiary)]">
                          {getTeamShort(teams, player.team)} • {getPositionLabel(player.element_type)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="font-mono font-bold text-[var(--success)] text-sm">{player.form}</span>
                      <div className="flex gap-0.5 mt-1 justify-end">
                        {getUpcomingFixtures(fixtures, teams, player.team, currentGW, 3).map((f, i) => (
                          <span key={i} className={`fixture-badge text-[9px] py-0 px-1 ${getFDRClass(f.difficulty)}`}>
                            {f.opponent}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Transfer Activity */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  ↗ Transfer Activity
                </span>
              </div>
              {/* In */}
              <div className="px-4 pt-2.5 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--success)]">Most Transferred In</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {mostTransferredIn.map((player) => (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}`}
                    className="flex items-center justify-between px-4 py-2 hover:bg-[var(--bg-hover)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px]"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{player.web_name}</div>
                      <div className="text-[11px] text-[var(--text-tertiary)]">
                        {getTeamShort(teams, player.team)} • {formatPrice(player.now_cost)}
                      </div>
                    </div>
                    <span className="font-mono text-sm font-semibold text-[var(--success)] shrink-0">
                      +{(player.transfers_in_event / 1000).toFixed(1)}k
                    </span>
                  </Link>
                ))}
              </div>
              {/* Out */}
              <div className="px-4 pt-2.5 pb-1 border-t border-[var(--border)]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--danger)]">Most Transferred Out</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {mostTransferredOut.map((player) => (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}`}
                    className="flex items-center justify-between px-4 py-2 hover:bg-[var(--bg-hover)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px]"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{player.web_name}</div>
                      <div className="text-[11px] text-[var(--text-tertiary)]">
                        {getTeamShort(teams, player.team)} • {formatPrice(player.now_cost)}
                      </div>
                    </div>
                    <span className="font-mono text-sm font-semibold text-[var(--danger)] shrink-0">
                      −{(player.transfers_out_event / 1000).toFixed(1)}k
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ===== TOP PLAYERS TABLE — FULL WIDTH ===== */}
          <div className="card overflow-hidden mb-6">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Top 10 Players — Season
              </span>
              <Link href="/players" className="text-xs text-[var(--accent)] font-medium hover:underline">
                View All →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <caption className="sr-only">Top 10 players by total points this season</caption>
                <thead>
                  <tr>
                    <th className="w-10">#</th>
                    <th>Player</th>
                    <th className="hidden sm:table-cell">Team</th>
                    <th>Pos</th>
                    <th className="text-right">Price</th>
                    <th className="text-right hidden sm:table-cell">Form</th>
                    <th className="text-right hidden md:table-cell">xPts</th>
                    <th className="text-right hidden md:table-cell">Sel%</th>
                    <th className="text-right">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {topPlayers.map((player, idx) => (
                    <tr key={player.id}>
                      <td>
                        <span className={`font-mono text-xs font-semibold ${
                          idx === 0 ? 'text-[#CA8A04]' :
                          idx === 1 ? 'text-[#71717A]' :
                          idx === 2 ? 'text-[#A16207]' : 'text-[var(--text-muted)]'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td>
                        <Link href={`/players/${player.id}`} className="font-semibold text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2">
                          {player.web_name}
                        </Link>
                        <span className="sm:hidden text-xs text-[var(--text-tertiary)] ml-1">
                          {getTeamShort(teams, player.team)}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell">
                        <span className="font-mono text-xs text-[var(--text-tertiary)]">
                          {getTeamShort(teams, player.team)}
                        </span>
                      </td>
                      <td>
                        <span className={`label ${getPositionClass(player.element_type)}`}>
                          {getPositionLabel(player.element_type)}
                        </span>
                      </td>
                      <td className="text-right font-mono">{formatPrice(player.now_cost)}</td>
                      <td className="text-right font-mono hidden sm:table-cell">{player.form}</td>
                      <td className="text-right hidden md:table-cell">
                        <span className="font-mono text-[var(--text-secondary)]">{player.xPts.toFixed(1)}</span>
                      </td>
                      <td className="text-right hidden md:table-cell">
                        <span className="font-mono text-xs text-[var(--text-tertiary)]">{player.selected_by_percent}%</span>
                      </td>
                      <td className="text-right">
                        <span className="font-mono font-semibold text-[var(--accent)]">
                          {player.total_points}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== BOTTOM ROW: Value + Quick Actions ===== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Best Value */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Best Value — Points per £M
                </span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {topValue.map((player, idx) => (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-[var(--text-muted)] w-4">{idx + 1}</span>
                      <div>
                        <div className="font-medium text-sm">{player.web_name}</div>
                        <div className="text-[11px] text-[var(--text-tertiary)]">
                          {formatPrice(player.now_cost)} • {player.total_points} pts • {getTeamShort(teams, player.team)}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-sm">{player.ppm.toFixed(2)}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick Actions + Info */}
            <div className="card p-5 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-4">
                  Quick Actions
                </div>
                <div className="space-y-2">
                  <Link href="/optimizer" className="btn btn-primary w-full">
                    Build Optimal Squad
                  </Link>
                  <Link href="/fixtures" className="btn btn-secondary w-full">
                    Fixture Difficulty Ratings
                  </Link>
                  <Link href="/live" className="btn btn-secondary w-full">
                    Live Gameweek Tracker
                  </Link>
                  <Link href="/players" className="btn btn-ghost w-full">
                    Full Player Database →
                  </Link>
                </div>
              </div>
              {deadlineGW && (
                <div className="mt-5 pt-4 border-t border-[var(--border)]">
                  <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Next Deadline</div>
                  <div className="font-mono text-sm text-[var(--text-primary)]">
                    {(() => {
                      try {
                        return new Date(deadlineGW.deadline_time).toLocaleDateString('en-GB', {
                          weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        });
                      } catch { return '—'; }
                    })()}
                  </div>
                  {deadlineStr && (
                    <div className="text-xs font-mono text-[var(--accent)] mt-1">{deadlineStr} remaining</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
