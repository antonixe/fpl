import {
  Player, Team, Fixture, GameWeek,
  FPLEntry, FPLEntryEvent, FPLPick,
  TransferSuggestion, ChipRecommendation,
} from "@/types/fpl";
import {
  calcExpectedPoints, getUpcomingFixtures, getFixtureDifficultyScore,
  getTeamShort, isPlayerAvailable, getCurrentGW, formatPrice,
  getPositionLabel,
} from "@/lib/fpl-utils";

// ===== Selling price estimate =====
// FPL gives you buy price + floor(profit / 2). We approximate with available data.
export function estimateSellingPrice(player: Player): number {
  // FPL gives you purchase price + floor(profit / 2)
  // cost_change_start = price change since season start (approximation for profit)
  if (player.cost_change_start <= 0) return player.now_cost;
  const originalCost = player.now_cost - player.cost_change_start;
  const sellProfit = Math.floor(player.cost_change_start / 2);
  return originalCost + sellProfit;
}

// ===== Transfer suggestions =====
export interface TransferContext {
  players: Player[];
  teams: Team[];
  fixtures: Fixture[];
  gameweeks: GameWeek[];
  picks: FPLPick[];
  bank: number; // in 0.1m
  freeTransfers: number; // 1-5
}

export function generateTransferSuggestions(ctx: TransferContext): TransferSuggestion[] {
  const { players, teams, fixtures, gameweeks, picks, bank, freeTransfers } = ctx;
  const currentGW = getCurrentGW(gameweeks);

  // Map picks to full player data
  const ownedIds = new Set(picks.map(p => p.element));
  const ownedPlayers = picks.map(pick => {
    const player = players.find(p => p.id === pick.element);
    return { pick, player: player! };
  }).filter(x => x.player);

  // Count teams in current squad
  const teamCounts: Record<number, number> = {};
  for (const { player } of ownedPlayers) {
    teamCounts[player.team] = (teamCounts[player.team] || 0) + 1;
  }

  // Identify urgent needs first (injured/suspended starters)
  const urgentOuts = ownedPlayers.filter(({ pick, player }) =>
    pick.position <= 11 && (player.status === 'i' || player.status === 's' || player.status === 'n')
  );

  // Then consider starters with very poor outlook (doubtful + poor form + hard fixtures)
  const weakOuts = ownedPlayers.filter(({ pick, player }) => {
    if (pick.position > 11) return false; // skip bench
    if (pick.is_captain) return false; // skip captain
    if (urgentOuts.some(u => u.player.id === player.id)) return false; // already urgent
    
    const form = parseFloat(player.form) || 0;
    const fixtureEase = getFixtureDifficultyScore(fixtures, teams, player.team, currentGW);
    const isDoubtful = player.status === 'd';
    const poorForm = form < 2.5;
    const hardFixtures = fixtureEase < 2.5;
    
    // Only flag if multiple problems compound
    return (isDoubtful && poorForm) || (poorForm && hardFixtures) || isDoubtful;
  });

  // Combine: urgent first, then weak, but total candidates capped
  const transferCandidates = [...urgentOuts, ...weakOuts];

  // If no issues found, squad is fine — suggest saving the transfer
  if (transferCandidates.length === 0) return [];

  const suggestions: TransferSuggestion[] = [];

  for (const { pick, player: outPlayer } of transferCandidates) {
    const sellPrice = estimateSellingPrice(outPlayer);
    const availableBudget = bank + sellPrice;
    const isUrgent = urgentOuts.some(u => u.player.id === outPlayer.id);
    const outXPts = calcExpectedPoints(outPlayer, fixtures, teams, currentGW);

    // Find best replacement at the same position
    const bestCandidate = players
      .filter(p =>
        p.element_type === outPlayer.element_type &&
        !ownedIds.has(p.id) &&
        isPlayerAvailable(p) &&
        p.minutes > 0 &&
        p.now_cost <= availableBudget &&
        ((teamCounts[p.team] || 0) < 3 || p.team === outPlayer.team)
      )
      .map(p => ({
        player: p,
        xPts: calcExpectedPoints(p, fixtures, teams, currentGW),
        buyScore: calcBuyScore(p, fixtures, teams, currentGW),
      }))
      .sort((a, b) => b.buyScore - a.buyScore)[0]; // take only the best one

    if (!bestCandidate) continue;

    const xPtsGain = bestCandidate.xPts - outXPts;
    // For urgent (injured), xPts gain is always positive since injured = 0 xPts
    if (!isUrgent && xPtsGain <= 0.5) continue;

    const costDelta = bestCandidate.player.now_cost - sellPrice;
    const reason = buildTransferReason(outPlayer, bestCandidate.player, xPtsGain, fixtures, teams, currentGW);

    suggestions.push({
      playerOut: outPlayer,
      playerIn: bestCandidate.player,
      xPtsGain: Math.round(xPtsGain * 10) / 10,
      costDelta,
      reason,
      priority: isUrgent ? 'urgent' : 'recommended',
      hitCost: 0, // assigned below
      netGain: 0, // assigned below
    });
  }

  // Sort: urgent first, then by xPts gain
  suggestions.sort((a, b) => {
    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
    if (a.priority !== 'urgent' && b.priority === 'urgent') return 1;
    return b.xPtsGain - a.xPtsGain;
  });

  // Deduplicate by playerIn
  const seen = new Set<number>();
  const deduped = suggestions.filter(s => {
    if (seen.has(s.playerIn.id)) return false;
    seen.add(s.playerIn.id);
    return true;
  });

  // Assign hit costs based on free transfers available
  // Each transfer beyond free transfers costs exactly 4 points
  const result: TransferSuggestion[] = [];
  for (let i = 0; i < deduped.length; i++) {
    const hitCost = i < freeTransfers ? 0 : 4;
    const netGain = deduped[i].xPtsGain - hitCost;

    // Only include hit-cost transfers if there's a genuine urgent need
    // (injured/suspended) AND the net gain is still positive
    if (hitCost > 0 && deduped[i].priority !== 'urgent') continue;
    if (hitCost > 0 && netGain < 0) continue;

    result.push({
      ...deduped[i],
      hitCost,
      netGain: Math.round(netGain * 10) / 10,
      priority: hitCost > 0 ? 'urgent' : deduped[i].priority,
    });
  }

  return result;
}

