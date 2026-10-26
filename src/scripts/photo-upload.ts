// Phone photos are several MB; Vercel functions cap request bodies at 4.5 MB.
// Shrink the chosen photo to a JPEG in the browser, then submit the form via fetch.
const MAX_EDGE = 1600;

async function shrink(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  } catch {
    // Formats the browser can't decode (e.g. HEIC outside Safari) go up as-is.
    return null;
  }
}

for (const form of document.querySelectorAll<HTMLFormElement>("form[data-photo-upload]")) {
  form.addEventListener("submit", async (event) => {
    const input = form.querySelector<HTMLInputElement>('input[type="file"][name="photo"]');
    const file = input?.files?.[0];
    if (!file || event.defaultPrevented) return;
    event.preventDefault();

    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Uploading…";
    }

    const body = new FormData(form);
    const small = await shrink(file);
    if (small) body.set("photo", small, "photo.jpg");

    const res = await fetch(form.action || location.href, { method: "POST", body });
    if (res.redirected) {
      location.href = res.url;
    } else {
      document.open();
      document.write(await res.text());
      document.close();
    }
  });
}
