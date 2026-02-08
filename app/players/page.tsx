"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFPL } from "@/lib/use-fpl-data";
import {
  getPositionLabel, getPositionClass, getTeamShort,
  getStatusBadge, calcPPM, getCurrentGW, calcExpectedPoints, formatPrice,
} from "@/lib/fpl-utils";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { LiveRegion } from "@/components/LiveRegion";
import { Player } from "@/types/fpl";

type SortKey = 'total_points' | 'now_cost' | 'form' | 'selected_by_percent' | 'ppm' | 'xPts';
const PAGE_SIZE = 50;

// Extracted outside the component to avoid creating a new identity on every render
function SortHeader({ label, sortKey, className = '', currentSort, currentDir, onSort }: {
  label: string; sortKey: SortKey; className?: string;
  currentSort: SortKey; currentDir: 'asc' | 'desc'; onSort: (key: SortKey) => void;
}) {
  return (
    <th
      className={`cursor-pointer hover:text-[var(--text-primary)] select-none ${className}`}
      onClick={() => onSort(sortKey)}
      role="columnheader"
      aria-sort={currentSort === sortKey ? (currentDir === 'desc' ? 'descending' : 'ascending') : 'none'}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSort(sortKey); } }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {currentSort === sortKey && (
          <span className="text-[var(--accent)]">{currentDir === 'desc' ? '↓' : '↑'}</span>
        )}
      </span>
    </th>
  );
}

