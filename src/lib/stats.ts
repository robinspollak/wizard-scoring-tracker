import type { Sheet } from "./games";
import { playerKey } from "./names";
import { madeBet } from "./wizard";

export type PlayerStats = {
  key: string;
  name: string;
  games: number;
  wins: number;
  losses: number;
  lastPlaces: number;
  winRate: number;
  avgFinal: number;
  bestFinal: number;
  rounds: number;
  hits: number;
  hitRate: number;
  /** Average bet as a share of the cards dealt that round. */
  bidShare: number;
  zeroBids: number;
  zeroHits: number;
};

export type RoundRecord = { name: string; score: number; round: number; gameId: number; gameName: string };
export type FinalRecord = { name: string; score: number; gameId: number; gameName: string };

export type Award = { emoji: string; title: string; name: string; detail: string };

export type Stats = {
  players: PlayerStats[];
  finishedGames: number;
  roundsPlayed: number;
  overbidRate: number;
  underbidRate: number;
  highestFinal: FinalRecord | null;
  bestRound: RoundRecord | null;
  worstRound: RoundRecord | null;
  awards: Award[];
};

// Rates are noisy for someone who's only played a handful of rounds.
const MIN_ROUNDS_FOR_RATES = 10;

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function computeStats(sheets: Sheet[]): Stats {
  const byKey = new Map<string, PlayerStats & { finalSum: number; bidShareSum: number }>();
  const get = (name: string) => {
    const key = playerKey(name);
    let p = byKey.get(key);
    if (!p) {
      p = {
        key, name, games: 0, wins: 0, losses: 0, lastPlaces: 0, winRate: 0, avgFinal: 0,
        bestFinal: -Infinity, rounds: 0, hits: 0, hitRate: 0, bidShare: 0, zeroBids: 0,
        zeroHits: 0, finalSum: 0, bidShareSum: 0,
      };
      byKey.set(key, p);
    }
    return p;
  };

  let finishedGames = 0;
  let roundsPlayed = 0;
  let overbid = 0;
  let underbid = 0;
  let highestFinal: FinalRecord | null = null;
  let bestRound: RoundRecord | null = null;
  let worstRound: RoundRecord | null = null;

  // Sheets arrive newest first, so the first spelling we see is the latest.
  for (const sheet of sheets) {
    const { game, players } = sheet;
    players.forEach((name) => get(name));

    for (const row of sheet.rounds) {
      if (row.status !== "done") continue;
      roundsPlayed++;
      const betSum = row.cells.reduce((a, c) => a + (c.bet ?? 0), 0);
      if (betSum > row.cards) overbid++;
      else if (betSum < row.cards) underbid++;

      row.cells.forEach((cell, seat) => {
        if (cell.bet === null || cell.score === null) return;
        const p = get(players[seat]);
        const made = madeBet(cell.score);
        p.rounds++;
        p.bidShareSum += cell.bet / row.cards;
        if (made) p.hits++;
        if (cell.bet === 0) {
          p.zeroBids++;
          if (made) p.zeroHits++;
        }
        const rec = { name: p.name, score: cell.score, round: row.round, gameId: game.id, gameName: game.name };
        if (!bestRound || cell.score > bestRound.score) bestRound = rec;
        if (!worstRound || cell.score < worstRound.score) worstRound = rec;
      });
    }

    if (!sheet.finished) continue;
    finishedGames++;
    const low = Math.min(...sheet.totals);
    sheet.totals.forEach((total, seat) => {
      const p = get(players[seat]);
      p.games++;
      p.finalSum += total;
      p.bestFinal = Math.max(p.bestFinal, total);
      if (sheet.winners.includes(seat)) p.wins++;
      else p.losses++;
      if (total === low && players.length > 1) p.lastPlaces++;
      if (!highestFinal || total > highestFinal.score) {
        highestFinal = { name: p.name, score: total, gameId: game.id, gameName: game.name };
      }
    });
  }

  const players = [...byKey.values()].map(({ finalSum, bidShareSum, ...p }) => ({
    ...p,
    winRate: p.games ? p.wins / p.games : 0,
    avgFinal: p.games ? finalSum / p.games : 0,
    bestFinal: p.games ? p.bestFinal : 0,
    hitRate: p.rounds ? p.hits / p.rounds : 0,
    bidShare: p.rounds ? bidShareSum / p.rounds : 0,
  }));

  players.sort(
    (a, b) =>
      b.wins - a.wins || b.winRate - a.winRate || b.avgFinal - a.avgFinal || a.name.localeCompare(b.name),
  );

  return {
    players,
    finishedGames,
    roundsPlayed,
    overbidRate: roundsPlayed ? overbid / roundsPlayed : 0,
    underbidRate: roundsPlayed ? underbid / roundsPlayed : 0,
    highestFinal,
    bestRound,
    worstRound,
    awards: buildAwards(players, bestRound, worstRound),
  };
}

function buildAwards(
  players: PlayerStats[],
  bestRound: RoundRecord | null,
  worstRound: RoundRecord | null,
): Award[] {
  const awards: Award[] = [];
  const rated = players.filter((p) => p.rounds >= MIN_ROUNDS_FOR_RATES);
  const top = <T>(xs: T[], score: (x: T) => number) =>
    xs.length ? xs.reduce((best, x) => (score(x) > score(best) ? x : best)) : null;

  const reckless = top(rated, (p) => p.bidShare);
  if (reckless) {
    awards.push({ emoji: "🔥", title: "Most reckless", name: reckless.name, detail: `bids ${pct(reckless.bidShare)} of the cards` });
  }
  const timid = top(rated, (p) => -p.bidShare);
  if (timid && timid !== reckless) {
    awards.push({ emoji: "🐢", title: "Most timid", name: timid.name, detail: `bids ${pct(timid.bidShare)} of the cards` });
  }
  const sharp = top(rated, (p) => p.hitRate);
  if (sharp) {
    awards.push({ emoji: "🎯", title: "Sharpshooter", name: sharp.name, detail: `makes ${pct(sharp.hitRate)} of bets` });
  }
  const wishful = top(rated, (p) => -p.hitRate);
  if (wishful && wishful !== sharp) {
    awards.push({ emoji: "🙈", title: "Wishful thinker", name: wishful.name, detail: `makes ${pct(wishful.hitRate)} of bets` });
  }
  const zero = top(players.filter((p) => p.zeroHits > 0), (p) => p.zeroHits);
  if (zero) {
    awards.push({ emoji: "🥚", title: "Zero hero", name: zero.name, detail: `${zero.zeroHits} zero bids made` });
  }
  const spoon = top(players.filter((p) => p.lastPlaces > 0), (p) => p.lastPlaces);
  if (spoon) {
    awards.push({ emoji: "🥄", title: "Wooden spoon", name: spoon.name, detail: `${spoon.lastPlaces} last-place finish${spoon.lastPlaces === 1 ? "" : "es"}` });
  }
  if (bestRound) {
    awards.push({ emoji: "✨", title: "Best round ever", name: bestRound.name, detail: `+${bestRound.score} in round ${bestRound.round}, ${bestRound.gameName}` });
  }
  if (worstRound && worstRound.score < 0) {
    awards.push({ emoji: "💥", title: "Biggest blowup", name: worstRound.name, detail: `${worstRound.score} in round ${worstRound.round}, ${worstRound.gameName}` });
  }
  return awards;
}
