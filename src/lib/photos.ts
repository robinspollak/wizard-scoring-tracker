// The browser shrinks photos before upload; this is the backstop for when it couldn't.
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export type PhotoUpload = { photo: Buffer; photoType: string };

/** Returns the uploaded photo, null if none was chosen, or an error message. */
export async function readPhotoUpload(form: FormData): Promise<PhotoUpload | null | string> {
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/")) return "That file isn't an image.";
  if (file.size > MAX_PHOTO_BYTES) return "That photo is too big (4 MB max).";
  return { photo: Buffer.from(await file.arrayBuffer()), photoType: file.type };
}
