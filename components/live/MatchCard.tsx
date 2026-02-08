"use client";

import { useState, useMemo, memo } from "react";
import { Fixture, Player, LiveElement } from "@/types/fpl";

// ===== Utility functions =====

export function getMatchStatus(fixture: Fixture): { label: string; className: string } {
  if (fixture.finished_provisional || fixture.finished) {
    return { label: "FT", className: "bg-[#0D0D0D] text-white" };
  }
  if (fixture.started) {
    if (fixture.minutes === 45 || fixture.minutes === 46) {
      return { label: "HT", className: "bg-[var(--accent)] text-white" };
    }
    return { label: `${fixture.minutes}'`, className: "bg-[var(--accent)] text-white animate-pulse" };
  }
  try {
    const ko = new Date(fixture.kickoff_time);
    return {
      label: ko.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      className: "bg-[var(--bg-hover)] text-[var(--text-secondary)]",
    };
  } catch {
    return { label: "TBD", className: "bg-[var(--bg-hover)] text-[var(--text-secondary)]" };
  }
}

function getStatLabel(identifier: string): string {
  const labels: Record<string, string> = {
    goals_scored: "Goal", assists: "Assist", own_goals: "Own Goal",
    penalties_saved: "Pen Saved", penalties_missed: "Pen Missed",
    yellow_cards: "Yellow", red_cards: "Red", saves: "Save",
    bonus: "Bonus", bps: "BPS",
  };
  return labels[identifier] || identifier;
}

function getStatIcon(identifier: string): string {
  const icons: Record<string, string> = {
    goals_scored: "⚽", assists: "🅰️", own_goals: "🔴",
    penalties_saved: "🧤", penalties_missed: "❌",
    yellow_cards: "🟨", red_cards: "🟥", saves: "🧤", bonus: "⭐",
  };
  return icons[identifier] || "";
}

// ===== MatchCard Component =====

interface MatchCardProps {
  fixture: Fixture;
  players: Player[];
  liveElements: LiveElement[];
  homeTeamName: string;
  awayTeamName: string;
  homeTeamShort: string;
  awayTeamShort: string;
}

