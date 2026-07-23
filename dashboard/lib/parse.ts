import matter from "gray-matter";

export interface PaperMeta {
  slug: string;
  filePath: string;
  arxivId: string;
  title: string;
  authors: string[];
  categories: string[];
  published: string;
  score: number;
  url: string;
}

export interface PaperSections {
  tldr?: string;
  abstract?: string;
  keyTopics: string[];
  highlights?: string;
  method?: string;
  evals?: string;
  soWhat?: string;
  openQuestions?: string;
  other: Record<string, string>;
}

export interface PaperNote extends PaperMeta {
  sections: PaperSections;
}

export interface DigestEntry {
  slug: string;
  score: number | null;
  reason: string;
}

export interface Digest {
  date: string;
  ingested: DigestEntry[];
  proposedConcepts: string[];
  failures: string[];
}

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

const KNOWN_HEADINGS: Record<string, keyof Omit<PaperSections, "keyTopics" | "other">> = {
  "TL;DR": "tldr",
  Abstract: "abstract",
  Highlights: "highlights",
  Method: "method",
  "Evals & Results": "evals",
  "So What (for practitioners)": "soWhat",
  "Open Questions / Critiques": "openQuestions",
};

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  return [];
}

export function parsePaper(raw: string, slug: string, filePath: string): PaperNote | null {
  let fm: matter.GrayMatterFile<string>;
  try {
    fm = matter(raw);
  } catch {
    return null;
  }
  const d = fm.data as Record<string, unknown>;
  if (!d || typeof d !== "object" || d.title == null || d.arxiv_id == null) return null;

  const sections: PaperSections = { keyTopics: [], other: {} };

  // Split body into sections on H2 headings.
  const parts = fm.content.split(/^## (.+)$/m);
  // parts[0] is preamble (# Title); then alternating [heading, content, ...]
  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i].trim();
    let content = (parts[i + 1] ?? "").trim();
    if (heading === "Key Topics") {
      const topics: string[] = [];
      for (const m of content.matchAll(WIKILINK_RE)) topics.push(m[1].trim());
      sections.keyTopics = topics;
    } else if (heading === "Abstract") {
      sections.abstract = content
        .split("\n")
        .map((l) => l.replace(/^> ?/, ""))
        .join("\n")
        .trim();
    } else if (heading in KNOWN_HEADINGS) {
      sections[KNOWN_HEADINGS[heading]] = content;
    } else {
      sections.other[heading] = content;
    }
  }

  const publishedRaw = d.published;
  const published =
    publishedRaw instanceof Date
      ? publishedRaw.toISOString().slice(0, 10)
      : String(publishedRaw ?? "");

  return {
    slug,
    filePath,
    arxivId: String(d.arxiv_id ?? ""),
    title: String(d.title ?? ""),
    authors: toStringArray(d.authors),
    categories: toStringArray(d.categories),
    published,
    score: Number(d.score ?? 0),
    url: String(d.url ?? ""),
    sections,
  };
}

const INGESTED_RE = /^- \[\[([^\]]+)\]\]\s+[—–-]+\s+score\s+(\d+):\s*(.+)$/;

export function parseDigest(raw: string, date: string): Digest {
  const digest: Digest = { date, ingested: [], proposedConcepts: [], failures: [] };
  let section: "ingested" | "proposed" | "failures" | null = null;

  for (const line of raw.split("\n")) {
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      const h = h2[1].trim();
      if (h === "Ingested") section = "ingested";
      else if (h.startsWith("Proposed new concepts")) section = "proposed";
      else if (h.startsWith("Failures")) section = "failures";
      else section = null;
      continue;
    }
    if (!line.startsWith("- ")) continue;
    if (section === "ingested") {
      const m = line.match(INGESTED_RE);
      if (m) {
        digest.ingested.push({ slug: m[1], score: Number(m[2]), reason: m[3].trim() });
      } else {
        const wl = line.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/);
        if (wl) {
          const remainder = line
            .replace(/^- /, "")
            .replace(/\[\[[^\]]+\]\]/, "")
            .replace(/^\s*[—–-]+\s*/, "")
            .trim();
          digest.ingested.push({ slug: wl[1], score: null, reason: remainder });
        }
      }
    } else if (section === "proposed") {
      digest.proposedConcepts.push(line.slice(2).trim());
    } else if (section === "failures") {
      digest.failures.push(line.slice(2).trim());
    }
  }
  return digest;
}

export function parseConceptsVocab(raw: string): string[] {
  return raw
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim())
    .filter(Boolean);
}
