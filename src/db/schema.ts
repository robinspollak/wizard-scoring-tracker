import {
  customType,
  date,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({
  dataType: () => "bytea",
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  playedOn: date("played_on").notNull(),
  numRounds: integer("num_rounds").notNull(),
  // Photos are normalized to a ~1600px JPEG (plus a thumbnail) on upload, so
  // they're small enough to live in Postgres and spare us a separate blob store.
  photo: bytea("photo"),
  photoType: text("photo_type"),
  photoThumb: bytea("photo_thumb"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Seat order is dealing order: seat 0 deals round 1, seat 1 deals round 2, ...
export const gamePlayers = pgTable(
  "game_players",
  {
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    seat: integer("seat").notNull(),
    name: text("name").notNull(),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.seat] })],
);

export const roundEntries = pgTable(
  "round_entries",
  {
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    seat: integer("seat").notNull(),
    bet: integer("bet"),
    score: integer("score"),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.round, t.seat] })],
);

export type Game = typeof games.$inferSelect;
export type GamePlayer = typeof gamePlayers.$inferSelect;
export type RoundEntry = typeof roundEntries.$inferSelect;
