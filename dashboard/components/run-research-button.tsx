"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Radar } from "lucide-react";
import { cn } from "@/lib/utils";

export function RunResearchButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function run() {
    if (
      !window.confirm(
        "Run market research over the latest build ideas? This does real web research per idea and may take several minutes."
      )
    ) {
      return;
    }
    setLoading(true);
    setNote(null);
    try {
      const res = await fetch("/api/research", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status === "ok") {
        router.refresh();
      } else if (res.status === 409) {
        setNote("Research already running — try again in a few minutes.");
      } else {
        setNote(data.message ?? "Research failed.");
      }
    } catch {
      setNote("Request failed — is the server up?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={run}
        disabled={loading}
        className={cn(
          "inline-flex items-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 py-2",
          "font-mono text-xs tracking-[0.12em] uppercase text-primary transition-colors",
          "hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        {loading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            researching… (several min)
          </>
        ) : (
          <>
            <Radar className="size-3.5" />
            Run market research
          </>
        )}
      </button>
      {note && (
        <p className="font-mono text-[10px] tracking-wide text-muted-foreground">
          {note}
        </p>
      )}
    </div>
  );
}