export default memo(function MatchCard({
  fixture, players, homeTeamName, awayTeamName, homeTeamShort, awayTeamShort,
}: MatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const status = getMatchStatus(fixture);

  const keyStats = useMemo(() => {
    if (!fixture.stats) return [];
    return fixture.stats.filter(s => s.identifier !== "bps" && (s.h.length > 0 || s.a.length > 0));
  }, [fixture.stats]);

  const bpsData = useMemo(() => {
    const bpsStat = fixture.stats?.find(s => s.identifier === "bps");
    if (!bpsStat) return [];
    return [
      ...bpsStat.h.map(e => ({ ...e, side: "h" as const })),
      ...bpsStat.a.map(e => ({ ...e, side: "a" as const })),
    ].sort((a, b) => b.value - a.value).slice(0, 5);
  }, [fixture.stats]);

  const bonusData = useMemo(() => {
    const bonusStat = fixture.stats?.find(s => s.identifier === "bonus");
    if (!bonusStat) return [];
    return [
      ...bonusStat.h.map(e => ({ ...e, side: "h" as const })),
      ...bonusStat.a.map(e => ({ ...e, side: "a" as const })),
    ].sort((a, b) => b.value - a.value);
  }, [fixture.stats]);

  const getPlayerName = useMemo(() => {
    const map = new Map(players.map(p => [p.id, p.web_name]));
    return (elementId: number): string => map.get(elementId) || `#${elementId}`;
  }, [players]);

  const isLive = fixture.started && !fixture.finished && !fixture.finished_provisional;
  const hasStarted = fixture.started || fixture.finished || fixture.finished_provisional;

  return (
    <div className={`bg-[var(--bg-card)] rounded border transition-all ${
      isLive ? "border-[var(--accent)] shadow-sm" : "border-[var(--border)]"
    }`}>
      {/* Match Header */}
      <div
        className="p-4 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
        onClick={() => hasStarted && setExpanded(!expanded)}
        role={hasStarted ? "button" : undefined}
        tabIndex={hasStarted ? 0 : undefined}
        onKeyDown={hasStarted ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded); } } : undefined}
        aria-expanded={hasStarted ? expanded : undefined}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 text-right">
            <div className="font-semibold text-[13px] text-[var(--text-primary)]">{homeTeamName}</div>
            <div className="font-mono text-[11px] text-[var(--text-muted)]">{homeTeamShort}</div>
          </div>
          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            {hasStarted ? (
              <div className="font-mono font-bold text-xl text-[var(--text-primary)]">
                {fixture.team_h_score ?? 0} – {fixture.team_a_score ?? 0}
              </div>
            ) : (
              <div className="font-mono text-lg text-[var(--text-muted)]">vs</div>
            )}
            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${status.className}`}>
              {status.label}
            </span>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-[13px] text-[var(--text-primary)]">{awayTeamName}</div>
            <div className="font-mono text-[11px] text-[var(--text-muted)]">{awayTeamShort}</div>
          </div>
        </div>

        {/* Inline goal events */}
        {keyStats.length > 0 && (
          <div className="mt-3 flex flex-col gap-1">
            {keyStats
              .filter(s => s.identifier === "goals_scored" || s.identifier === "own_goals")
              .map(stat => (
                <div key={stat.identifier} className="flex items-center gap-2">
                  <div className="flex-1 text-right text-[11px] text-[var(--text-secondary)] font-mono">
                    {stat.h.map((e, i) => (
                      <span key={i}>
                        {getPlayerName(e.element)}{e.value > 1 ? ` ×${e.value}` : ""} {getStatIcon(stat.identifier)}
                        {i < stat.h.length - 1 && ", "}
                      </span>
                    ))}
                  </div>
                  <div className="min-w-[80px]" />
                  <div className="flex-1 text-[11px] text-[var(--text-secondary)] font-mono">
                    {stat.a.map((e, i) => (
                      <span key={i}>
                        {getStatIcon(stat.identifier)} {getPlayerName(e.element)}
                        {e.value > 1 ? ` ×${e.value}` : ""}{i < stat.a.length - 1 && ", "}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {hasStarted && (
          <div className="text-center mt-2">
            <span className="text-[10px] text-[var(--text-muted)]">{expanded ? "▲ Less" : "▼ Details"}</span>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && hasStarted && (
        <div className="border-t border-[var(--border)] px-4 py-3 bg-[var(--bg-hover)]">
          {keyStats.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] font-mono font-semibold text-[var(--text-muted)] uppercase mb-2">Match Events</div>
              <div className="space-y-1">
                {keyStats.map(stat => (
                  <div key={stat.identifier}>
                    {stat.h.map((e, i) => (
                      <div key={`h-${i}`} className="flex items-center gap-2 text-[12px] font-mono">
                        <span className="text-[var(--text-muted)] w-4">{getStatIcon(stat.identifier)}</span>
                        <span className="text-[var(--text-primary)]">{getPlayerName(e.element)}</span>
                        <span className="text-[var(--text-muted)]">({getStatLabel(stat.identifier)}{e.value > 1 ? ` ×${e.value}` : ""})</span>
                        <span className="text-[10px] text-[var(--text-muted)] ml-auto">{homeTeamShort}</span>
                      </div>
                    ))}
                    {stat.a.map((e, i) => (
                      <div key={`a-${i}`} className="flex items-center gap-2 text-[12px] font-mono">
                        <span className="text-[var(--text-muted)] w-4">{getStatIcon(stat.identifier)}</span>
                        <span className="text-[var(--text-primary)]">{getPlayerName(e.element)}</span>
                        <span className="text-[var(--text-muted)]">({getStatLabel(stat.identifier)}{e.value > 1 ? ` ×${e.value}` : ""})</span>
                        <span className="text-[10px] text-[var(--text-muted)] ml-auto">{awayTeamShort}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {bpsData.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] font-mono font-semibold text-[var(--text-muted)] uppercase mb-2">BPS Leaders</div>
              <div className="grid grid-cols-1 gap-1">
                {bpsData.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px] font-mono">
                    <span className={`w-5 text-center font-bold ${i < 3 ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>{i + 1}</span>
                    <span className="text-[var(--text-primary)] flex-1">{getPlayerName(e.element)}</span>
                    <span className="text-[var(--text-muted)] text-[10px]">{e.side === "h" ? homeTeamShort : awayTeamShort}</span>
                    <span className="font-semibold text-[var(--text-primary)] w-8 text-right">{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bonusData.length > 0 && (
            <div>
              <div className="text-[10px] font-mono font-semibold text-[var(--text-muted)] uppercase mb-2">Bonus Points</div>
              <div className="flex gap-3">
                {bonusData.map((e, i) => (
                  <div key={i} className="flex items-center gap-1 text-[12px] font-mono">
                    <span className="text-[var(--accent)] font-bold">+{e.value}</span>
                    <span className="text-[var(--text-primary)]">{getPlayerName(e.element)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
})
