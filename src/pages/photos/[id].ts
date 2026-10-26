import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db, games } from "../../db";

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });

  const [row] = await db
    .select({ photo: games.photo, photoType: games.photoType })
    .from(games)
    .where(eq(games.id, id));
  if (!row?.photo) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(row.photo), {
    headers: {
      "Content-Type": row.photoType ?? "image/jpeg",
      // Replacing a photo is rare; a short private cache keeps it snappy without going stale for long.
      "Cache-Control": "private, max-age=300",
    },
  });
};