function calcBuyScore(player: Player, fixtures: Fixture[], teams: Team[], gw: number): number {
  const form = parseFloat(player.form) || 0;
  const fixtureEase = getFixtureDifficultyScore(fixtures, teams, player.team, gw);
  const xPts = calcExpectedPoints(player, fixtures, teams, gw);
  const valueRatio = player.total_points / Math.max(player.now_cost / 10, 1);

  return xPts * 12 + form * 4 + fixtureEase * 3 + valueRatio * 2;
}

function buildTransferReason(
  out: Player, inn: Player, xPtsGain: number,
  fixtures: Fixture[], teams: Team[], gw: number
): string {
  const reasons: string[] = [];

  // Injury/availability
  if (out.status === 'i') reasons.push(`${out.web_name} injured`);
  else if (out.status === 's') reasons.push(`${out.web_name} suspended`);
  else if (out.status === 'd') reasons.push(`${out.web_name} doubtful (${out.chance_of_playing_next_round ?? '?'}%)`);

  // Form comparison
  const outForm = parseFloat(out.form) || 0;
  const inForm = parseFloat(inn.form) || 0;
  if (inForm > outForm + 1) reasons.push(`better form (${inn.form} vs ${out.form})`);

  // Fixture comparison
  const outFDR = getFixtureDifficultyScore(fixtures, teams, out.team, gw);
  const inFDR = getFixtureDifficultyScore(fixtures, teams, inn.team, gw);
  if (inFDR > outFDR + 0.5) reasons.push('easier fixtures');

  // xPts
  reasons.push(`+${xPtsGain.toFixed(1)} xPts`);

  return reasons.join(', ');
}

// ===== Chip recommendations =====

export interface ChipContext {
  players: Player[];
  teams: Team[];
  fixtures: Fixture[];
  gameweeks: GameWeek[];
  picks: FPLPick[];
  chipsPlayed: { name: string; event: number }[];
  currentGW: number;
}

