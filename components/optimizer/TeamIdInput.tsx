"use client";

import { memo } from "react";
import { FPLEntry } from "@/types/fpl";
import { formatPrice } from "@/lib/fpl-utils";

interface TeamIdInputProps {
  teamIdInput: string;
  setTeamIdInput: (val: string) => void;
  entryLoading: boolean;
  entryError: string | null;
  entry: FPLEntry | null;
  bank: number;
  onLoad: () => void;
}

export default memo(function TeamIdInput({
  teamIdInput, setTeamIdInput, entryLoading, entryError, entry, bank, onLoad,
}: TeamIdInputProps) {
  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Your FPL Team
        </span>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label htmlFor="team-id-input" className="text-xs font-medium text-[var(--text-tertiary)] block mb-1.5">
            FPL Team ID
          </label>
          <p className="text-[11px] text-[var(--text-muted)] mb-2">
            Find it in your FPL URL: fantasy.premierleague.com/entry/<strong>XXXXXX</strong>/event/...
          </p>
          <div className="flex gap-2">
            <input
              id="team-id-input"
              type="text"
              value={teamIdInput}
              onChange={e => setTeamIdInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && onLoad()}
              placeholder="e.g. 123456"
              className="input font-mono flex-1"
              aria-label="FPL Team ID"
            />
            <button
              onClick={onLoad}
              disabled={entryLoading || !teamIdInput}
              className="btn btn-primary whitespace-nowrap"
            >
              {entryLoading ? 'Loading...' : 'Load Team'}
            </button>
          </div>
          {entryError && (
            <p className="text-xs text-[var(--danger)] mt-2" role="alert">{entryError}</p>
          )}
        </div>

        {entry && (
          <div className="pt-3 border-t border-[var(--border)] space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold truncate">{entry.name}</span>
              <span className="text-[11px] text-[var(--text-muted)] flex-shrink-0 ml-2">
                {entry.player_first_name} {entry.player_last_name}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between py-1">
                <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">Points</span>
                <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{entry.summary_overall_points?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">Rank</span>
                <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{entry.summary_overall_rank?.toLocaleString() || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">In the Bank</span>
                <span className="font-mono text-sm font-bold text-[var(--accent)]">{formatPrice(bank)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
})
