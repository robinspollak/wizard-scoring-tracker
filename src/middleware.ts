import { defineMiddleware } from "astro:middleware";
import { AUTH_COOKIE, isAuthed } from "./lib/auth";

const PUBLIC_PATHS = new Set(["/login", "/favicon.svg"]);
const PUBLIC_PREFIXES = ["/_astro/"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (PUBLIC_PATHS.has(pathname)) return next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return next();

  if (isAuthed(context.cookies.get(AUTH_COOKIE)?.value)) return next();

  const loginUrl = new URL("/login", context.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname + context.url.search);
  return context.redirect(loginUrl.pathname + loginUrl.search);
});