// Scan upcoming GWs to find when a chip is optimal
function findBestGWForChip(
  chipType: string,
  ctx: ChipContext,
  ownedPlayers: { pick: FPLPick; player: Player }[],
  lookAhead: number = 5
): { bestGW: number | null; bestGWReason: string; bestScore: number } {
  const { players, teams, fixtures, currentGW } = ctx;
  const starters = ownedPlayers.filter(p => p.pick.position <= 11);
  const benchPlayers = ownedPlayers.filter(p => p.pick.position > 11);

  let bestGW: number | null = null;
  let bestScore = 0;
  let bestGWReason = '';

  const maxGW = Math.min(currentGW + lookAhead, 38);

  for (let gw = currentGW; gw <= maxGW; gw++) {
    let gwScore = 0;
    let gwReason = '';

    // Count how many fixtures exist per team in this GW (detect DGW/BGW)
    const gwFixtures = fixtures.filter(f => f.event === gw);
    const teamFixtureCounts: Record<number, number> = {};
    for (const f of gwFixtures) {
      teamFixtureCounts[f.team_h] = (teamFixtureCounts[f.team_h] || 0) + 1;
      teamFixtureCounts[f.team_a] = (teamFixtureCounts[f.team_a] || 0) + 1;
    }
    const isDGW = Object.values(teamFixtureCounts).some(c => c >= 2);
    const isBGW = gwFixtures.length < 10; // fewer than 10 matches = blank GW

    switch (chipType) {
      case 'bboost': {
        // BB is best in a DGW when bench players have double fixtures + easy opponents
        const benchXPts = benchPlayers.reduce((s, p) =>
          s + calcExpectedPoints(p.player, fixtures, teams, gw), 0);
        const benchAvail = benchPlayers.filter(p => isPlayerAvailable(p.player)).length;
        gwScore = benchXPts * 8 * (isDGW ? 1.8 : 1) * (benchAvail / 4);
        if (isDGW) gwReason = `DGW${gw}: bench players could have double fixtures`;
        else gwReason = `GW${gw}: bench xPts ${benchXPts.toFixed(1)}`;
        break;
      }
      case '3xc': {
        // TC is best when your best captain option has the easiest fixture(s),
        // ideally in a DGW
        const captainCandidates = starters
          .map(p => ({
            player: p.player,
            xPts: calcExpectedPoints(p.player, fixtures, teams, gw),
          }))
          .sort((a, b) => b.xPts - a.xPts);
        const bestCap = captainCandidates[0];
        if (bestCap) {
          gwScore = bestCap.xPts * 10 * (isDGW ? 2 : 1);
          const teamName = getTeamShort(teams, bestCap.player.team);
          if (isDGW) gwReason = `DGW${gw}: ${bestCap.player.web_name} (${teamName}) with double fixtures, xPts ${bestCap.xPts.toFixed(1)}`;
          else gwReason = `GW${gw}: ${bestCap.player.web_name} (${teamName}) xPts ${bestCap.xPts.toFixed(1)}`;
        }
        break;
      }
      case 'freehit': {
        // FH is best in a BGW (lots of blanks) or when squad has many unavailable players
        const unavailable = ownedPlayers.filter(p =>
          !isPlayerAvailable(p.player) || !(teamFixtureCounts[p.player.team])
        ).length;
        gwScore = unavailable * 12 + (isBGW ? 50 : 0) + (isDGW ? 30 : 0);
        if (isBGW) gwReason = `BGW${gw}: only ${gwFixtures.length} matches — many of your players blanking`;
        else if (isDGW) gwReason = `DGW${gw}: restructure squad to target double fixtures`;
        else gwReason = `GW${gw}: ${unavailable} of your players unavailable/blanking`;
        break;
      }
      case 'wildcard': {
        // WC is best when squad has accumulated too many issues
        const lowFormCount = starters.filter(p => (parseFloat(p.player.form) || 0) < 3).length;
        const injuredCount = ownedPlayers.filter(p =>
          p.player.status === 'i' || p.player.status === 's'
        ).length;
        const droppedValue = ownedPlayers.filter(p => p.player.cost_change_start < 0).length;
        gwScore = lowFormCount * 7 + injuredCount * 10 + droppedValue * 5;
        gwReason = `GW${gw}: ${lowFormCount} in poor form, ${injuredCount} injured, ${droppedValue} losing value`;
        break;
      }
    }

    if (gwScore > bestScore) {
      bestScore = gwScore;
      bestGW = gw;
      bestGWReason = gwReason;
    }
  }

  return { bestGW, bestGWReason, bestScore };
}

