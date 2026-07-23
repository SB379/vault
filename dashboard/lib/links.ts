import type { LinkMap } from "@/components/markdown-lite";

export function conceptHref(name: string): string {
  return `/concepts/${encodeURIComponent(name)}`;
}

export function paperHref(slug: string): string {
  return `/papers/${encodeURIComponent(slug)}`;
}

/**
 * Build a wikilink resolution map: paper slugs -> /papers/…,
 * concept names (case-insensitive) -> /concepts/… .
 * Keys are lowercased; paper slugs win on collision (more specific).
 */
export function buildLinkMap(paperSlugs: string[], conceptNames: string[]): LinkMap {
  const map: LinkMap = {};
  for (const name of conceptNames) {
    map[name.toLowerCase()] = conceptHref(name);
  }
  for (const slug of paperSlugs) {
    map[slug.toLowerCase()] = paperHref(slug);
  }
  return map;
}
