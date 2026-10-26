// Shared by the server and the new-game form script, so no server imports here.

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** "Sunday October 25th game 2" for the second game logged on that date. */
export function defaultGameName(playedOn: string, gamesAlreadyThatDay: number): string {
  const d = parseIsoDate(playedOn);
  return `${WEEKDAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${ordinal(d.getUTCDate())} game ${gamesAlreadyThatDay + 1}`;
}

/** "10/25" for the date pill. */
export function shortDate(playedOn: string): string {
  const d = parseIsoDate(playedOn);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** "Sun, Oct 25 2026" for headers. */
export function longDate(playedOn: string): string {
  const d = parseIsoDate(playedOn);
  return `${WEEKDAYS[d.getUTCDay()].slice(0, 3)}, ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()} ${d.getUTCFullYear()}`;
}

export function cleanPlayerName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Players are matched across games by name, ignoring case. */
export function playerKey(name: string): string {
  return cleanPlayerName(name).toLowerCase();
}
