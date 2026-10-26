CREATE TABLE "game_players" (
	"game_id" integer NOT NULL,
	"seat" integer NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "game_players_game_id_seat_pk" PRIMARY KEY("game_id","seat")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"played_on" date NOT NULL,
	"num_rounds" integer NOT NULL,
	"photo" "bytea",
	"photo_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "round_entries" (
	"game_id" integer NOT NULL,
	"round" integer NOT NULL,
	"seat" integer NOT NULL,
	"bet" integer,
	"score" integer,
	CONSTRAINT "round_entries_game_id_round_seat_pk" PRIMARY KEY("game_id","round","seat")
);
--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_entries" ADD CONSTRAINT "round_entries_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;