export function generateChipRecommendations(ctx: ChipContext): ChipRecommendation[] {
  const { players, teams, fixtures, gameweeks, picks, chipsPlayed, currentGW } = ctx;

  const chipUsed = (name: string) => chipsPlayed.some(c => c.name === name);

  // Get owned players
  const ownedPlayers = picks.map(pick => {
    const player = players.find(p => p.id === pick.element);
    return player ? { pick, player } : null;
  }).filter(Boolean) as { pick: FPLPick; player: Player }[];

  const starters = ownedPlayers.filter(p => p.pick.position <= 11);
  const benchPlayers = ownedPlayers.filter(p => p.pick.position > 11);

  const recommendations: ChipRecommendation[] = [];

  // --- Bench Boost ---
  const bbUsed = chipUsed('bboost');
  const bbTiming = findBestGWForChip('bboost', ctx, ownedPlayers);
  const bbScoreNow = (() => {
    const benchXPts = benchPlayers.reduce((s, p) =>
      s + calcExpectedPoints(p.player, fixtures, teams, currentGW), 0);
    const benchAvail = benchPlayers.filter(p => isPlayerAvailable(p.player)).length;
    return Math.min(100, Math.round(benchXPts * 8 * (benchAvail / 4)));
  })();
  const bbVerdict: ChipRecommendation['verdict'] = bbScoreNow >= 60 ? 'strong' : bbScoreNow >= 35 ? 'moderate' : 'weak';

  const bbIsNowBest = bbTiming.bestGW === currentGW;
  recommendations.push({
    chip: 'bboost',
    label: 'Bench Boost',
    score: bbScoreNow,
    available: !bbUsed,
    reason: bbUsed
      ? 'Already used this season'
      : bbIsNowBest
        ? `This is the best upcoming week for Bench Boost — ${bbTiming.bestGWReason}`
        : `Save for GW${bbTiming.bestGW} — ${bbTiming.bestGWReason}`,
    verdict: bbVerdict,
    bestGW: bbUsed ? null : bbTiming.bestGW,
    bestGWReason: bbUsed ? '' : bbTiming.bestGWReason,
  });

  // --- Triple Captain ---
  const tcUsed = chipUsed('3xc');
  const tcTiming = findBestGWForChip('3xc', ctx, ownedPlayers);
  const captain = ownedPlayers.find(p => p.pick.is_captain);
  const captainXPts = captain ? calcExpectedPoints(captain.player, fixtures, teams, currentGW) : 0;
  const tcScoreNow = Math.min(100, Math.round(captainXPts * 10));
  const tcVerdict: ChipRecommendation['verdict'] = tcScoreNow >= 60 ? 'strong' : tcScoreNow >= 35 ? 'moderate' : 'weak';

  const tcIsNowBest = tcTiming.bestGW === currentGW;
  recommendations.push({
    chip: '3xc',
    label: 'Triple Captain',
    score: tcScoreNow,
    available: !tcUsed,
    reason: tcUsed
      ? 'Already used this season'
      : tcIsNowBest
        ? `This is the best upcoming week for Triple Captain — ${tcTiming.bestGWReason}`
        : `Save for GW${tcTiming.bestGW} — ${tcTiming.bestGWReason}`,
    verdict: tcVerdict,
    bestGW: tcUsed ? null : tcTiming.bestGW,
    bestGWReason: tcUsed ? '' : tcTiming.bestGWReason,
  });

  // --- Free Hit ---
  const fhUsed = chipUsed('freehit');
  const fhTiming = findBestGWForChip('freehit', ctx, ownedPlayers);
  const fhScoreNow = (() => {
    const unavailable = ownedPlayers.filter(p =>
      p.player.status === 'i' || p.player.status === 's' || p.player.status === 'n'
    ).length;
    const hardFixtures = starters.filter(p => {
      const fdr = getFixtureDifficultyScore(fixtures, teams, p.player.team, currentGW);
      return fdr < 2.5;
    }).length;
    return Math.min(100, Math.round(unavailable * 12 + hardFixtures * 8));
  })();
  const fhVerdict: ChipRecommendation['verdict'] = fhScoreNow >= 55 ? 'strong' : fhScoreNow >= 30 ? 'moderate' : 'weak';

  const fhIsNowBest = fhTiming.bestGW === currentGW;
  recommendations.push({
    chip: 'freehit',
    label: 'Free Hit',
    score: fhScoreNow,
    available: !fhUsed,
    reason: fhUsed
      ? 'Already used this season'
      : fhIsNowBest
        ? `This is the best upcoming week for Free Hit — ${fhTiming.bestGWReason}`
        : `Save for GW${fhTiming.bestGW} — ${fhTiming.bestGWReason}`,
    verdict: fhVerdict,
    bestGW: fhUsed ? null : fhTiming.bestGW,
    bestGWReason: fhUsed ? '' : fhTiming.bestGWReason,
  });

  // --- Wildcard ---
  // WC1 = events 1-19, WC2 = events 20-38 — two separate wildcards per season
  const wc1Used = chipsPlayed.some(c => c.name === 'wildcard' && c.event <= 19);
  const wc2Used = chipsPlayed.some(c => c.name === 'wildcard' && c.event > 19);
  const wcUsed = currentGW <= 19 ? wc1Used : wc2Used;

  const wcTiming = findBestGWForChip('wildcard', ctx, ownedPlayers);
  const wcScoreNow = (() => {
    const droppedValue = ownedPlayers.filter(p => p.player.cost_change_start < 0).length;
    const lowFormCount = starters.filter(p => (parseFloat(p.player.form) || 0) < 3).length;
    return Math.min(100, Math.round(droppedValue * 8 + lowFormCount * 7));
  })();
  const wcVerdict: ChipRecommendation['verdict'] = wcScoreNow >= 55 ? 'strong' : wcScoreNow >= 30 ? 'moderate' : 'weak';

  const wcIsNowBest = wcTiming.bestGW === currentGW;
  recommendations.push({
    chip: 'wildcard',
    label: 'Wildcard',
    score: wcScoreNow,
    available: !wcUsed,
    reason: wcUsed
      ? `Already used (${currentGW <= 19 ? 'first half' : 'second half'} WC)`
      : wcIsNowBest
        ? `This is the best upcoming week for Wildcard — ${wcTiming.bestGWReason}`
        : `Save for later — ${wcTiming.bestGWReason}`,
    verdict: wcVerdict,
    bestGW: wcUsed ? null : wcTiming.bestGW,
    bestGWReason: wcUsed ? '' : wcTiming.bestGWReason,
  });

  return recommendations.sort((a, b) => b.score - a.score);
}

