"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useFPLData, useFPLStatus } from "@/lib/use-fpl-data";
import {
  getPositionLabel, getPositionClass, getTeamShort, getTeamName,
  getStatusBadge, getFDRClass, getCurrentGW, formatPrice,
  calcExpectedPoints, getUpcomingFixtures, calcPPM, isPlayerAvailable,
  getPlayerImageUrl,
} from "@/lib/fpl-utils";
import { PlayerHistory } from "@/types/fpl";
import { CardSkeleton, StatsSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import {
  LazyAreaChart as AreaChart,
  LazyBarChart as BarChart,
  LazyResponsiveContainer as ResponsiveContainer,
  Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine,
} from "@/components/LazyCharts";
import type { PlayerDetailData } from "@/lib/fpl-server";

interface PlayerDetail {
  history: PlayerHistory[];
  fixtures: Array<{
    event: number;
    is_home: boolean;
    difficulty: number;
    team_h: number;
    team_a: number;
  }>;
}

interface PlayerDetailClientProps {
  playerId: number;
  initialDetail?: PlayerDetailData | null;
}

export default function PlayerDetailClient({ playerId, initialDetail }: PlayerDetailClientProps) {
  const router = useRouter();
  const validId = !isNaN(playerId) && playerId > 0;
  const { players, teams, fixtures, gameweeks, elementTypes } = useFPLData();
  const { loading: dataLoading, error: dataError } = useFPLStatus();

  // Data is available immediately from SSR hydration — only truly "loading" if empty
  const hasData = players.length > 0;

  const [detail, setDetail] = useState<PlayerDetail | null>(
    initialDetail ? (initialDetail as unknown as PlayerDetail) : null
  );
  const [detailLoading, setDetailLoading] = useState(!initialDetail);
  const [detailError, setDetailError] = useState<string | null>(null);

  const player = useMemo(() => players.find(p => p.id === playerId), [players, playerId]);
  const currentGW = useMemo(() => getCurrentGW(gameweeks), [gameweeks]);

  useEffect(() => {
    // Skip client fetch if we already have server-provided data
    if (initialDetail) return;
    if (!validId) {
      setDetailError('Invalid player ID');
      setDetailLoading(false);
      return;
    }
    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError(null);
    fetch(`/api/player/${playerId}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('Player not found');
        return res.json();
      })
      .then((data: PlayerDetail) => {
        setDetail(data);
        setDetailLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setDetailError(err.message);
        setDetailLoading(false);
      });
    return () => controller.abort();
  }, [playerId, validId]);

  const status = player ? getStatusBadge(player) : null;
  const xPts = player ? calcExpectedPoints(player, fixtures, teams, currentGW) : 0;
  const ppm = player ? calcPPM(player) : 0;
  const upcoming = player ? getUpcomingFixtures(fixtures, teams, player.team, currentGW, 6) : [];
  const teamName = player ? getTeamName(teams, player.team) : '';

  // Chart data — memoized to avoid recomputing on every render
  const historyData = useMemo(() => (detail?.history || []).map(h => ({
    gw: `GW${h.round}`,
    points: h.total_points,
    minutes: h.minutes,
    bps: h.bps,
    goals: h.goals_scored,
    assists: h.assists,
    cs: h.clean_sheets,
  })), [detail]);

  // Cumulative points
  const cumulativeData = useMemo(() => {
    let cumPts = 0;
    return historyData.map(h => {
      cumPts += h.points;
      return { ...h, cumulative: cumPts };
    });
  }, [historyData]);

  // Moving average (last 5 GWs)
  const movingAvg = useMemo(() => historyData.map((h, i) => {
    const window = historyData.slice(Math.max(0, i - 4), i + 1);
    const avg = window.reduce((s, w) => s + w.points, 0) / window.length;
    return { ...h, avg: Math.round(avg * 10) / 10 };
  }), [historyData]);

  // Stats breakdown
  const totalGWs = detail?.history.length || 0;
  const avgPoints = totalGWs > 0 && player ? (player.total_points / totalGWs).toFixed(1) : '0.0';
  const maxPoints = totalGWs > 0 ? Math.max(...(detail?.history || []).map(h => h.total_points)) : 0;
  const blanks = detail?.history.filter(h => h.total_points <= 2).length || 0;
  const returns = detail?.history.filter(h => h.total_points >= 5).length || 0;

  if (!hasData && dataLoading) {
    return (
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <StatsSkeleton count={4} />
        <div className="mt-6"><CardSkeleton rows={8} /></div>
      </main>
    );
  }

  if (!hasData && (dataError || detailError)) {
    return (
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <ErrorState message={detailError || dataError || 'Player not found'} />
      </main>
    );
  }

  if (!player) {
    return (
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <ErrorState message="Player not found" />
      </main>
    );
  }

  return (
    <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        {/* Back */}
        <button onClick={() => router.back()} className="btn btn-ghost text-xs mb-4">
          ← Back
        </button>

        {/* Player Header */}
        <div className="card p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Player Photo */}
              <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded overflow-hidden bg-[var(--bg-hover)] relative">
                <Image
                  src={getPlayerImageUrl(player, '110x140')}
                  alt={`${player.first_name} ${player.second_name}`}
                  fill
                  className="object-cover object-top"
                  sizes="(min-width: 640px) 96px, 80px"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>

              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                    {player.first_name} {player.second_name}
                  </h1>
                  {status && <span className={`label ${status.className}`}>{status.text}</span>}
                </div>
                <div className="flex items-center gap-3 text-sm text-[var(--text-tertiary)]">
                  <span>{teamName}</span>
                  <span>•</span>
                  <span className={`label ${getPositionClass(player.element_type)}`}>
                    {getPositionLabel(player.element_type)}
                  </span>
                  <span>•</span>
                  <span className="font-mono">{formatPrice(player.now_cost)}</span>
                </div>
                {player.news && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-2 max-w-md">{player.news}</p>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="stat-value text-[var(--accent)]">{player.total_points}</div>
              <div className="stat-label">Total Points</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="card mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-x divide-y sm:divide-y-0 divide-[var(--border)]">
            {[
              { label: 'Form', value: player.form, color: parseFloat(player.form) >= 5 ? 'text-[var(--success)]' : '' },
              { label: 'xPts', value: xPts.toFixed(1), color: 'text-[var(--accent)]' },
              { label: 'PPM', value: ppm.toFixed(2) },
              { label: 'PPG', value: avgPoints },
              { label: 'Best GW', value: maxPoints },
              { label: 'Returns', value: `${returns}/${totalGWs}`, color: 'text-[var(--success)]' },
              { label: 'Blanks', value: `${blanks}/${totalGWs}`, color: blanks > totalGWs / 2 ? 'text-[var(--danger)]' : '' },
              { label: 'Own%', value: `${player.selected_by_percent}%` },
            ].map(stat => (
              <div key={stat.label} className="p-3 text-center">
                <div className={`font-mono font-semibold text-lg ${stat.color || ''}`}>{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts + Detail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Points Per GW */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Points Per Gameweek
              </span>
            </div>
            <div className="p-4" style={{ height: 250 }} role="img" aria-label={`Bar chart showing points scored per gameweek for ${player.web_name}`}>
              {historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historyData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="gw" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 12,
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                    <ReferenceLine y={parseFloat(avgPoints)} stroke="var(--text-muted)" strokeDasharray="3 3" label={{ value: 'Avg', fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Bar dataKey="points" fill="var(--accent)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-[var(--text-muted)]">No history data</div>
              )}
            </div>
          </div>

          {/* Cumulative Points */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Cumulative Points
              </span>
            </div>
            <div className="p-4" style={{ height: 250 }} role="img" aria-label={`Area chart showing cumulative points over time for ${player.web_name}`}>
              {cumulativeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativeData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="gw" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 12,
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="var(--accent)"
                      fill="var(--accent-light)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-[var(--text-muted)]">No history data</div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom section: Key stats + Upcoming fixtures */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Season Stats */}
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Season Statistics
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-[var(--border)]">
              {[
                { label: 'Minutes', value: player.minutes.toLocaleString() },
                { label: 'Goals', value: player.goals_scored },
                { label: 'Assists', value: player.assists },
                { label: 'Clean Sheets', value: player.clean_sheets },
                { label: 'Goals Conceded', value: player.goals_conceded },
                { label: 'Bonus', value: player.bonus },
                { label: 'BPS', value: player.bps },
                { label: 'ICT Index', value: player.ict_index },
                { label: 'Influence', value: player.influence },
                { label: 'Creativity', value: player.creativity },
                { label: 'Threat', value: player.threat },
                { label: 'Transfers In', value: player.transfers_in.toLocaleString() },
                { label: 'Transfers Out', value: player.transfers_out.toLocaleString() },
                { label: 'GW Transfers In', value: player.transfers_in_event.toLocaleString() },
                { label: 'GW Transfers Out', value: player.transfers_out_event.toLocaleString() },
                { label: 'Price Change', value: (player.cost_change_start >= 0 ? '+' : '') + formatPrice(player.cost_change_start) },
                { label: 'Value (Form)', value: player.value_form },
                { label: 'Value (Season)', value: player.value_season },
              ].map(stat => (
                <div key={stat.label} className="p-3">
                  <div className="font-mono font-semibold text-sm">{stat.value}</div>
                  <div className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Fixtures */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Upcoming Fixtures
              </span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {upcoming.length > 0 ? upcoming.map((f, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[var(--text-muted)] w-8">GW{f.gw}</span>
                    <span className={`fixture-badge ${getFDRClass(f.difficulty)}`}>
                      {f.opponent}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)]">{f.isHome ? 'Home' : 'Away'}</span>
                </div>
              )) : (
                <div className="text-center py-8 text-sm text-[var(--text-muted)]">No upcoming fixtures</div>
              )}
            </div>
          </div>
        </div>

        {/* GW by GW History Table */}
        {detail && detail.history.length > 0 && (
          <div className="card overflow-hidden mt-6">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Gameweek History
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>GW</th>
                    <th>Opp</th>
                    <th className="text-right">Min</th>
                    <th className="text-right">G</th>
                    <th className="text-right">A</th>
                    <th className="text-right hidden sm:table-cell">CS</th>
                    <th className="text-right hidden sm:table-cell">Bonus</th>
                    <th className="text-right hidden md:table-cell">BPS</th>
                    <th className="text-right font-semibold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {[...detail.history].reverse().map(h => (
                    <tr key={h.round}>
                      <td className="font-mono text-xs">{h.round}</td>
                      <td>
                        <span className="font-mono text-xs">
                          {getTeamShort(teams, h.opponent_team)}
                          <span className="text-[var(--text-muted)] ml-0.5">
                            {h.was_home ? '(H)' : '(A)'}
                          </span>
                        </span>
                      </td>
                      <td className="text-right font-mono text-xs">{h.minutes}</td>
                      <td className="text-right font-mono text-xs">{h.goals_scored || '—'}</td>
                      <td className="text-right font-mono text-xs">{h.assists || '—'}</td>
                      <td className="text-right font-mono text-xs hidden sm:table-cell">{h.clean_sheets || '—'}</td>
                      <td className="text-right font-mono text-xs hidden sm:table-cell">{h.bonus || '—'}</td>
                      <td className="text-right font-mono text-xs hidden md:table-cell">{h.bps}</td>
                      <td className="text-right">
                        <span className={`font-mono font-semibold ${
                          h.total_points >= 8 ? 'text-[var(--success)]' :
                          h.total_points <= 1 ? 'text-[var(--danger)]' :
                          h.total_points >= 5 ? 'text-[var(--accent)]' : ''
                        }`}>
                          {h.total_points}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
  );
}
