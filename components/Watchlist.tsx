"use client";
import { useEffect, useState } from "react";

const STORAGE_KEY = "ss-food-watchlist";

export function useWatchlist() {
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setWatched(new Set(JSON.parse(raw) as string[]));
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  function persist(next: Set<string>) {
    setWatched(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch { /* ignore */ }
  }

  function toggle(key: string) {
    const next = new Set(watched);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    persist(next);
  }

  function clear() {
    persist(new Set());
  }

  return { watched, toggle, clear, hydrated };
}

export function countyKey(state: string, county: string): string {
  return `${state}::${county}`;
}