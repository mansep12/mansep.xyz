/**
 * Date labels for CV data and page stamps. Dates come as ISO 8601 strings
 * with optional month and day ("2024", "2024-07", "2024-07-11"), as in
 * JSON Resume. Ranges use words ("a", "to") instead of dashes.
 */

import type { Lang } from "../i18n/locales";

export type MonthStyle = "short" | "long";

const MONTHS: Record<Lang, Record<MonthStyle, readonly string[]>> = {
  es: {
    long: [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ],
    short: [
      "ene.",
      "feb.",
      "mar.",
      "abr.",
      "may.",
      "jun.",
      "jul.",
      "ago.",
      "sept.",
      "oct.",
      "nov.",
      "dic.",
    ],
  },
  en: {
    long: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    short: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
};

const RANGE_WORDS: Record<Lang, { to: string; present: string }> = {
  es: { to: "a", present: "a la fecha" },
  en: { to: "to", present: "to present" },
};

const ISO_DATE = /^(\d{4})(?:-(\d{2})(?:-\d{2})?)?$/;

function monthName(lang: Lang, month: number, style: MonthStyle): string {
  const name = MONTHS[lang][style][month - 1];
  if (!name) {
    throw new Error(`Invalid month ${month}`);
  }
  return name;
}

function monthYear(lang: Lang, year: string, month: number, style: MonthStyle): string {
  const name = monthName(lang, month, style);
  return lang === "es" && style === "long" ? `${name} de ${year}` : `${name} ${year}`;
}

/** "jul. 2024" / "Jul 2024" (short) or "julio de 2024" / "July 2024" (long); "2024" for a bare year. */
export function formatDate(iso: string, lang: Lang, style: MonthStyle = "short"): string {
  const match = ISO_DATE.exec(iso);
  if (!match) {
    throw new Error(`Invalid date "${iso}": use YYYY, YYYY-MM or YYYY-MM-DD`);
  }
  const [, year = "", month] = match;
  return month ? monthYear(lang, year, Number(month), style) : year;
}

/** "jul. 2024 a abr. 2026", "mar. 2025 a la fecha", or a single date when both ends match. */
export function formatDateRange(
  start: string | undefined,
  end: string | undefined,
  lang: Lang,
  style: MonthStyle = "short",
): string {
  const words = RANGE_WORDS[lang];
  if (!start) {
    return end ? formatDate(end, lang, style) : "";
  }
  const from = formatDate(start, lang, style);
  if (!end) {
    return `${from} ${words.present}`;
  }
  const to = formatDate(end, lang, style);
  return from === to ? from : `${from} ${words.to} ${to}`;
}

/** Year and month of an instant in a time zone, as "YYYY-MM" (e.g. for `<time datetime>`). */
export function isoYearMonth(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}
