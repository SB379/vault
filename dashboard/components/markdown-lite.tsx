import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Minimal markdown renderer for vault note sections.
 * Supports: paragraphs, `- ` bullet lists, **bold**, `code`, and [[wikilinks]].
 * Wikilinks resolve via `links` (lowercased name -> href); unresolved links
 * render as a muted span — never a dead link. Builds React nodes; no HTML injection.
 */
export type LinkMap = Record<string, string>;

const INLINE_RE = /(\*\*[^*]+\*\*|`[^`]+`|\[\[[^\]]+\]\])/g;

function renderInline(text: string, links: LinkMap, keyBase: string): ReactNode[] {
  const parts = text.split(INLINE_RE);
  return parts.map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={key} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={key}
          className="rounded-sm bg-secondary px-1 py-px font-mono text-[0.85em] text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("[[") && part.endsWith("]]")) {
      const inner = part.slice(2, -2);
      const [target, alias] = inner.split("|");
      const label = (alias ?? target).trim();
      const href = links[target.trim().toLowerCase()];
      if (href) {
        return (
          <Link
            key={key}
            href={href}
            className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
          >
            {label}
          </Link>
        );
      }
      return (
        <span key={key} className="text-muted-foreground" title="Unresolved link">
          {label}
        </span>
      );
    }
    return part;
  });
}

export function MarkdownLite({
  text,
  links = {},
  className,
}: {
  text: string;
  links?: LinkMap;
  className?: string;
}) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let bullets: string[] = [];

  const flushPara = () => {
    if (para.length) {
      const t = para.join(" ");
      blocks.push(
        <p key={`p-${blocks.length}`} className="leading-relaxed">
          {renderInline(t, links, `p-${blocks.length}`)}
        </p>
      );
      para = [];
    }
  };
  const flushBullets = () => {
    if (bullets.length) {
      blocks.push(
        <ul
          key={`ul-${blocks.length}`}
          className="list-disc space-y-1.5 pl-5 marker:text-primary/60"
        >
          {bullets.map((b, i) => (
            <li key={i} className="leading-relaxed">
              {renderInline(b, links, `li-${blocks.length}-${i}`)}
            </li>
          ))}
        </ul>
      );
      bullets = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      flushPara();
      flushBullets();
    } else if (line.trimStart().startsWith("- ")) {
      flushPara();
      bullets.push(line.trimStart().slice(2));
    } else {
      flushBullets();
      para.push(line.trim());
    }
  }
  flushPara();
  flushBullets();

  return <div className={className ?? "space-y-3 text-sm text-foreground/90"}>{blocks}</div>;
}
