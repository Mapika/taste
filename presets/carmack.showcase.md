# carmack — showcase

The same function three ways: generic Claude output, Carmack-profile output, and Anthropic-profile output for contrast.

---

## The function

Read a binary data file, return its contents as a byte buffer. Crash if anything goes wrong.

---

## Generic Claude

What a default Claude response looks like without a taste profile:

```typescript
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Reads the contents of a binary file and returns it as a Uint8Array.
 *
 * @param filePath - The absolute or relative path to the file to read.
 * @returns A Promise that resolves to the file contents as a Uint8Array.
 * @throws {FileReadError} If the file cannot be found or read.
 */
export async function readBinaryFile(filePath: string): Promise<Uint8Array> {
  try {
    const resolvedPath = path.resolve(filePath);
    const buffer = await fs.readFile(resolvedPath);
    return new Uint8Array(buffer);
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new FileReadError(`File not found: ${filePath}`, { cause: error });
    }
    throw new FileReadError(`Failed to read file: ${filePath}`, { cause: error });
  }
}

export class FileReadError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'FileReadError';
  }
}
```

Observations: async, wrapped in a custom error class, `@param`/`@returns`/`@throws` JSDoc, `path.resolve`, `try/catch` that wraps and rethrows.

---

## Carmack

```c-style typescript
import { openSync, fstatSync, readSync, closeSync } from 'fs';

function readFile(name: string): Uint8Array {
  const fd = openSync(name, 'r');
  if (fd < 0) iError(`Couldn't read file ${name}`);
  const stat = fstatSync(fd);
  const buf = new Uint8Array(stat.size);
  const n = readSync(fd, buf);
  closeSync(fd);
  if (n < stat.size) iError(`Couldn't read file ${name}`);
  return buf;
}
```

Key differences from generic Claude:
- Synchronous. I/O here is startup data load; async overhead buys nothing.
- No custom error class. `iError` is the equivalent of `I_Error` — it prints and kills the process.
- No `try/catch`. The file either opens or the game stops.
- No JSDoc. The name `readFile` and parameter `name` are self-evident.
- No `path.resolve`. The caller is responsible for passing a valid path.
- Short name `fd` (file descriptor), `n` (bytes read), `buf` (buffer).

---

## Anthropic (contrast preset)

```typescript
import { promises as fs } from 'fs';

export async function readFile(path: string): Promise<Uint8Array> {
  const buffer = await fs.readFile(path);
  return new Uint8Array(buffer);
}
```

The Anthropic preset would keep it async (SDK context expects Promises everywhere), let the raw `fs` error bubble — no custom wrapping — and omit JSDoc only if the function is internal. If exported, it would get a JSDoc block with `@param` and a brief description. Naming stays full-word (`path`, not `name`).

---

## Summary contrast

| Dimension          | carmack                        | anthropic                        | generic Claude                  |
|--------------------|--------------------------------|----------------------------------|---------------------------------|
| Sync/async         | sync (default)                 | async (SDK default)              | async                           |
| Error model        | crash-function, no return      | bubble raw error                 | wrap in custom class + rethrow  |
| Comments           | none needed here               | JSDoc on public exports          | JSDoc on everything             |
| Names              | `fd`, `n`, `buf`               | `path`, `buffer`                 | `filePath`, `resolvedPath`      |
| Abstraction        | raw POSIX handles              | `fs.promises`, idiomatic Node    | `path.resolve` + `ErrorOptions` |
