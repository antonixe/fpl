"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFPL } from "@/lib/use-fpl-data";
import {
  getPositionLabel, getPositionClass, getTeamShort,
  getStatusBadge, getFDRClass, getCurrentGW, formatPrice,
  calcExpectedPoints, getUpcomingFixtures,
} from "@/lib/fpl-utils";
import { generateChipRecommendations, type ChipContext } from "@/lib/optimizer-utils";
import { FPLEntry, FPLPick, ChipRecommendation, Player } from "@/types/fpl";
import { EmptyState } from "@/components/ErrorState";
import TeamIdInput from "@/components/optimizer/TeamIdInput";

interface ChipAdvisorProps {
  teamIdInput: string;
  setTeamIdInput: (val: string) => void;
  entryLoading: boolean;
  entryError: string | null;
  entry: FPLEntry | null;
  picks: FPLPick[];
  bank: number;
  chipsPlayed: { name: string; event: number }[];
  fetchTeamData: () => void;
}

export default function ChipAdvisor({
  teamIdInput, setTeamIdInput, entryLoading, entryError,
  entry, picks, bank, chipsPlayed, fetchTeamData,
}: ChipAdvisorProps) {
  const { players, teams, fixtures, gameweeks } = useFPL();
  const currentGW = useMemo(() => getCurrentGW(gameweeks), [gameweeks]);

  const [chipRecommendations, setChipRecommendations] = useState<ChipRecommendation[]>([]);

  useEffect(() => {
    if (picks.length === 0 || players.length === 0) return;
    const ctx: ChipContext = { players, teams, fixtures, gameweeks, picks, chipsPlayed, currentGW };
    setChipRecommendations(generateChipRecommendations(ctx));
  }, [picks, players, teams, fixtures, gameweeks, chipsPlayed, currentGW]);

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
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3 order-2 space-y-4">
        {picks.length === 0 ? (
          <EmptyState
            icon=""
            title="Enter your FPL Team ID"
            message="Load your team to get chip recommendations based on your squad, fixtures, and bench strength"
          />
        ) : (
          <>
            {/* Chip Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {chipRecommendations.map(rec => (
                <div key={rec.chip} className={`card overflow-hidden ${!rec.available ? 'opacity-50' : ''}`}>
                  <div className={`h-1 ${
                    !rec.available ? 'bg-gray-300' :
                    rec.verdict === 'strong' ? 'bg-[var(--success)]' :
                    rec.verdict === 'moderate' ? 'bg-[var(--accent)]' :
                    'bg-gray-300'
                  }`} />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">{rec.label}</h3>
                      {rec.available ? (
                        <div className={`font-mono text-lg font-bold ${
                          rec.verdict === 'strong' ? 'text-[var(--success)]' :
                          rec.verdict === 'moderate' ? 'text-[var(--accent)]' :
                          'text-[var(--text-muted)]'
                        }`}>
                          {rec.score}
                        </div>
                      ) : (
                        <span className="label label-danger text-[10px]">USED</span>
                      )}
                    </div>

                    {rec.available && (
                      <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1.5 mb-3">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            rec.verdict === 'strong' ? 'bg-[var(--success)]' :
                            rec.verdict === 'moderate' ? 'bg-[var(--accent)]' :
                            'bg-gray-400'
                          }`}
                          style={{ width: `${rec.score}%` }}
                        />
                      </div>
                    )}

                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{rec.reason}</p>

                    {rec.available && rec.bestGW && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="label label-accent text-[10px]">BEST: GW{rec.bestGW}</span>
                        {rec.bestGW === currentGW && (
                          <span className="label label-success text-[10px]">THIS WEEK</span>
                        )}
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-[var(--border)]">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${
                        !rec.available ? 'text-[var(--text-muted)]' :
                        rec.verdict === 'strong' && rec.bestGW === currentGW ? 'text-[var(--success)]' :
                        rec.verdict === 'strong' ? 'text-[var(--accent)]' :
                        rec.verdict === 'moderate' ? 'text-[var(--accent)]' :
                        'text-[var(--text-muted)]'
                      }`}>
                        {!rec.available ? 'Unavailable' :
                         rec.verdict === 'strong' && rec.bestGW === currentGW ? 'Play this week!' :
                         rec.verdict === 'strong' ? `Save for GW${rec.bestGW}` :
                         rec.verdict === 'moderate' ? `Consider for GW${rec.bestGW}` :
                         'Save for later'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Chip usage timeline */}
            {chipsPlayed.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Chips Used This Season
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-3">
                    {chipsPlayed.map((chip, i) => (
                      <div key={i} className="flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded">
                        <span className="font-mono text-xs font-semibold text-[var(--text-secondary)]">GW{chip.event}</span>
                        <span className="text-xs text-[var(--text-primary)]">
                          {chip.name === 'wildcard' ? 'Wildcard' :
                           chip.name === 'freehit' ? 'Free Hit' :
                           chip.name === 'bboost' ? 'Bench Boost' :
                           chip.name === '3xc' ? 'Triple Captain' : chip.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bench for BB analysis */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Your Bench (for Bench Boost analysis)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="w-10">#</th>
                      <th>Player</th>
                      <th className="hidden sm:table-cell">Team</th>
                      <th>Pos</th>
                      <th className="text-right">xPts</th>
                      <th className="text-right">Form</th>
                      <th className="hidden md:table-cell">Fixture</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownedPlayersEnriched
                      .filter(p => p.pick.position > 11)
                      .map(({ pick, player, teamName, xPts, upcomingFixtures }) => {
                        const status = getStatusBadge(player);
                        return (
                          <tr key={player.id}>
                            <td className="font-mono text-xs text-[var(--text-muted)]">B{pick.position - 11}</td>
                            <td>
                              <div className="flex items-center gap-2">
                                <Link href={`/players/${player.id}`} className="font-semibold text-[var(--accent)] hover:underline">
                                  {player.web_name}
                                </Link>
                                {status && <span className={`label ${status.className}`}>{status.text}</span>}
                              </div>
                            </td>
                            <td className="font-mono text-xs text-[var(--text-tertiary)] hidden sm:table-cell">{teamName}</td>
                            <td><span className={`label ${getPositionClass(player.element_type)}`}>{getPositionLabel(player.element_type)}</span></td>
                            <td className="text-right font-mono text-[var(--accent)]">{xPts.toFixed(1)}</td>
                            <td className="text-right font-mono">{player.form}</td>
                            <td className="hidden md:table-cell">
                              <div className="flex gap-1">
                                {upcomingFixtures.slice(0, 2).map((f, i) => (
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
          </>
        )}
      </div>
    </div>
  );
}
