import { createHash } from "node:crypto";

export const AUTH_COOKIE = "whizard";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 365;

function sitePassword(): string {
  return process.env.SITE_PASSWORD ?? import.meta.env.SITE_PASSWORD ?? "whizard";
}

// Not real security — just enough that the cookie changes if the password does.
export function authToken(): string {
  return createHash("sha256").update(`whizard:${sitePassword()}`).digest("hex");
}

export function passwordMatches(input: string): boolean {
  return input.trim().toLowerCase() === sitePassword().toLowerCase();
}

export function isAuthed(cookieValue: string | undefined): boolean {
  return cookieValue === authToken();
}
