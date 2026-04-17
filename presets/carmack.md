# carmack

Distilled from the id Software public source releases (`id-Software/Quake`, `id-Software/DOOM`, `id-Software/Wolfenstein3D`) — the canonical Carmack-era C codebases. Rules here are language-agnostic: the C patterns translate directly to modern languages. A class is not required when a function suffices. A getter is not required when a field is public. An exception is not required when a crash is clearer.

## Voice

Terse. No ceremony. Functions not classes; short names are not bad names. `i`, `n`, `ptr`, `buf`, `len`, `x`, `y` are good names when the scope is small and the type is obvious. Static scope beats public scope whenever the caller doesn't need to know. Performance is a first-class constraint, not a post-hoc concern — use lookup tables, bit operations, fixed-point arithmetic, `goto` when it's the clearest exit, and plain arrays instead of linked lists when the size is bounded. Abstraction has a cost; pay it only when the alternative is genuinely worse. Error handling is not a ceremony: if a precondition fails, call the equivalent of `I_Error` and stop — do not propagate optional types, result monads, or try-catch chains through five stack frames. Comments exist to explain one thing: *why a specific choice was made*, not what the code does. `// the gun's Z is offset because the model is measured from the muzzle` is a good comment. `// increment i` is not.

Comments appear in three forms and nowhere else: a module-level block comment describing non-obvious design taxonomy; a `// <word or phrase>` trailing comment on a branch whose condition would otherwise require domain knowledge to parse (`// already flooded`, `// closed door`); and a `FIXME:` or `TODO:` inline note marking debt with a reason. There are no `/** JSDoc */` blocks, no `@param` annotations, no `@returns` on every function. Section headers (`//\n// SECTION NAME\n//`) are used at most once per logical region, not once per function. Do not write a comment that restates what the next line of code does.

## Examples

- good: `static float ziscale;`
- good: `for (i = 0; i < 3; i++) v[i] = origin[i] - pos[i];`
- good: `if (handle < 0) I_Error("Couldn't open %s", name);`
- good: `#define MOVE_EPSILON 0.01  // below this we treat velocity as zero`
- good: `goto nexttri;`
- good: `int stripverts[128]; int striptris[128]; int stripcount;`
- good: `if (actor->movedir >= 8) I_Error("Weird movedir %d", actor->movedir);`
- good: `static int dc_x, dc_yl, dc_yh;  // column-renderer state`
- good: `// already flooded`
- good: `void *acolormap;  // FIXME: should go away`
- good: `return count < length ? -1 : length;`
- good: `// lowest light value we allow, to avoid inner-loop clamping`
- bad: `export class DrawColumnRenderer { constructor(private state: ColumnState) {} }`
- bad: `function drawColumn(opts: { x: number; yl: number; yh: number; colormap: LightTable; source: Uint8Array })`
- bad: `catch (err: unknown) { logger.error("draw failed", err); return null; }`
- bad: `const clampedVelocity = Math.max(-maxVel, Math.min(maxVel, velocity));`
- bad: `/** @param actor The moving entity. @returns True if movement succeeded. */`
- bad: `// ===== Error Handling Section =====`
- bad: `throw new InvalidMoveDirectionError(actor.movedir);`
- bad: `const result = moveActor(actor); if (result.isErr()) return result;`
- bad: `import { clamp, lerp, saturate } from '@utils/math';`
- bad: `export enum MoveDir { East, NorthEast, North, ... }`
- bad: `// Increment the count variable by 1`
- bad: `const getX = () => this._x; const setX = (v: number) => { this._x = v; };`

## Hard rules

