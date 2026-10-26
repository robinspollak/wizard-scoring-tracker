import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, gamePlayers, games, roundEntries } from "../db";
import type { RoundEntry } from "../db";
import { cardsInRound, dealerSeat } from "./wizard";

export type Cell = {
  bet: number | null;
  score: number | null;
  /** Running total through this round; null until this round is scored. */
  total: number | null;
};

export type RoundStatus = "empty" | "betting" | "playing" | "done";

export type RoundRow = {
  round: number;
  cards: number;
  dealer: number;
  cells: Cell[];
  status: RoundStatus;
};

export type GameMeta = {
  id: number;
  name: string;
  playedOn: string;
  numRounds: number;
  hasPhoto: boolean;
  createdAt: Date;
};

export type Sheet = {
  game: GameMeta;
  players: string[];
  rounds: RoundRow[];
  totals: number[];
  /** First round that isn't fully scored, or null once the game is over. */
  currentRound: number | null;
  finished: boolean;
  /** Seats tied for the top score; empty until the game is finished. */
  winners: number[];
};

const gameColumns = {
  id: games.id,
  name: games.name,
  playedOn: games.playedOn,
  numRounds: games.numRounds,
  hasPhoto: sql<boolean>`${games.photo} is not null`,
  createdAt: games.createdAt,
};

function buildSheet(game: GameMeta, players: string[], entries: RoundEntry[]): Sheet {
  const n = players.length;
  const byKey = new Map(entries.map((e) => [`${e.round}:${e.seat}`, e]));
  const running = new Array<number>(n).fill(0);
  const rounds: RoundRow[] = [];

  for (let r = 1; r <= game.numRounds; r++) {
    const cells: Cell[] = players.map((_, seat) => {
      const e = byKey.get(`${r}:${seat}`);
      const bet = e?.bet ?? null;
      const score = e?.score ?? null;
      if (score !== null) running[seat] += score;
      return { bet, score, total: score !== null ? running[seat] : null };
    });
    const bets = cells.filter((c) => c.bet !== null).length;
    const scores = cells.filter((c) => c.score !== null).length;
    const status: RoundStatus =
      scores === n ? "done" : bets === n ? "playing" : bets > 0 ? "betting" : "empty";
    rounds.push({ round: r, cards: cardsInRound(r), dealer: dealerSeat(r, n), cells, status });
  }

  const currentRound = rounds.find((r) => r.status !== "done")?.round ?? null;
  const finished = currentRound === null && rounds.length > 0;
  const totals = [...running];
  const best = Math.max(...totals);
  const winners = finished ? totals.flatMap((t, seat) => (t === best ? [seat] : [])) : [];

  return { game, players, rounds, totals, currentRound, finished, winners };
}

export async function loadSheet(id: number): Promise<Sheet | null> {
  const [game] = await db.select(gameColumns).from(games).where(eq(games.id, id));
  if (!game) return null;
  const [players, entries] = await Promise.all([
    db.select().from(gamePlayers).where(eq(gamePlayers.gameId, id)).orderBy(asc(gamePlayers.seat)),
    db.select().from(roundEntries).where(eq(roundEntries.gameId, id)),
  ]);
  return buildSheet(game, players.map((p) => p.name), entries);
}

/** Every game, newest first. Small data, so we just load it all. */
export async function loadAllSheets(): Promise<Sheet[]> {
  const gameRows = await db
    .select(gameColumns)
    .from(games)
    .orderBy(desc(games.playedOn), desc(games.createdAt));
  if (gameRows.length === 0) return [];
  const ids = gameRows.map((g) => g.id);
  const [players, entries] = await Promise.all([
    db.select().from(gamePlayers).where(inArray(gamePlayers.gameId, ids)).orderBy(asc(gamePlayers.seat)),
    db.select().from(roundEntries).where(inArray(roundEntries.gameId, ids)),
  ]);
  return gameRows.map((g) =>
    buildSheet(
      g,
      players.filter((p) => p.gameId === g.id).map((p) => p.name),
      entries.filter((e) => e.gameId === g.id),
    ),
  );
}

export async function countGamesByDate(): Promise<Record<string, number>> {
  const rows = await db
    .select({ playedOn: games.playedOn, n: sql<number>`count(*)::int` })
    .from(games)
    .groupBy(games.playedOn);
  return Object.fromEntries(rows.map((r) => [r.playedOn, r.n]));
}

/** Distinct player names, most recently used spelling, most frequent first. */
export async function knownPlayers(): Promise<string[]> {
  const rows = await db
    .select({ name: gamePlayers.name, gameId: gamePlayers.gameId })
    .from(gamePlayers)
    .orderBy(desc(gamePlayers.gameId));
  const seen = new Map<string, { name: string; count: number }>();
  for (const r of rows) {
    const key = r.name.toLowerCase();
    const hit = seen.get(key);
    if (hit) hit.count++;
    else seen.set(key, { name: r.name, count: 1 });
  }
  return [...seen.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .map((p) => p.name);
}
