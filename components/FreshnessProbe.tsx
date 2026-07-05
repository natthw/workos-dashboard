"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls the cheap /api/realm/version probe and re-pulls the page (router.refresh)
 * only when the vault actually changed — so an edit made in Obsidian, by an AI
 * agent, or by Google Drive sync shows up here without a manual reload, and
 * without re-scanning on a blind timer. Also checks on window focus / tab return.
 */
export function FreshnessProbe({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();
  const seen = useRef<number | null>(null);

  useEffect(() => {
    let stopped = false;

    async function check() {
      try {
        const r = await fetch("/api/realm/version", { cache: "no-store" });
        if (!r.ok) return;
        const { version } = (await r.json()) as { version?: number };
        if (typeof version !== "number" || stopped) return;
        if (seen.current == null) {
          seen.current = version; // first reading = baseline
          return;
        }
        if (version !== seen.current) {
          seen.current = version;
          router.refresh();
        }
      } catch {
        /* offline / transient — try again next tick */
      }
    }

    const id = setInterval(check, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    check();

    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [router, intervalMs]);

  return null;
}