export default function PlayersPage() {
  const { players, teams, fixtures, gameweeks, loading, error, refresh } = useFPL();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<number>(0);
  const [teamFilter, setTeamFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortKey>('total_points');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  const currentGW = useMemo(() => getCurrentGW(gameweeks), [gameweeks]);
  const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.name.localeCompare(b.name)), [teams]);

  const enriched = useMemo(() =>
    players
      .filter(p => p.minutes > 0)
      .map(p => ({
        ...p,
        ppm: calcPPM(p),
        xPts: calcExpectedPoints(p, fixtures, teams, currentGW),
      })),
    [players, fixtures, teams, currentGW]
  );

  const filteredPlayers = useMemo(() => {
    let result = enriched;

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(p =>
        p.web_name.toLowerCase().includes(s) ||
        p.first_name.toLowerCase().includes(s) ||
        p.second_name.toLowerCase().includes(s)
      );
    }
    if (posFilter > 0) result = result.filter(p => p.element_type === posFilter);
    if (teamFilter > 0) result = result.filter(p => p.team === teamFilter);

    result.sort((a, b) => {
      let aVal: number, bVal: number;
      if (sortBy === 'ppm') { aVal = a.ppm; bVal = b.ppm; }
      else if (sortBy === 'xPts') { aVal = a.xPts; bVal = b.xPts; }
      else if (sortBy === 'form' || sortBy === 'selected_by_percent') {
        aVal = parseFloat(String(a[sortBy])) || 0;
        bVal = parseFloat(String(b[sortBy])) || 0;
      } else {
        aVal = a[sortBy] as number;
        bVal = b[sortBy] as number;
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return result;
  }, [enriched, search, posFilter, teamFilter, sortBy, sortDir]);

  const totalPages = Math.ceil(filteredPlayers.length / PAGE_SIZE);
  const pageSlice = filteredPlayers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(key); setSortDir('desc'); }
    setPage(0);
  };

  const activeCount = useMemo(() => players.filter(p => p.minutes > 0).length, [players]);

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Players</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            {activeCount} active players • {filteredPlayers.length} matching
          </p>
          <LiveRegion message={`${filteredPlayers.length} players matching current filters`} />
        </div>

        {error ? <ErrorState message={error} retry={refresh} /> : (
          <>
            {/* Filters */}
            <div className="card mb-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4">
                <div className="flex-1 max-w-xs">
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                    className="input"
                    aria-label="Search players"
                  />
                </div>

                <select
                  value={posFilter}
                  onChange={(e) => { setPosFilter(Number(e.target.value)); setPage(0); }}
                  className="input select w-full sm:w-32"
                  aria-label="Filter by position"
                >
                  <option value={0}>All Pos</option>
                  <option value={1}>GK</option>
                  <option value={2}>DEF</option>
                  <option value={3}>MID</option>
                  <option value={4}>FWD</option>
                </select>

                <select
                  value={teamFilter}
                  onChange={(e) => { setTeamFilter(Number(e.target.value)); setPage(0); }}
                  className="input select w-full sm:w-40"
                  aria-label="Filter by team"
                >
                  <option value={0}>All Teams</option>
                  {sortedTeams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>

                <div className="hidden sm:block flex-1" />
                <span className="text-xs font-mono text-[var(--text-muted)] text-right">
                  {filteredPlayers.length} results
                </span>
              </div>
            </div>

            {loading ? <TableSkeleton rows={10} /> : (
              <>
                {/* Table */}
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--bg-primary)]">
                          <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-3 py-2.5 w-10">#</th>
                          <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-3 py-2.5">Player</th>
                          <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-3 py-2.5 hidden sm:table-cell">Team</th>
                          <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-3 py-2.5">Pos</th>
                          <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-3 py-2.5 hidden md:table-cell">Status</th>
                          <SortHeader label="Price" sortKey="now_cost" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} className="text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-3 py-2.5" />
                          <SortHeader label="Pts" sortKey="total_points" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} className="text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-3 py-2.5" />
                          <SortHeader label="Form" sortKey="form" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} className="text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-3 py-2.5 hidden sm:table-cell" />
                          <SortHeader label="xPts" sortKey="xPts" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} className="text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-3 py-2.5 hidden md:table-cell" />
                          <SortHeader label="PPM" sortKey="ppm" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} className="text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-3 py-2.5 hidden lg:table-cell" />
                          <SortHeader label="Own%" sortKey="selected_by_percent" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} className="text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-3 py-2.5 hidden lg:table-cell" />
                        </tr>
                      </thead>
                      <tbody>
                        {pageSlice.map((player, idx) => {
                          const status = getStatusBadge(player);
                          return (
                            <tr
                              key={player.id}
                              className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)] focus-within:bg-[var(--bg-hover)]"
                              onClick={() => router.push(`/players/${player.id}`)}
                              tabIndex={0}
                              role="link"
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/players/${player.id}`); }}}
                            >
                              <td className="px-3 py-2.5">
                                <span className="font-mono text-xs text-[var(--text-muted)]">
                                  {page * PAGE_SIZE + idx + 1}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="font-semibold text-[var(--accent)] hover:underline">{player.web_name}</span>
                                <span className="text-[var(--text-muted)] ml-1 text-[10px]">›</span>
                                <span className="sm:hidden text-xs text-[var(--text-tertiary)] ml-1">
                                  {getTeamShort(teams, player.team)}
                                </span>
                              </td>
                              <td className="hidden sm:table-cell px-3 py-2.5">
                                <span className="font-mono text-xs text-[var(--text-tertiary)]">
                                  {getTeamShort(teams, player.team)}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={`label ${getPositionClass(player.element_type)}`}>
                                  {getPositionLabel(player.element_type)}
                                </span>
                              </td>
                              <td className="hidden md:table-cell px-3 py-2.5">
                                {status ? (
                                  <span className={`label ${status.className}`}>{status.text}</span>
                                ) : (
                                  <span className="text-[var(--text-muted)]">—</span>
                                )}
                              </td>
                              <td className="text-right font-mono px-3 py-2.5">{formatPrice(player.now_cost)}</td>
                              <td className="text-right px-3 py-2.5">
                                <span className="font-mono font-semibold">{player.total_points}</span>
                              </td>
                              <td className="text-right hidden sm:table-cell px-3 py-2.5">
                                <span className={`font-mono ${parseFloat(player.form) >= 5 ? 'text-[var(--success)] font-semibold' : ''}`}>
                                  {player.form}
                                </span>
                              </td>
                              <td className="text-right hidden md:table-cell px-3 py-2.5">
                                <span className="font-mono text-[var(--accent)]">{player.xPts.toFixed(1)}</span>
                              </td>
                              <td className="text-right font-mono hidden lg:table-cell px-3 py-2.5">{player.ppm.toFixed(2)}</td>
                              <td className="text-right hidden lg:table-cell px-3 py-2.5">
                                <span className="font-mono text-[var(--text-tertiary)]">{player.selected_by_percent}%</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-[var(--text-muted)] font-mono">
                      Page {page + 1} of {totalPages}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="btn btn-ghost text-xs"
                      >
                        ← Prev
                      </button>
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 7) pageNum = i;
                        else if (page < 3) pageNum = i;
                        else if (page > totalPages - 4) pageNum = totalPages - 7 + i;
                        else pageNum = page - 3 + i;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`btn text-xs min-w-[32px] ${page === pageNum ? 'btn-primary' : 'btn-ghost'}`}
                          >
                            {pageNum + 1}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="btn btn-ghost text-xs"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
  );
}
