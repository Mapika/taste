import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import type { Verdict } from "./types.js";

export interface Cache {
  get(key: string): Verdict | undefined;
  put(key: string, v: Verdict): void;
  close(): void;
}

interface Entry { v: Verdict; ts: number; }
interface Store { entries: Record<string, Entry>; }

export function openCache(path: string, ttlDays = 30): Cache {
  const cutoff = Date.now() - ttlDays * 86_400_000;
  let store: Store = { entries: {} };

  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8")) as Store;
      if (parsed && typeof parsed === "object" && parsed.entries) {
        for (const [k, e] of Object.entries(parsed.entries)) {
          if (e && typeof e.ts === "number" && e.ts >= cutoff) store.entries[k] = e;
        }
      }
    } catch {
      try { renameSync(path, path + ".broken"); } catch {}
      store = { entries: {} };
    }
  }

  let dirty = false;
  const flush = () => {
    if (!dirty) return;
    const tmp = path + ".tmp";
    writeFileSync(tmp, JSON.stringify(store));
    renameSync(tmp, path);
    dirty = false;
  };

  return {
    get(key) { return store.entries[key]?.v; },
    put(key, v) {
      store.entries[key] = { v, ts: Date.now() };
      dirty = true;
      flush();
    },
    close() { flush(); },
  };
}

export function cacheKey(profileHash: string, editDiff: string): string {
  return createHash("sha256").update(profileHash).update("|").update(editDiff).digest("hex");
}
