"use client";

import { useState } from "react";
import { useFPL } from "@/lib/use-fpl-data";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { useTeamData } from "@/lib/use-team-data";
import TransferAdvisor from "@/components/optimizer/TransferAdvisor";
import SquadBuilder from "@/components/optimizer/SquadBuilder";
import ChipAdvisor from "@/components/optimizer/ChipAdvisor";

type OptimizerMode = 'transfers' | 'builder' | 'chips';

export default function OptimizerPage() {
  const { loading, error, refresh } = useFPL();
  const [mode, setMode] = useState<OptimizerMode>('transfers');

  // Shared team data hook (used by Transfer Advisor + Chip Advisor)
  const team = useTeamData();

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Team Optimizer</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Transfer advice, squad building, and chip strategy
        </p>
      </div>

      {error ? <ErrorState message={error} retry={refresh} /> : loading ? <TableSkeleton rows={8} /> : (
        <>
          {/* Mode Selector */}
          <div className="tab-list mb-6 overflow-x-auto" role="tablist" aria-label="Optimizer modes">
            {([
              { id: 'transfers' as const, label: 'Transfer Advisor', icon: '' },
              { id: 'builder' as const, label: 'Squad Builder', icon: '' },
              { id: 'chips' as const, label: 'Chip Advisor', icon: '' },
            ]).map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={mode === tab.id}
                onClick={() => setMode(tab.id)}
                className={`tab-item whitespace-nowrap ${mode === tab.id ? 'active' : ''}`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {mode === 'transfers' && (
            <TransferAdvisor
              teamIdInput={team.teamIdInput}
              setTeamIdInput={team.setTeamIdInput}
              entryLoading={team.entryLoading}
              entryError={team.entryError}
              entry={team.entry}
              picks={team.picks}
              bank={team.bank}
              freeTransfers={team.freeTransfers}
              fetchTeamData={team.fetchTeamData}
            />
          )}

          {mode === 'builder' && <SquadBuilder />}

          {mode === 'chips' && (
            <ChipAdvisor
              teamIdInput={team.teamIdInput}
              setTeamIdInput={team.setTeamIdInput}
              entryLoading={team.entryLoading}
              entryError={team.entryError}
              entry={team.entry}
              picks={team.picks}
              bank={team.bank}
              chipsPlayed={team.chipsPlayed}
              fetchTeamData={team.fetchTeamData}
            />
          )}
        </>
      )}
    </main>
  );
}
