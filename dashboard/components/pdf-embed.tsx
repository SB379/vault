"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Lazily embeds the arXiv PDF. If the iframe hasn't loaded within the timeout
 * (blocked, offline, slow), shows a fallback card instead. An "Open on arXiv"
 * button is always visible.
 */
export function PdfEmbed({ arxivId }: { arxivId: string }) {
  const pdfUrl = `https://arxiv.org/pdf/${arxivId}`;
  const absUrl = `https://arxiv.org/abs/${arxivId}`;
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setState((s) => (s === "loading" ? "failed" : s));
    }, 12000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex h-full min-h-[60vh] flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="kicker">Paper PDF</span>
        <Button
          variant="outline"
          size="sm"
          render={
            <a href={absUrl} target="_blank" rel="noopener noreferrer">
              Open on arXiv ↗
            </a>
          }
        />
      </div>
      {state === "failed" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="font-display text-lg italic text-foreground">
            The PDF didn&apos;t load here.
          </p>
          <p className="max-w-xs text-sm text-muted-foreground">
            arXiv may be blocking embedded viewing. You can still read it
            directly on arXiv.
          </p>
          <Button
            render={
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                Open PDF ↗
              </a>
            }
          />
        </div>
      ) : (
        <div className="relative flex-1 overflow-hidden rounded-lg border border-border bg-card">
          {state === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-xs tracking-[0.18em] uppercase text-muted-foreground animate-pulse">
                loading pdf…
              </span>
            </div>
          )}
          <iframe
            ref={ref}
            src={pdfUrl}
            title={`arXiv PDF ${arxivId}`}
            loading="lazy"
            className="relative h-full w-full min-h-[60vh]"
            onLoad={() => setState("loaded")}
            onError={() => setState("failed")}
          />
        </div>
      )}
    </div>
  );
}
