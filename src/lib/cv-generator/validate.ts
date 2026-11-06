/**
 * Validator for the selection output. The model's answer is untrusted: this
 * is the boundary that keeps the tailored CV to verified facts.
 *
 * - Ids: unknown ids are dropped, duplicates are dropped, each item goes to
 *   the section its highlight belongs to, and counts are capped.
 * - Rewrites: a rewrite may only use what its own highlight says (plus the
 *   verified name and keywords of its employer or project). Any new number,
 *   capitalized name, technology, markup, injection phrase or too much new
 *   wording makes it fall back to the original highlight text. Failing closed
 *   is always safe: the original text is verified.
 * - Summary: the same checks against the sources it cites, the skills list
 *   and the label; on failure, the profile summary from the resume.
 * - Rationale: only for selected items, short, no markup; otherwise dropped.
 *
 * The checks are heuristics tuned to fail closed, not a proof. A false
 * positive costs a rephrasing; a false negative would put an unverified
 * claim on the CV, so every check errs on the side of the original.
 */

import { type Catalog, type CatalogItem, type CatalogSection, sourceText } from "./catalog";
import { LIMITS } from "./config";

export type FallbackReason =
  | "empty"
  | "too_short"
  | "too_long"
  | "markup"
  | "new_number"
  | "new_name"
  | "new_technology"
  | "injection"
  | "inflated"
  | "too_different"
  | "no_sources";

export type CheckResult = { ok: true } | { ok: false; reason: FallbackReason; detail: string };

export interface ValidatedItem {
  id: string;
  section: CatalogSection;
  /** Final text: the rewrite if it passed every check, else the original highlight. */
  text: string;
  rewritten: boolean;
  fallback?: FallbackReason;
}

export interface ValidatedSection {
  section: CatalogSection;
  items: ValidatedItem[];
}

export interface ValidatedSelection {
  summary: { text: string; sourceIds: string[]; rewritten: boolean; fallback?: FallbackReason };
  /** In the order the model put them; sections without items are left out. */
  sections: ValidatedSection[];
  rationale: { id: string; reason: string }[];
  /** Machine-readable notes for logs (dropped ids, caps), never shown to visitors. */
  issues: string[];
}

// ---------------------------------------------------------------------------
// Text helpers

/**
 * Normalizes model text: NFC, no control or format characters (zero-width,
 * bidi overrides), em and en dashes turned into commas, single spaces.
 */
export function sanitize(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .replace(/\s*[–—]\s*/gu, ", ")
    .replace(/\s+/gu, " ")
    .replace(/\s+([,.;:])/gu, "$1")
    .trim();
}

