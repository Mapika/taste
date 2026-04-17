# linus

Distilled from the Linux kernel source tree (`torvalds/linux`) and the canonical `Documentation/process/coding-style.rst`. The kernel is written entirely by practicing kernel engineers under direct review from Linus Torvalds, making it the definitive public record of this style.

## Voice

Linus kernel style is deliberately, aggressively boring. Code must be readable by "a less-than-gifted first-year high-school student" (coding-style.rst §6) on an 80×24 terminal with 8-wide tabs. Any code that cannot survive that test is wrong, not clever. The structural rules are load-bearing: 8-space tabs make deep nesting physically painful on purpose, so nested complexity is physically impossible to ignore. `goto` is the *correct* error-handling idiom — not a hack — because it flattens the exit path into a single, unconditional sequence of cleanup labels, each named after what it frees (`out_free_buffer`, `cleanup_inode`). There are no typedefs hiding structs: if you write `struct virtual_container *a` instead of `vcontainer_t *a`, you can actually tell what `a` is. CamelCase does not exist; everything is `snake_case`; function names are `verb_noun` pairs.

Comments explain WHY code exists, never HOW it works. If you need to explain the mechanism, the mechanism is too complex and should be split into helper functions with descriptive names. Block comments use `/* */` with a leading asterisk on every interior line. No `//` in kernel C. No inline comments after statements; comments live above the code they explain.

Functions do one thing and fit on two screen-fulls at most. If you need to scroll, you need to split. More than 5-10 local variables signals refactoring time. More than 3 indentation levels signals broken design.

## Examples

- good: `static int alloc_pid(struct pid_namespace *ns)`
- good: `err = do_fork(flags, sp, regs, 0, NULL, NULL); if (err) goto out_free;`
- good: `/* Why we need this lock: the scheduler may preempt between the check and the action */`
- good: `struct task_struct *tsk;` (not `typedef struct task_struct task_t;`)
- good: `int do_truncate(struct mnt_idmap *idmap, struct dentry *dentry, loff_t length)`
- good: `static inline struct page *get_page_from_free_area(struct free_area *area, int m)`
- bad: `typedef struct VirtualContainer { ... } VContainer;`
- bad: `int processUserInput(InputData *inputData)` (CamelCase names)
- bad: `if (err) { if (cleanup_needed) { free_resources(); return -ENOMEM; } }` (nesting instead of goto)
- bad: `// allocate memory for buffer` (explains WHAT, not WHY)
- bad: `int x = foo(); struct bar *b = alloc_bar();` (mixed declarations and statements)
- bad: `static inline int very_complex_function_with_twenty_local_variables(...)` (inline disease)

## Hard rules

