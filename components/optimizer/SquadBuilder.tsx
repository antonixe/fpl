"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useFPL } from "@/lib/use-fpl-data";
import {
  getPositionLabel, getPositionClass,
  getStatusBadge, getFDRClass, getCurrentGW, formatPrice,
} from "@/lib/fpl-utils";
import { EmptyState } from "@/components/ErrorState";
import { useSquadWorker, type ScoredPlayer } from "@/lib/use-squad-worker";

type Formation = '3-4-3' | '3-5-2' | '4-3-3' | '4-4-2' | '4-5-1' | '5-3-2' | '5-4-1';

const FORMATIONS: Record<Formation, { def: number; mid: number; fwd: number }> = {
  '3-4-3': { def: 3, mid: 4, fwd: 3 },
  '3-5-2': { def: 3, mid: 5, fwd: 2 },
  '4-3-3': { def: 4, mid: 3, fwd: 3 },
  '4-4-2': { def: 4, mid: 4, fwd: 2 },
  '4-5-1': { def: 4, mid: 5, fwd: 1 },
  '5-3-2': { def: 5, mid: 3, fwd: 2 },
  '5-4-1': { def: 5, mid: 4, fwd: 1 },
};

export default function SquadBuilder() {
  const { players, teams, fixtures, gameweeks } = useFPL();
  const currentGW = useMemo(() => getCurrentGW(gameweeks), [gameweeks]);

  const [budget, setBudget] = useState(100);
  const [strategy, setStrategy] = useState<'balanced' | 'attack' | 'defense' | 'form' | 'xPts'>('balanced');
  const [formation, setFormation] = useState<Formation>('4-4-2');
  const [generating, setGenerating] = useState(false);
  const [startingXI, setStartingXI] = useState<ScoredPlayer[]>([]);
  const [bench, setBench] = useState<ScoredPlayer[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [builderContext, setBuilderContext] = useState<'regular' | 'wildcard' | 'freehit'>('regular');

  const generate = useSquadWorker(
    useCallback((result) => {
      setStartingXI(result.startingXI);
      setBench(result.bench);
      setTotalCost(result.totalCost);
      setTotalPoints(result.totalPoints);
      setGenerating(false);
    }, []),
    useCallback(() => {
      setGenerating(false);
    }, []),
  );

  const handleGenerate = useCallback(() => {
    setGenerating(true);
    generate({
      players: players.map(p => ({
        id: p.id, web_name: p.web_name, element_type: p.element_type, team: p.team,
        now_cost: p.now_cost, total_points: p.total_points, goals_scored: p.goals_scored,
        assists: p.assists, clean_sheets: p.clean_sheets, form: p.form, status: p.status,
        chance_of_playing_next_round: p.chance_of_playing_next_round, minutes: p.minutes,
      })),
      teams: teams.map(t => ({ id: t.id, short_name: t.short_name })),
      fixtures: fixtures.map(f => ({
        event: f.event, finished: f.finished, team_h: f.team_h, team_a: f.team_a,
        team_h_difficulty: f.team_h_difficulty, team_a_difficulty: f.team_a_difficulty,
      })),
      currentGW, budget, strategy, formation, builderContext,
    });
  }, [generate, players, teams, fixtures, currentGW, budget, strategy, formation, builderContext]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Settings Panel */}
      <div className="space-y-4 lg:order-1 order-1">
        <div className="card">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Settings
            </span>
          </div>
          <div className="p-4 space-y-4">
            {/* Context */}
            <div>
              <label className="text-xs font-medium text-[var(--text-tertiary)] block mb-1.5">Building For</label>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { id: 'regular' as const, label: 'GW1' },
                  { id: 'wildcard' as const, label: 'Wildcard' },
                  { id: 'freehit' as const, label: 'Free Hit' },
                ]).map(ctx => (
                  <button
                    key={ctx.id}
                    onClick={() => { setBuilderContext(ctx.id); if (ctx.id === 'regular') setBudget(100); }}
                    className={`px-2 py-1.5 text-xs font-medium border transition-colors ${
                      builderContext === ctx.id
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                        : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {ctx.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div>
              <label htmlFor="budget-input" className="text-xs font-medium text-[var(--text-tertiary)] block mb-1.5">
                Budget
                {builderContext === 'regular' && <span className="text-[var(--text-muted)]"> (fixed at 100.0m)</span>}
              </label>
              {builderContext === 'regular' ? (
                <div className="input font-mono bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed">100.0m</div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    id="budget-input"
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(Math.min(100, Math.max(63, Number(e.target.value))))}
                    min="63" max="100" step="0.5"
                    className="input font-mono"
                  />
                  <span className="text-sm text-[var(--text-muted)]">m</span>
                </div>
              )}
            </div>

            {/* Formation */}
            <div>
              <label className="text-xs font-medium text-[var(--text-tertiary)] block mb-1.5">Formation</label>
              <div className="grid grid-cols-4 gap-1">
                {(Object.keys(FORMATIONS) as Formation[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFormation(f)}
                    className={`px-2 py-1.5 text-xs font-mono font-medium border transition-colors ${
                      formation === f
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                        : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Strategy */}
            <div>
              <label htmlFor="strategy-select" className="text-xs font-medium text-[var(--text-tertiary)] block mb-1.5">Strategy</label>
              <select
                id="strategy-select"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as typeof strategy)}
                className="input select"
              >
                <option value="balanced">Balanced</option>
                <option value="xPts">Expected Points (xPts)</option>
                <option value="attack">Attack Focused</option>
                <option value="defense">Defense Focused</option>
                <option value="form">Form Based</option>
              </select>
            </div>

            <button onClick={handleGenerate} disabled={generating} className="btn btn-primary w-full">
              {generating ? 'Generating...' : 'Generate Team'}
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        {startingXI.length > 0 && (
          <div className="card">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Summary</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
              <div className="p-3 text-center">
                <div className="stat-value text-[var(--accent)]">{totalPoints}</div>
                <div className="stat-label">Points</div>
              </div>
              <div className="p-3 text-center">
                <div className="stat-value">{formatPrice(totalCost)}</div>
                <div className="stat-label">Cost</div>
              </div>
              <div className="p-3 text-center border-t border-[var(--border)]">
                <div className={`stat-value ${(builderContext === 'regular' ? 100 : budget) * 10 - totalCost >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  {formatPrice((builderContext === 'regular' ? 100 : budget) * 10 - totalCost)}
                </div>
                <div className="stat-label">ITB</div>
              </div>
              <div className="p-3 text-center border-t border-[var(--border)]">
                <div className="stat-value">{totalCost > 0 ? (totalPoints / (totalCost / 10)).toFixed(1) : ''}</div>
                <div className="stat-label">PPM</div>
              </div>
            </div>
          </div>
        )}

        {/* Rules */}
        <div className="card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Squad Rules</div>
          <ul className="text-xs text-[var(--text-secondary)] space-y-1">
            <li> Max 3 players per team</li>
            <li> 2 GK, 5 DEF, 5 MID, 3 FWD</li>
            <li> Formation: {formation}</li>
            <li> Mode: {builderContext === 'regular' ? 'Season Start (100m)' : builderContext === 'wildcard' ? 'Wildcard' : 'Free Hit'}</li>
          </ul>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3 order-2">
        {startingXI.length === 0 ? (
          <EmptyState icon="" title="No team generated" message="Configure settings and click Generate Team to build your optimal squad" />
        ) : (
          <div className="space-y-4">
            {/* Starting XI */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Starting XI</span>
                <span className="font-mono text-xs text-[var(--accent)]">{formation}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th className="hidden sm:table-cell">Team</th>
                      <th>Pos</th>
                      <th className="text-right">Price</th>
                      <th className="text-right">Pts</th>
                      <th className="text-right hidden sm:table-cell">xPts</th>
                      <th className="text-right hidden sm:table-cell">Form</th>
                      <th className="hidden md:table-cell">Fixtures</th>
                    </tr>
                  </thead>
                  <tbody>
                    {startingXI.map(player => {
                      const status = getStatusBadge(player as any);
                      return (
                        <tr key={player.id}>
                          <td>
                            <div className="flex items-center gap-2">
                              <Link href={`/players/${player.id}`} className="font-semibold text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">{player.web_name}</Link>
                              {status && <span className={`label ${status.className}`}>{status.text}</span>}
                            </div>
                          </td>
                          <td className="font-mono text-xs text-[var(--text-tertiary)] hidden sm:table-cell">{player.teamName}</td>
                          <td><span className={`label ${getPositionClass(player.element_type)}`}>{getPositionLabel(player.element_type)}</span></td>
                          <td className="text-right font-mono">{formatPrice(player.now_cost)}</td>
                          <td className="text-right font-mono font-semibold">{player.total_points}</td>
                          <td className="text-right font-mono text-[var(--accent)] hidden sm:table-cell">{player.xPts.toFixed(1)}</td>
                          <td className="text-right font-mono hidden sm:table-cell">{player.form}</td>
                          <td className="hidden md:table-cell">
                            <div className="flex gap-1">
                              {player.upcomingFixtures?.slice(0, 4).map((f, i) => (
                                <span key={i} className={`fixture-badge ${getFDRClass(f.difficulty)}`}>{f.opponent}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bench */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Bench</span>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="w-10">#</th>
                      <th>Player</th>
                      <th className="hidden sm:table-cell">Team</th>
                      <th>Pos</th>
                      <th className="text-right">Price</th>
                      <th className="text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bench.map((player, idx) => (
                      <tr key={player.id}>
                        <td className="font-mono text-xs text-[var(--text-muted)]">B{idx + 1}</td>
                        <td><Link href={`/players/${player.id}`} className="font-medium text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">{player.web_name}</Link></td>
                        <td className="font-mono text-xs text-[var(--text-tertiary)] hidden sm:table-cell">{player.teamName}</td>
                        <td><span className={`label ${getPositionClass(player.element_type)}`}>{getPositionLabel(player.element_type)}</span></td>
                        <td className="text-right font-mono">{formatPrice(player.now_cost)}</td>
                        <td className="text-right font-mono">{player.total_points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
