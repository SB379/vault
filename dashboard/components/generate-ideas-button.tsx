"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function GenerateIdeasButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setNote(null);
    try {
      const res = await fetch("/api/ideas", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status === "ok") {
        router.refresh();
      } else if (res.status === 409) {
        setNote("Generation already running — try again in a minute.");
      } else {
        setNote(data.message ?? "Generation failed.");
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
        onClick={generate}
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
            generating… (~1 min)
          </>
        ) : (
          <>
            <Sparkles className="size-3.5" />
            generate ideas
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