- banned-token: `[A-Z][a-z][A-Za-z]+` (identifier regex) — "No CamelCase. Ever. All identifiers are snake_case — local, global, function, struct member. The kernel has zero tolerance for camel-humped names; see coding-style.rst §4 and corpus snippet 8."
- banned-token: `typedef\s+struct` — "Never typedef a struct. Write `struct foo *p`, not `foo_t *p`; the struct keyword carries information about what the variable is. Hiding it with a typedef is explicitly called a mistake in coding-style.rst §5 and corpus snippet 11."
- banned-token: `typedef\s+\w+\s*\*\s*\w+` — "Typedef'd pointer types are doubly banned — they hide both the struct and the pointer indirection; see coding-style.rst §5 and corpus snippet 12."
- line-length: 80 — "The preferred limit is 80 columns. Terminals are 80×24. Lines that exceed this must break at logical points; see coding-style.rst §2 and corpus snippet 2."
- file-naming: snake_case — "File names use underscores, matching the kernel source tree: `page_alloc.c`, `fork.c`, `open.c`. CamelCase or kebab-case file names do not belong."
- banned-token: `^\s{4}[^\s]|^\s{2}[^\s]` (4-space or 2-space indent) — "Indentation is 8-wide tabs, not spaces. Any other indentation width is heresy per coding-style.rst §1 and corpus snippet 1."
- banned-token: `\w+\([^)]*\) \{\\n\\t` — "Function definition opening brace must be on the next line, alone — K&R style. Writing `int foo(void) {` (brace on same line as the signature) violates coding-style.rst §1 and corpus snippet 3. Only `if`, `for`, `while`, `switch` and other control-flow constructs get the brace at end of line."
- banned-token: `\bpsz[A-Z]|\bpch[A-Z]|\biRet\b|\biErr\b` — "Hungarian notation is explicitly banned: `pszBuffer`, `iRetCode`, `nBytesRead` carry type information the compiler already knows. Kernel identifiers are plain, lower-case, descriptive English words; see coding-style.rst §4 and corpus snippet 8."
- banned-token: `return[^;]+;\\n\\t(struct|int|char)\s+\w+` — "All local variable declarations must appear at the top of their block, before any statements. Declaring `struct foo bar;` after an `if` or `return` violates the C89/kernel scoping convention mandated in coding-style.rst §7 (and Linus's explicit statements on mixed declarations)."
- banned-token: `goto err[0-9]|err[0-9]+:` — "Numbered error labels (`err1:`, `err2:`, `goto err2`) are forbidden. Every cleanup label must be named after what it undoes: `out_free_buffer:`, `out_unlock_mutex:`. Numbered labels lose all self-documentation; see coding-style.rst §7 corpus snippet 14."
- banned-token: `#define \w+\([^)]*\)[^\n]*return` — "Function-like macros must not embed `return` or otherwise affect the caller's control flow. A macro that silently returns from the enclosing function hides exits and makes the code impossible to reason about; wrap with `do { if (...) return ...; } while (0)` only when absolutely unavoidable, and prefer an inline function instead; see coding-style.rst §12."
- banned-token: `= [^;]+; /\*` — "Inline trailing comments on statements (`a->used = 0; /* reset counter */`) are not kernel style. Comments belong on the line above the code they annotate, not after the semicolon on the same line; see coding-style.rst §8 and corpus snippet 7."
- banned-token: `\b[a-z]{2,4}[A-Z][a-z]{2,}[A-Z]` — "Abbreviated camelCase identifiers such as `cntActUsr`, `fndFreeSlot`, `maxBufSz`, `mskFlg` violate both the no-CamelCase rule (§4) and the no-abbreviation rule (§4): global names must be descriptive enough that a reader unfamiliar with the subsystem understands them immediately — `count_active_users`, `find_free_slot`."
- banned-token: `goto (done|handle_|next_|skip_|loop_)\w*;` — "The kernel permits `goto` only for cleanup/unwinding (jumping backward to a label that undoes work). Using `goto` to jump forward to `done:` or `handle_read:` as a substitute for structured control flow is explicitly called out as wrong in coding-style.rst §7; restructure with `if/else` or helper functions."
- banned-token: `\bint\b[^;]+,[^;]+,[^;]+,[^;]+;` — "A single declaration listing five or more variables (`int err, ret, status, result, rc;`) is a signal that the function is doing too many things. More than 5–10 local variables means the function needs to be split into smaller helpers; see coding-style.rst §6."
- banned-token: `\([a-z][\w ]*\s*\*\s*\)\s*k(m|z|c)alloc` — "Never cast the return value of `kmalloc`/`kzalloc`/`kcalloc`. In C, `void *` is assignment-compatible with any pointer type. Writing `(char *)kmalloc(...)` is a C++ habit that adds noise and can mask the wrong sizeof; use `sizeof(*ptr)` idiom instead; see coding-style.rst §15 and corpus snippet 14."
- banned-token: `/\*[^*]*(loop through|iterate over|check if|increment|decrement|scan|traverse)` — "Block comments must explain WHY code exists, not HOW it works. A comment that says 'loop through each byte, check if it matches' is describing the algorithm the reader can already see. Remove it or replace it with a comment explaining the design decision; see coding-style.rst §8."
- banned-token: `static inline[^{]+\{[^}]{100,}\}` — "Non-trivial `static inline` functions with multiple conditional branches and more than ~5 statements defeat the purpose of inlining and bloat every call site's generated code. Only single-expression wrappers or trivial one-liners belong in headers as `static inline`; see coding-style.rst §15 ('inline disease') and corpus snippet 9."
