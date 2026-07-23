// Throwaway verification probe: run with `npx tsx scripts/probe.ts`
import { promises as fs } from "fs";
import path from "path";
import { parsePaper, parseDigest, parseConceptsVocab } from "../lib/parse";

const VAULT_ROOT = path.resolve(__dirname, "../..");

async function walkMd(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walkMd(full)));
    else if (e.name.endsWith(".md")) out.push(full);
  }
  return out;
}

async function main() {
  const files = await walkMd(path.join(VAULT_ROOT, "Papers"));
  const papers = [];
  for (const f of files) {
    const p = parsePaper(await fs.readFile(f, "utf8"), path.basename(f, ".md"), f);
    if (p) papers.push(p);
    else console.warn("skipped malformed:", f);
  }
  console.log("total papers parsed:", papers.length, "of", files.length, "files");

  const janus = papers.find((p) => p.slug.startsWith("janus"));
  if (janus) {
    const s = janus.sections;
    const present = Object.entries({
      tldr: s.tldr, abstract: s.abstract, keyTopics: s.keyTopics.length,
      highlights: s.highlights, method: s.method, evals: s.evals,
      soWhat: s.soWhat, openQuestions: s.openQuestions,
    }).filter(([, v]) => v).map(([k]) => k);
    console.log("janus sections present:", present.join(", "), `(${present.length}/8)`);
    console.log("janus keyTopics:", s.keyTopics);
    console.log("janus other sections:", Object.keys(s.other));
  }

  const dailyDir = path.join(VAULT_ROOT, "Daily");
  const dailyFiles = (await fs.readdir(dailyDir)).filter((n) => n.endsWith(".md")).sort().reverse();
  const latest = parseDigest(
    await fs.readFile(path.join(dailyDir, dailyFiles[0]), "utf8"),
    dailyFiles[0].replace(/\.md$/, "")
  );
  console.log("latest digest:", latest.date, "entries:", latest.ingested.length);
  console.log("first entry:", latest.ingested[0]);
  console.log("proposed concepts:", latest.proposedConcepts.length, "failures:", latest.failures.length);

  const vocab = parseConceptsVocab(
    await fs.readFile(path.join(VAULT_ROOT, "_system/concepts.md"), "utf8")
  );
  console.log("concept vocab count:", vocab.length);
}

main().catch((e) => { console.error(e); process.exit(1); });
