// Re-process stored photos (HEIC → JPEG) and fill in thumbnails.
import { eq, isNotNull } from "drizzle-orm";
import { db, games } from "../src/db";
import { processPhoto } from "../src/lib/photos";

const rows = await db.select({ id: games.id, photo: games.photo, photoType: games.photoType }).from(games).where(isNotNull(games.photo));
for (const r of rows) {
  const out = await processPhoto(r.photo!, /hei[cf]/i.test(r.photoType ?? ""));
  await db.update(games).set(out).where(eq(games.id, r.id));
  console.log(r.id, r.photoType, r.photo!.length, "→", out.photo.length, "thumb", out.photoThumb.length);
}
process.exit(0);
