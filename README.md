# Whizard

Score tracker for our games of Wizard: bets and scores round by round, plus a
leaderboard and some silly awards across games.

House rules baked in (`src/lib/wizard.ts`): a plain 52-card deck (aces are
wizards, twos are jesters), round 1 deals 3 cards each, each round deals one
more, up to `floor(52 / players)` cards. The table's bets can't add up to the
number of cards in the round. Scores are entered by hand; a positive round
score counts as a made bet for the stats.

Stack: Astro (server output) on Vercel, Postgres via Drizzle. Photos are shrunk
in the browser and stored in Postgres. The whole site sits behind one password
(`SITE_PASSWORD`, default `whizard`).

## Local dev

```sh
npm install
vercel env pull .env.local   # or put DATABASE_URL in .env
npm run db:migrate   # Vercel also runs migrations on every deploy (vercel-build)
npm run dev
```

## Schema changes

Edit `src/db/schema.ts`, then `npm run db:generate` and `npm run db:migrate`.
