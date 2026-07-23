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

export interface Idea {
  title: string;
  description: string;
  rationale: string;
  sourceSlugs: string[];
}

export interface IdeasNote {
  date: string;
  pipelineImprovements: Idea[];
  buildIdeas: Idea[];
}

function parseIdeaBlocks(content: string): Idea[] {
  const ideas: Idea[] = [];
  const parts = content.split(/^### (.+)$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].trim();
    const body = (parts[i + 1] ?? "").trim();
    const lines = body.split("\n");
    const descLines: string[] = [];
    let rationale = "";
    const sourceSlugs: string[] = [];
    for (const line of lines) {
      const whyMatch = line.match(/^\*Why:\*\s*(.*)$/);
      const srcMatch = line.match(/^\*Sources:\*\s*(.*)$/);
      if (whyMatch) {
        rationale = whyMatch[1].trim();
      } else if (srcMatch) {
        for (const m of srcMatch[1].matchAll(WIKILINK_RE)) {
          sourceSlugs.push(m[1].trim());
        }
      } else {
        descLines.push(line);
      }
    }
    ideas.push({
      title,
      description: descLines.join("\n").trim(),
      rationale,
      sourceSlugs,
    });
  }
  return ideas;
}

export function parseIdeasNote(raw: string, date: string): IdeasNote {
  const note: IdeasNote = { date, pipelineImprovements: [], buildIdeas: [] };
  const parts = raw.split(/^## (.+)$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i].trim().toLowerCase();
    const content = parts[i + 1] ?? "";
    if (heading === "pipeline improvements") {
      note.pipelineImprovements = parseIdeaBlocks(content);
    } else if (heading === "build ideas") {
      note.buildIdeas = parseIdeaBlocks(content);
    }
  }
  return note;
}

export type ResearchVerdict = "GAP" | "CROWDED" | "UNCLEAR";

export interface ResearchNote {
  date: string;
  ideaTitle: string;
  verdict: ResearchVerdict | null;
  body: string;
  slug: string;
}

export function parseResearchNote(raw: string, filename: string): ResearchNote {
  const slug = filename.replace(/\.md$/, "");
  const dateMatch = slug.match(/^(\d{4}-\d{2}-\d{2})/);
  let fm: matter.GrayMatterFile<string>;
  let data: Record<string, unknown> = {};
  let body = raw;
  try {
    fm = matter(raw);
    data = fm.data as Record<string, unknown>;
    body = fm.content.trim();
  } catch {
    // fall through with raw body
  }
  // Strip the leading `# Title` line — the page renders the title itself.
  body = body.replace(/^# .+\n+/, "");

  const date =
    data.date instanceof Date
      ? data.date.toISOString().slice(0, 10)
      : String(data.date ?? dateMatch?.[1] ?? "");

  let verdict: ResearchVerdict | null = null;
  const verdictSection = body.match(/(?:^|\n)## Verdict\n([\s\S]*?)(?=\n## |$)/);
  if (verdictSection) {
    const v = verdictSection[1].match(/\b(GAP|CROWDED|UNCLEAR)\b/);
    if (v) verdict = v[1] as ResearchVerdict;
  }

  return {
    date,
    ideaTitle: String(data.idea_title ?? slug),
    verdict,
    body,
    slug,
  };
}

export function parseConceptsVocab(raw: string): string[] {
  return raw
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim())
    .filter(Boolean);
}

export type BacklogStatus = "proposed" | "specced" | "done";

export interface BacklogItem {
  seq: number;
  slug: string;
  title: string;
  status: BacklogStatus;
  source: string;
  created: string;
  description: string;
  spec: string;
  buildPlan: string;
}

function backlogSection(body: string, heading: string): string {
  const m = body.match(new RegExp(`(?:^|\\n)## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`));
  return m ? m[1].trim() : "";
}

export function parseBacklogItem(raw: string, filename: string): BacklogItem | null {
  const slug = filename.replace(/\.md$/, "");
  const seqMatch = slug.match(/^(\d{3})-/);
  if (!seqMatch) return null;
  let data: Record<string, unknown> = {};
  let body = raw;
  try {
    const fm = matter(raw);
    data = fm.data as Record<string, unknown>;
    body = fm.content.trim();
  } catch {
    return null;
  }
  const status = String(data.status ?? "proposed");
  if (!["proposed", "specced", "done"].includes(status)) return null;
  const description = body.split(/\n## /)[0].trim();
  const created =
    data.created instanceof Date
      ? data.created.toISOString().slice(0, 10)
      : String(data.created ?? "");
  return {
    seq: parseInt(seqMatch[1], 10),
    slug,
    title: String(data.title ?? slug),
    status: status as BacklogStatus,
    source: String(data.source ?? ""),
    created,
    description,
    spec: backlogSection(body, "Spec"),
    buildPlan: backlogSection(body, "Build plan"),
  };
}