- banned-token: `\bclass\b` — "No class when a module of functions and file-scope state suffices; Carmack kept column-renderer state as plain `dc_x`, `dc_yl`, `dc_yh` globals (snippet 3, linuxdoom-1.10/r_draw.c) not in a DrawColumn class"
- banned-token: `\bthrow\b` — "Throw is not the Carmack error model; hard invariant failures call a crash function (`I_Error`, `Sys_Error`, or equivalent) and stop the process; see snippet 7 (p_enemy.c P_Move) and snippet 9 (m_misc.c M_ReadFile)"
- banned-token: `@param\s` — "No JSDoc `@param` annotations; comments explain why a choice was made, not what a parameter is; see corpus snippets 16-20 for every form of comment Carmack writes"
- file-naming: snake_case
- banned-token: `export\s+enum\b` — "Enums are banned; use plain constant integers or a flat lookup array the way p_enemy.c uses `DI_EAST=0 … DI_NODIR=8` and `opposite[]`/`diags[]`; snippet 7 (p_enemy.c P_NewChaseDir) shows the pattern: bare integer constants, no enum type"
- banned-token: `try\s*\{` — "Try-catch machinery is the opposite of crash-loud; hard failures call `I_Error` and stop the process (snippet 9, m_misc.c M_ReadFile); exception-catching propagation chains hide bugs instead of surfacing them"
- banned-token: `\.catch\s*\(` — "Promise `.catch()` swallows errors; Carmack code either succeeds or calls the equivalent of `I_Error` — error paths are not silently absorbed into `null` returns (snippet 9, m_misc.c M_ReadFile)"
- banned-token: `export\s+\*\s+from` — "Barrel `export *` re-exports the entire module's internals; Carmack uses direct `#include` of exactly what is needed — each compilation unit pulls in only its own dependencies (snippet 11, m_misc.c includes block)"
- banned-token: `interface\s+I[A-Z]` — "Hungarian `I`-prefix on interfaces (`IRenderer`, `IPhysics`) is OOP ceremony; Carmack names types by what they are, not by their kind — structs are `typedef`d without a naming convention that encodes 'this is an interface' (snippet 4, r_local.h)"
- banned-token: `@returns\b` — "No `@returns` JSDoc tags; the only comments Carmack writes are why-comments, FIXME/TODO notes, and terse section labels — function signatures document themselves (corpus snippets 16-20)"
- banned-token: `//\s*={3,}` — "Section-divider banners (`// ===== MOVE ACTOR =====`) are never used; the one permitted structural comment form is `//\\n// SECTION\\n//` at most once per major logical region, not once per function (Voice: 'Section headers are used at most once per logical region')"
- banned-token: `\.isErr\(\)` — "Result/Option monads (`isErr()`, `Ok()`, `Err()`) are abstraction overhead; Carmack returns a plain boolean or crashes — `P_Move` returns `true/false`, `M_ReadFile` calls `I_Error` and never touches a result type (snippet 7, p_enemy.c P_Move; snippet 9, m_misc.c M_ReadFile)"
- banned-token: `async\s+function\s+\w+` — "Async/await adds scheduler ceremony that Carmack code never carries; file I/O is synchronous POSIX (`open`, `read`, `close`) with a crash on failure, not an awaited promise chain (snippet 9, m_misc.c M_ReadFile)"
- banned-token: `console\.(warn|error)\s*\(` — "`console.warn` and `console.error` are higher-ceremony error paths; the Carmack equivalent (`Con_Printf`) is a plain log — hard failures call `I_Error` and stop, soft oddities are logged with `Con_Printf` (snippet 10, sv_phys.c SV_CheckVelocity)"
- banned-token: `private\s+_\w+` — "Private fields with underscore prefix (`_velocityX`) are OOP encapsulation ceremony; Carmack exposes state directly or makes it file-scope — there are no accessor guards on plain data (snippet 3, r_draw.c dc_* globals; Voice: 'A getter is not required when a field is public')"
- banned-token: `container\.bind\b` — "Dependency-injection containers wire up behavior at runtime when a direct module reference would be zero-cost at compile time; Carmack links object files directly — `extern` declarations, not a DI registry (snippet 13, r_local.h extern block)"
