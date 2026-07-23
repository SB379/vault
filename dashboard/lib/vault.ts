import "server-only";
import { cache } from "react";
import { promises as fs } from "fs";
import path from "path";
import {
  parsePaper,
  parseDigest,
  parseConceptsVocab,
  type PaperNote,
  type Digest,
} from "./parse";

export const VAULT_ROOT = process.env.VAULT_ROOT ?? path.resolve(process.cwd(), "..");

async function walkMd(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walkMd(full)));
    else if (e.isFile() && e.name.endsWith(".md")) files.push(full);
  }
  return files;
}

export const getAllPapers = cache(async (): Promise<PaperNote[]> => {
  const files = await walkMd(path.join(VAULT_ROOT, "Papers"));
  const papers: PaperNote[] = [];
  for (const filePath of files) {
    const slug = path.basename(filePath, ".md");
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = parsePaper(raw, slug, filePath);
    if (parsed === null) {
      console.warn(`[vault] skipping malformed paper note: ${filePath}`);
      continue;
    }
    papers.push(parsed);
  }
  papers.sort((a, b) => b.published.localeCompare(a.published));
  return papers;
});

export const getPaper = cache(async (slug: string): Promise<PaperNote | null> => {
  const papers = await getAllPapers();
  return papers.find((p) => p.slug === slug) ?? null;
});

export const getAllDigests = cache(async (): Promise<Digest[]> => {
  const dir = path.join(VAULT_ROOT, "Daily");
  let names: string[];
  try {
    names = (await fs.readdir(dir)).filter((n) => n.endsWith(".md"));
  } catch {
    return [];
  }
  names.sort((a, b) => b.localeCompare(a));
  const digests: Digest[] = [];
  for (const name of names) {
    const raw = await fs.readFile(path.join(dir, name), "utf8");
    digests.push(parseDigest(raw, path.basename(name, ".md")));
  }
  return digests;
});

export const getLatestDigest = cache(async (): Promise<Digest | null> => {
  const digests = await getAllDigests();
  return digests[0] ?? null;
});

export const getConcepts = cache(async (): Promise<string[]> => {
  try {
    const raw = await fs.readFile(path.join(VAULT_ROOT, "_system", "concepts.md"), "utf8");
    return parseConceptsVocab(raw);
  } catch {
    return [];
  }
});

export const getConceptPageNames = cache(async (): Promise<string[]> => {
  try {
    const names = await fs.readdir(path.join(VAULT_ROOT, "Concepts"));
    return names.filter((n) => n.endsWith(".md")).map((n) => path.basename(n, ".md"));
  } catch {
    return [];
  }
});

export const getPapersForConcept = cache(async (name: string): Promise<PaperNote[]> => {
  const papers = await getAllPapers();
  const lower = name.toLowerCase();
  return papers.filter((p) =>
    p.sections.keyTopics.some((t) => t.toLowerCase() === lower)
  );
});

export const getScoreReasons = cache(async (): Promise<Map<string, string>> => {
  const digests = await getAllDigests(); // sorted date desc
  const map = new Map<string, string>();
  // iterate oldest -> newest so latest wins
  for (const digest of [...digests].reverse()) {
    for (const entry of digest.ingested) {
      map.set(entry.slug, entry.reason);
    }
  }
  return map;
});
