"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useFPL } from "@/lib/use-fpl-data";
import {
  getPositionLabel, getPositionClass, getTeamShort,
  getStatusBadge, getFDRClass, getCurrentGW, formatPrice,
  calcExpectedPoints, getUpcomingFixtures,
} from "@/lib/fpl-utils";
import {
  generateTransferSuggestions, analyzeSquad,
  type TransferContext, type SquadIssue,
} from "@/lib/optimizer-utils";
import { Player, FPLEntry, FPLPick, TransferSuggestion } from "@/types/fpl";
import { EmptyState } from "@/components/ErrorState";
import TeamIdInput from "@/components/optimizer/TeamIdInput";
import { useState } from "react";

interface TransferAdvisorProps {
  teamIdInput: string;
  setTeamIdInput: (val: string) => void;
  entryLoading: boolean;
  entryError: string | null;
  entry: FPLEntry | null;
  picks: FPLPick[];
  bank: number;
  freeTransfers: number;
  fetchTeamData: () => void;
}

export default function TransferAdvisor({
  teamIdInput, setTeamIdInput, entryLoading, entryError,
  entry, picks, bank, freeTransfers, fetchTeamData,
}: TransferAdvisorProps) {
  const { players, teams, fixtures, gameweeks } = useFPL();
  const currentGW = useMemo(() => getCurrentGW(gameweeks), [gameweeks]);

  const [transferSuggestions, setTransferSuggestions] = useState<TransferSuggestion[]>([]);
  const [squadIssues, setSquadIssues] = useState<SquadIssue[]>([]);

  // Generate transfer suggestions when team loaded
  useEffect(() => {
    if (picks.length === 0 || players.length === 0) return;
    const ctx: TransferContext = { players, teams, fixtures, gameweeks, picks, bank, freeTransfers };
    setTransferSuggestions(generateTransferSuggestions(ctx));
    setSquadIssues(analyzeSquad(picks, players, fixtures, teams, currentGW));
  }, [picks, players, teams, fixtures, gameweeks, bank, freeTransfers, currentGW]);

  // Owned players enriched for display
  const ownedPlayersEnriched = useMemo(() => {
    if (picks.length === 0 || players.length === 0) return [];
    return picks
      .sort((a, b) => a.position - b.position)
      .map(pick => {
        const player = players.find(p => p.id === pick.element);
        if (!player) return null;
        return {
          pick, player,
          teamName: getTeamShort(teams, player.team),
          xPts: calcExpectedPoints(player, fixtures, teams, currentGW),
          upcomingFixtures: getUpcomingFixtures(fixtures, teams, player.team, currentGW, 4),
        };
      })
      .filter(Boolean) as {
        pick: FPLPick; player: Player; teamName: string; xPts: number;
        upcomingFixtures: { opponent: string; difficulty: number; isHome: boolean; gw: number }[];
      }[];
  }, [picks, players, teams, fixtures, currentGW]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="space-y-4 lg:order-1 order-1">
        <TeamIdInput
          teamIdInput={teamIdInput}
          setTeamIdInput={setTeamIdInput}
          entryLoading={entryLoading}
          entryError={entryError}
          entry={entry}
          bank={bank}
          onLoad={fetchTeamData}
        />

        {/* Free transfers info */}
        {entry && picks.length > 0 && (
          <div className="card p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
              Transfer Budget
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="stat-value text-lg text-[var(--success)]">{freeTransfers}</div>
                <div className="stat-label">Free Transfers</div>
              </div>
              <div>
                <div className="stat-value text-lg">{formatPrice(bank)}</div>
                <div className="stat-label">In the Bank</div>
              </div>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-3">
              Each extra transfer costs -4 points
            </p>
          </div>
        )}

        {/* Squad Issues */}
        {squadIssues.length > 0 && (
          <div className="card">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Squad Alerts
              </span>
            </div>
            <div className="p-3 space-y-2">
              {squadIssues.map((issue, i) => (
                <div key={i} className={`flex items-start gap-2 p-2 rounded text-xs ${
                  issue.severity === 'high' ? 'bg-red-50 text-[var(--danger)]' :
                  issue.severity === 'medium' ? 'bg-orange-50 text-orange-800' :
                  'bg-gray-50 text-[var(--text-secondary)]'
                }`}>
                  <span className="text-sm flex-shrink-0">{issue.icon}</span>
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3 order-2 space-y-4">
        {picks.length === 0 ? (
          <EmptyState
            icon=""
            title="Enter your FPL Team ID"
            message="Load your team to get personalized transfer suggestions based on form, fixtures, and expected points"
          />
        ) : (
          <>
            {/* Current Squad */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Your Squad  GW{currentGW}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  Value: {formatPrice(entry?.last_deadline_value || 0)}
                </span>
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
                    {ownedPlayersEnriched.map(({ pick, player, teamName, xPts, upcomingFixtures }) => {
                      const status = getStatusBadge(player);
                      const isBench = pick.position > 11;
                      return (
                        <tr key={player.id} className={isBench ? 'opacity-60' : ''}>
                          <td>
                            <div className="flex items-center gap-2">
                              {pick.is_captain && <span className="text-[10px] font-bold text-[var(--accent)]" title="Captain">C</span>}
                              {pick.is_vice_captain && <span className="text-[10px] font-bold text-[var(--text-muted)]" title="Vice Captain">V</span>}
                              <Link href={`/players/${player.id}`} className="font-semibold text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
                                {player.web_name}
                              </Link>
                              {status && <span className={`label ${status.className}`}>{status.text}</span>}
                              {isBench && <span className="label text-[10px]">B{pick.position - 11}</span>}
                            </div>
                          </td>
                          <td className="font-mono text-xs text-[var(--text-tertiary)] hidden sm:table-cell">{teamName}</td>
                          <td><span className={`label ${getPositionClass(player.element_type)}`}>{getPositionLabel(player.element_type)}</span></td>
                          <td className="text-right font-mono">{formatPrice(player.now_cost)}</td>
                          <td className="text-right font-mono font-semibold">{player.total_points}</td>
                          <td className="text-right font-mono text-[var(--accent)] hidden sm:table-cell">{xPts.toFixed(1)}</td>
                          <td className="text-right font-mono hidden sm:table-cell">{player.form}</td>
                          <td className="hidden md:table-cell">
                            <div className="flex gap-1">
                              {upcomingFixtures.slice(0, 4).map((f, i) => (
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

            {/* Transfer Suggestions */}
            {transferSuggestions.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Suggested Transfers
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    {freeTransfers} free transfer{freeTransfers !== 1 ? 's' : ''} available
                  </span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {transferSuggestions.map((suggestion, i) => (
                    <div key={i} className="p-4 hover:bg-[var(--bg-hover)] transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`label text-[10px] ${
                          suggestion.priority === 'urgent' ? 'label-danger' :
                          suggestion.priority === 'recommended' ? 'label-warning' :
                          'label-accent'
                        }`}>
                          {suggestion.priority === 'urgent' ? '⚠ URGENT' :
                           suggestion.priority === 'recommended' ? 'RECOMMENDED' : 'OPTIONAL'}
                        </span>
                        {suggestion.hitCost > 0 && (
                          <span className="label label-danger text-[10px]">
                            -{suggestion.hitCost} pt hit
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* OUT */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="label label-danger text-[10px]">OUT</span>
                          <Link href={`/players/${suggestion.playerOut.id}`} className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] hover:underline truncate">
                            {suggestion.playerOut.web_name}
                          </Link>
                          <span className={`label ${getPositionClass(suggestion.playerOut.element_type)}`}>
                            {getPositionLabel(suggestion.playerOut.element_type)}
                          </span>
                          <span className="font-mono text-xs text-[var(--text-muted)]">{formatPrice(suggestion.playerOut.now_cost)}</span>
                        </div>
                        <span className="text-[var(--text-muted)] hidden sm:block">→</span>
                        {/* IN */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="label label-success text-[10px]">IN</span>
                          <Link href={`/players/${suggestion.playerIn.id}`} className="font-semibold text-[var(--accent)] hover:underline truncate">
                            {suggestion.playerIn.web_name}
                          </Link>
                          <span className={`label ${getPositionClass(suggestion.playerIn.element_type)}`}>
                            {getPositionLabel(suggestion.playerIn.element_type)}
                          </span>
                          <span className="font-mono text-xs text-[var(--text-muted)]">{formatPrice(suggestion.playerIn.now_cost)}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="font-mono text-sm font-bold text-[var(--success)]">
                            +{suggestion.xPtsGain.toFixed(1)} xPts
                          </span>
                          {suggestion.hitCost > 0 && (
                            <span className="font-mono text-xs text-[var(--text-muted)]">
                              net {suggestion.netGain > 0 ? '+' : ''}{suggestion.netGain.toFixed(1)}
                            </span>
                          )}
                          {suggestion.costDelta !== 0 && (
                            <span className={`font-mono text-xs ${suggestion.costDelta > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
                              {suggestion.costDelta > 0 ? '+' : ''}{formatPrice(suggestion.costDelta)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1.5">{suggestion.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {picks.length > 0 && transferSuggestions.length === 0 && (
              <div className="card p-8 text-center">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">Squad looks solid!</div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  No urgent transfers needed. Save your free transfer{freeTransfers > 1 ? 's' : ''} to roll {freeTransfers > 1 ? 'them' : 'it'} for next week (max 5).
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