// ===== Squad weakness analysis =====
export interface SquadIssue {
  severity: 'high' | 'medium' | 'low';
  icon: string;
  message: string;
  playerId?: number;
}

export function analyzeSquad(
  picks: FPLPick[],
  players: Player[],
  fixtures: Fixture[],
  teams: Team[],
  currentGW: number
): SquadIssue[] {
  const issues: SquadIssue[] = [];

  const ownedPlayers = picks.map(pick => {
    const player = players.find(p => p.id === pick.element);
    return player ? { pick, player } : null;
  }).filter(Boolean) as { pick: FPLPick; player: Player }[];

  const starters = ownedPlayers.filter(p => p.pick.position <= 11);

  for (const { pick, player } of ownedPlayers) {
    // Injured/suspended starters
    if (pick.position <= 11 && (player.status === 'i' || player.status === 's')) {
      issues.push({
        severity: 'high',
        icon: '🚑',
        message: `${player.web_name} is ${player.status === 'i' ? 'injured' : 'suspended'} — needs replacing`,
        playerId: player.id,
      });
    }

    // Doubtful starters
    if (pick.position <= 11 && player.status === 'd') {
      issues.push({
        severity: 'medium',
        icon: '⚠️',
        message: `${player.web_name} is doubtful (${player.chance_of_playing_next_round ?? '?'}%)`,
        playerId: player.id,
      });
    }

    // Zero-minute bench fodder in starting XI
    if (pick.position <= 11 && player.minutes === 0) {
      issues.push({
        severity: 'high',
        icon: '📋',
        message: `${player.web_name} has 0 minutes played — inactive player in starting XI`,
        playerId: player.id,
      });
    }
  }

  // Tough upcoming fixtures for many starters
  const toughFixtureStarters = starters.filter(({ player }) => {
    const fdr = getFixtureDifficultyScore(fixtures, teams, player.team, currentGW);
    return fdr < 2.5;
  });
  if (toughFixtureStarters.length >= 4) {
    issues.push({
      severity: 'medium',
      icon: '🔴',
      message: `${toughFixtureStarters.length} starters face tough fixtures — consider transfers or Free Hit`,
    });
  }

  // Poor form starters
  const poorFormCount = starters.filter(({ player }) => (parseFloat(player.form) || 0) < 2).length;
  if (poorFormCount >= 3) {
    issues.push({
      severity: 'medium',
      icon: '📉',
      message: `${poorFormCount} starters in poor form (< 2.0) — time to rethink your XI?`,
    });
  }

  return issues.sort((a, b) => {
    const sev = { high: 0, medium: 1, low: 2 };
    return sev[a.severity] - sev[b.severity];
  });
}