/** Lowercase, without diacritics: "Diseñé" and "disene" compare equal. */
export function fold(word: string): string {
  return word.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

interface Token {
  /** As written. */
  raw: string;
  /** Folded. */
  word: string;
  index: number;
}

/** Words, keeping technology names whole: "Next.js", "C++", "C#", "multi-tenant", "PM2.5". */
const TOKEN = /[\p{L}\p{N}](?:[\p{L}\p{N}]|[.+#'’-](?=[\p{L}\p{N}+#]))*[+#]*/gu;

function tokenize(text: string): Token[] {
  return [...text.matchAll(TOKEN)].map((match) => ({
    raw: match[0],
    word: fold(match[0]),
    index: match.index,
  }));
}

/** Digit groups with separators removed: "2.000", "2,000" and "2000" are the same number. */
function numbersIn(text: string): string[] {
  return [...text.matchAll(/\d+(?:[.,]\d+)*/gu)].map((match) => match[0].replace(/[.,]/gu, ""));
}

const NUMBER_WORDS = new Map<string, string>(
  Object.entries({
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    ten: "10",
    eleven: "11",
    twelve: "12",
    fifteen: "15",
    twenty: "20",
    thirty: "30",
    forty: "40",
    fifty: "50",
    hundred: "100",
    hundreds: "100",
    thousand: "1000",
    thousands: "1000",
    million: "1000000",
    millions: "1000000",
    dozen: "12",
    dozens: "12",
    double: "2",
    twice: "2",
    triple: "3",
    dos: "2",
    tres: "3",
    cuatro: "4",
    cinco: "5",
    seis: "6",
    siete: "7",
    ocho: "8",
    nueve: "9",
    diez: "10",
    doce: "12",
    quince: "15",
    veinte: "20",
    treinta: "30",
    cuarenta: "40",
    cincuenta: "50",
    cien: "100",
    ciento: "100",
    cientos: "100",
    mil: "1000",
    miles: "1000",
    millon: "1000000",
    millones: "1000000",
    docena: "12",
    docenas: "12",
    decenas: "10",
    doble: "2",
  }),
);

/**
 * Lowercase technology names that a rewrite must not introduce. Capitalized
 * names are caught by the name check; this list catches the lowercase ones.
 */
const TECHNOLOGIES = new Set(
  [
    "android",
    "angular",
    "ansible",
    "aws",
    "azure",
    "bash",
    "bigquery",
    "blockchain",
    "c#",
    "c++",
    "cassandra",
    "ci/cd",
    "django",
    "docker",
    "dynamodb",
    "elasticsearch",
    "electron",
    "ethereum",
    "excel",
    "fastapi",
    "figma",
    "firebase",
    "flask",
    "gcp",
    "git",
    "github",
    "gitlab",
    "golang",
    "graphql",
    "grpc",
    "hadoop",
    "helm",
    "html",
    "ios",
    "java",
    "javascript",
    "jenkins",
    "jira",
    "jquery",
    "jwt",
    "kafka",
    "kotlin",
    "kubernetes",
    "k8s",
    "laravel",
    "linux",
    "llm",
    "llms",
    "mongodb",
    "mysql",
    "nestjs",
    "next.js",
    "nextjs",
    "nginx",
    "node.js",
    "nodejs",
    "oauth",
    "openai",
    "oracle",
    "pandas",
    "php",
    "postgres",
    "postgresql",
    "python",
    "pytorch",
    "rabbitmq",
    "rails",
    "react",
    "redis",
    "ruby",
    "rust",
    "s3",
    "scala",
    "selenium",
    "solidity",
    "spark",
    "sql",
    "sqlite",
    "supabase",
    "svelte",
    "swift",
    "tailwind",
    "tensorflow",
    "terraform",
    "typescript",
    "vercel",
    "vue",
    "webassembly",
    "wasm",
    "zod",
  ].map(fold),
);

/** Phrases that read as instructions or as a pitch, never as a CV fact. */
const INJECTION_WORDS = new Set(
  [
    "ignore",
    "ignored",
    "ignora",
    "ignoren",
    "ignorar",
    "instruction",
    "instructions",
    "instruccion",
    "instrucciones",
    "prompt",
    "jailbreak",
    "hire",
    "hired",
    "contratar",
    "contraten",
    "contratenme",
    "contratame",
    "recommend",
    "recommended",
    "recomiendo",
    "recomendado",
    "candidate",
    "candidato",
    "candidata",
  ].map(fold),
);

/** Inflating words: a claim about seniority or quality that no highlight makes. */
const INFLATING_WORDS = new Set(
  [
    "expert",
    "experto",
    "experta",
    "senior",
    "extensive",
    "amplia",
    "amplio",
    "years",
    "anos",
    "decade",
    "decada",
    "leader",
    "leadership",
    "lider",
    "liderazgo",
    "lidere",
    "led",
    "managed",
    "dirigi",
    "passionate",
    "apasionado",
    "proven",
    "demostrada",
    "world-class",
    "best",
    "mejor",
    "excellent",
    "excelente",
    "outstanding",
    "destacado",
    "guru",
    "ninja",
    "rockstar",
  ].map(fold),
);

/** Neutral words that may open a sentence without appearing in the source. */
const SENTENCE_STARTERS = new Set(
  [
    "a",
    "an",
    "the",
    "in",
    "on",
    "for",
    "with",
    "as",
    "at",
    "from",
    "during",
    "using",
    "this",
    "these",
    "my",
    "also",
    "and",
    "built",
    "designed",
    "developed",
    "implemented",
    "created",
    "automated",
    "integrated",
    "documented",
    "wrote",
    "contributed",
    "worked",
    "el",
    "la",
    "los",
    "las",
    "un",
    "una",
    "en",
    "para",
    "con",
    "como",
    "desde",
    "durante",
    "usando",
    "este",
    "esta",
    "estos",
    "estas",
    "mi",
    "mis",
    "tambien",
    "y",
    "construi",
    "disene",
    "desarrolle",
    "implemente",
    "cree",
    "automatice",
    "integre",
    "documente",
    "escribi",
    "contribui",
    "trabaje",
    "participe",
  ].map(fold),
);

/** Function words that do not count as new wording. */
const STOPWORDS = new Set(
  [
    "about",
    "across",
    "also",
    "both",
    "each",
    "from",
    "into",
    "more",
    "most",
    "only",
    "over",
    "same",
    "such",
    "than",
    "that",
    "their",
    "them",
    "then",
    "there",
    "these",
    "they",
    "this",
    "those",
    "through",
    "using",
    "very",
    "were",
    "what",
    "when",
    "where",
    "which",
    "while",
    "with",
    "within",
    "without",
    "aunque",
    "cada",
    "como",
    "cual",
    "cuando",
    "desde",
    "donde",
    "durante",
    "ellos",
    "entre",
    "esta",
    "estas",
    "este",
    "estos",
    "hacia",
    "hasta",
    "mediante",
    "mismo",
    "otra",
    "otras",
    "otro",
    "otros",
    "para",
    "pero",
    "porque",
    "segun",
    "sobre",
    "solo",
    "tambien",
    "toda",
    "todas",
    "todo",
    "todos",
  ].map(fold),
);

const MARKUP = /[<>{}[\]`*\\]|https?:\/\/|www\.|\w@\w|\]\(/u;

function stem(word: string): string {
  return word.slice(0, 5);
}

interface Vocabulary {
  words: Set<string>;
  stems: Set<string>;
  numbers: Set<string>;
  /** All sources, folded, for phrase checks. */
  folded: string;
  hasMarkup: boolean;
  hasPercent: boolean;
}

function vocabulary(sources: readonly string[]): Vocabulary {
  const words = new Set<string>();
  const stems = new Set<string>();
  const numbers = new Set<string>();
  for (const source of sources) {
    for (const token of tokenize(source)) {
      words.add(token.word);
      stems.add(stem(token.word));
      // "Supabase/PostgreSQL" or "Next.js": also index the parts.
      for (const part of token.word.split(/[./+#'’-]/u)) {
        if (part) words.add(part);
      }
    }
    for (const number of numbersIn(source)) numbers.add(number);
  }
  const joined = sources.join("\n");
  return {
    words,
    stems,
    numbers,
    folded: fold(joined),
    hasMarkup: MARKUP.test(joined),
    hasPercent: joined.includes("%"),
  };
}

function knownWord(word: string, vocab: Vocabulary): boolean {
  if (vocab.words.has(word)) return true;
  if (word.endsWith("es") && vocab.words.has(word.slice(0, -2))) return true;
  if (word.endsWith("s") && vocab.words.has(word.slice(0, -1))) return true;
  return vocab.words.has(`${word}s`) || vocab.words.has(`${word}es`);
}

/**
 * A word is known if the sources contain it, its singular or its plural,
 * ignoring a possessive "'s"; a hyphenated word is also known if every part is.
 */
function known(word: string, vocab: Vocabulary): boolean {
  const base = word.replace(/['’]s$/u, "");
  if (knownWord(base, vocab)) return true;
  const parts = base.split(/[-/]/u).filter(Boolean);
  return parts.length > 1 && parts.every((part) => knownWord(part, vocab));
}

function isSentenceStart(text: string, index: number): boolean {
  const before = text.slice(0, index).trimEnd();
  return before === "" || /[.!?:;]["'»”)]?$/u.test(before);
}

export interface TextRules {
  maxChars: number;
  minChars: number;
  /** Share of content words (4+ letters) whose stem is not in the sources. */
  maxNovelRatio: number;
  maxNovelCount: number;
}

export const REWRITE_RULES: Omit<TextRules, "maxChars"> = {
  minChars: LIMITS.rewriteMinChars,
  maxNovelRatio: 0.35,
  maxNovelCount: 6,
};

export const SUMMARY_RULES: TextRules = {
  maxChars: LIMITS.summaryMaxChars,
  minChars: LIMITS.summaryMinChars,
  maxNovelRatio: 0.5,
  maxNovelCount: 14,
};

function fail(reason: FallbackReason, detail: string): CheckResult {
  return { ok: false, reason, detail };
}

/**
 * Checks that `candidate` (already sanitized) says nothing that `sources`
 * do not say. See the module comment for the rules.
 */
export function checkText(
  candidate: string,
  sources: readonly string[],
  rules: TextRules,
): CheckResult {
  if (candidate.length === 0) return fail("empty", "");
  if (candidate.length < rules.minChars) return fail("too_short", String(candidate.length));
  if (candidate.length > rules.maxChars) return fail("too_long", String(candidate.length));

  const vocab = vocabulary(sources);

  if (MARKUP.test(candidate) && !vocab.hasMarkup) return fail("markup", "");
  if (candidate.includes("%") && !vocab.hasPercent) return fail("new_number", "%");

  for (const number of numbersIn(candidate)) {
    if (!vocab.numbers.has(number)) return fail("new_number", number);
  }

  const tokens = tokenize(candidate);
  let content = 0;
  let novel = 0;

  for (const token of tokens) {
    const { raw, word } = token;

    const asNumber = NUMBER_WORDS.get(word);
    if (asNumber && !known(word, vocab) && !vocab.numbers.has(asNumber)) {
      return fail("new_number", raw);
    }
    if (INJECTION_WORDS.has(word) && !known(word, vocab)) return fail("injection", raw);
    if (INFLATING_WORDS.has(word) && !known(word, vocab)) return fail("inflated", raw);
    if (TECHNOLOGIES.has(word) && !known(word, vocab)) return fail("new_technology", raw);

    // Names: anything with a capital letter, a digit next to letters or a
    // technical symbol must come from the sources. A capitalized word that
    // opens a sentence may also be a neutral starter ("Built", "Diseñé").
    const numeric = /^[\p{N}.,]+$/u.test(raw);
    const hasCapital = /\p{Lu}/u.test(raw);
    const technical = /[.+#]/u.test(raw) || (/\p{N}/u.test(raw) && /\p{L}/u.test(raw));
    if (!numeric && (hasCapital || technical) && !known(word, vocab)) {
      const plainCapitalized = /^\p{Lu}[\p{Ll}'’-]*$/u.test(raw);
      const starter =
        plainCapitalized && isSentenceStart(candidate, token.index) && SENTENCE_STARTERS.has(word);
      if (!starter) return fail(technical && !hasCapital ? "new_technology" : "new_name", raw);
    }

    if (word.length >= 4 && !STOPWORDS.has(word) && !/^\p{N}/u.test(word)) {
      content += 1;
      if (!vocab.stems.has(stem(word))) novel += 1;
    }
  }

  if (novel > rules.maxNovelCount || (content > 0 && novel / content > rules.maxNovelRatio)) {
    return fail("too_different", `${novel}/${content}`);
  }
  return { ok: true };
}

/** Checks a rewrite against its own highlight and the verified terms of its entry. */
export function checkRewrite(rewrite: string, item: CatalogItem): CheckResult {
  const maxChars = Math.min(LIMITS.rewriteMaxChars, item.text.length + 40);
  return checkText(rewrite, [item.text, ...item.entryTerms], {
    ...REWRITE_RULES,
    maxChars: Math.max(maxChars, item.text.length),
  });
}

// ---------------------------------------------------------------------------
// Selection

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeId(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function text(value: unknown): string {
  return typeof value === "string" ? sanitize(value) : "";
}

function validateItems(raw: Record<string, unknown>, catalog: Catalog, issues: string[]) {
  const seen = new Set<string>();
  const order: CatalogSection[] = [];
  const bySection = new Map<CatalogSection, ValidatedItem[]>();
  let total = 0;

  for (const rawSection of list(raw.sections)) {
    if (!isRecord(rawSection)) continue;
    for (const rawItem of list(rawSection.items)) {
      if (!isRecord(rawItem)) continue;
      const id = normalizeId(rawItem.source_id);
      const item = catalog.byId.get(id);
      if (!item) {
        issues.push(`unknown_id:${id.slice(0, 60)}`);
        continue;
      }
      if (seen.has(id)) {
        issues.push(`duplicate_id:${id}`);
        continue;
      }
      if (total >= LIMITS.maxItemsTotal) {
        issues.push(`over_total_cap:${id}`);
        continue;
      }
      const items = bySection.get(item.section) ?? [];
      if (items.length >= LIMITS.maxItemsPerSection) {
        issues.push(`over_section_cap:${id}`);
        continue;
      }
      if (rawSection.section !== item.section) issues.push(`section_mismatch:${id}`);

      seen.add(id);
      total += 1;
      if (!bySection.has(item.section)) {
        bySection.set(item.section, items);
        order.push(item.section);
      }

      const rewrite = text(rawItem.rewrite);
      const check = checkRewrite(rewrite, item);
      if (check.ok) {
        items.push({ id, section: item.section, text: rewrite, rewritten: rewrite !== item.text });
      } else {
        issues.push(`rewrite_fallback:${id}:${check.reason}`);
        items.push({
          id,
          section: item.section,
          text: item.text,
          rewritten: false,
          fallback: check.reason,
        });
      }
    }
  }

  return order.map((section) => ({ section, items: bySection.get(section) ?? [] }));
}

function validateSummary(
  raw: Record<string, unknown>,
  catalog: Catalog,
  issues: string[],
): ValidatedSelection["summary"] {
  const original = catalog.profileSummary ?? "";
  const rawSummary = isRecord(raw.summary) ? raw.summary : {};
  const sourceIds = [...new Set(list(rawSummary.source_ids).map(normalizeId))].filter(
    (id) => sourceText(catalog, id) !== undefined,
  );

  const fallback = (reason: FallbackReason, detail = "") => {
    issues.push(`summary_fallback:${reason}${detail ? `:${detail}` : ""}`);
    return { text: original, sourceIds: [], rewritten: false, fallback: reason };
  };

  if (sourceIds.length === 0) return fallback("no_sources");

  const sources = [
    ...sourceIds.map((id) => sourceText(catalog, id) ?? ""),
    ...sourceIds.flatMap((id) => catalog.byId.get(id)?.entryTerms ?? []),
    ...catalog.skillTerms,
    catalog.label,
  ];
  const candidate = text(rawSummary.text);
  const check = checkText(candidate, sources, SUMMARY_RULES);
  if (!check.ok) return fallback(check.reason, check.detail);
  return { text: candidate, sourceIds, rewritten: candidate !== original };
}

function validateRationale(
  raw: Record<string, unknown>,
  selected: ReadonlySet<string>,
  issues: string[],
): ValidatedSelection["rationale"] {
  const seen = new Set<string>();
  const rationale: ValidatedSelection["rationale"] = [];
  for (const entry of list(raw.rationale)) {
    if (!isRecord(entry)) continue;
    const id = normalizeId(entry.source_id);
    if (!selected.has(id) || seen.has(id)) {
      issues.push(`rationale_dropped:${id.slice(0, 60)}`);
      continue;
    }
    const reason = text(entry.reason);
    if (reason.length === 0 || reason.length > LIMITS.reasonMaxChars || MARKUP.test(reason)) {
      issues.push(`rationale_dropped:${id}`);
      continue;
    }
    seen.add(id);
    rationale.push({ id, reason });
  }
  return rationale;
}

/** Validates the raw selection output (parsed JSON of unknown shape) against a catalog. */
export function validateSelection(raw: unknown, catalog: Catalog): ValidatedSelection {
  const issues: string[] = [];
  const record = isRecord(raw) ? raw : {};
  if (!isRecord(raw)) issues.push("not_an_object");

  const sections = validateItems(record, catalog, issues);
  const selected = new Set(sections.flatMap((section) => section.items.map((item) => item.id)));
  return {
    summary: validateSummary(record, catalog, issues),
    sections,
    rationale: validateRationale(record, selected, issues),
    issues,
  };
}
