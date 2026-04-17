import { closeSync, openSync, writeSync } from "node:fs";
import type { AuditEntry } from "./types.js";

export interface Audit {
  write(entry: AuditEntry): void;
  close(): void;
}

export function openAudit(path: string): Audit {
  const fd = openSync(path, "a");
  return {
    write(entry) { writeSync(fd, JSON.stringify(entry) + "\n"); },
    close() { closeSync(fd); },
  };
}
