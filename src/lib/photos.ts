import heicConvert from "heic-convert";
import sharp from "sharp";

// The browser shrinks photos before upload when it can; this is the backstop for when it couldn't.
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_EDGE = 1600;
const THUMB_EDGE = 160;

export type PhotoUpload = { photo: Buffer; photoType: string; photoThumb: Buffer };

function isHeic(file: File, bytes: Buffer): boolean {
  if (/image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) return true;
  // ISO-BMFF brand check, for uploads that arrive without a useful type or name.
  return /^ftyp(heic|heix|hevc|mif1|msf1)/.test(bytes.subarray(4, 12).toString("latin1"));
}

/**
 * Normalize any upload (including iPhone HEIC, which most browsers can't
 * display) to an upright JPEG plus a small square thumbnail.
 */
export async function processPhoto(bytes: Buffer, heic: boolean): Promise<PhotoUpload> {
  const source = heic
    ? Buffer.from(await heicConvert({ buffer: bytes, format: "JPEG", quality: 0.92 }))
    : bytes;
  const photo = await sharp(source)
    .rotate()
    .resize(PHOTO_EDGE, PHOTO_EDGE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  const photoThumb = await sharp(photo).resize(THUMB_EDGE, THUMB_EDGE, { fit: "cover" }).jpeg({ quality: 75 }).toBuffer();
  return { photo, photoType: "image/jpeg", photoThumb };
}

/** Returns the processed photo, null if none was chosen, or an error message. */
export async function readPhotoUpload(form: FormData): Promise<PhotoUpload | null | string> {
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_PHOTO_BYTES) return "That photo is too big (4 MB max).";
  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    return await processPhoto(bytes, isHeic(file, bytes));
  } catch {
    return "Couldn't read that photo. Try a JPEG or PNG.";
  }
}
