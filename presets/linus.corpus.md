# linus — corpus

Research corpus for the `linus` taste preset. All snippets are real excerpts
from public Linux kernel source or verbatim rules from the canonical coding
style document. Every rule in `linus.md` must trace to at least one of these
snippets.

## Sources

- https://raw.githubusercontent.com/torvalds/linux/master/Documentation/process/coding-style.rst (canonical coding style — read in full)
- https://github.com/torvalds/linux/blob/master/kernel/fork.c (process forking — goto cleanup, flat structure, snake_case)
- https://github.com/torvalds/linux/blob/master/fs/open.c (filesystem open — hierarchical goto error paths)
- https://github.com/torvalds/linux/blob/master/init/main.c (kernel init — function size, comments, naming)
- https://github.com/torvalds/linux/blob/master/mm/page_alloc.c (memory allocation — variable declarations, 80-col discipline)
- https://github.com/torvalds/linux/blob/master/kernel/sched/core.c (scheduler core — short functions, snake_case, K&R braces)

## Snippets — indentation and line length

### Snippet 1: coding-style.rst §1 (Indentation)
```
Tabs are 8 characters, and thus indentations are also 8 characters.
There are heretic movements that try to make indentations 4 (or even 2!)
characters deep, and that is akin to trying to define the value of PI to
be 3.

Rationale: The whole idea behind indentation is to clearly define where
a block of control starts and ends.  Especially when you've been looking
at your screen for 20 straight hours, you'll find it a lot easier to see
how the indentation works if you have large indentations.
```
*What this shows:* 8-space tabs are non-negotiable. Anything less is a heresy.

### Snippet 2: coding-style.rst §2 (Breaking Long Lines)
```
The preferred limit on the length of a single line is 80 columns.

Statements longer than 80 columns will be broken into sensible chunks,
unless exceeding 80 columns significantly improves readability and does
not hide information.
```
*What this shows:* 80-column hard limit; wrapping is mandatory.

### Snippet 3: kernel/sched/core.c — short function with declarations at top
```c
static void sched_core_unlock(int cpu, unsigned long *flags)
{
	const struct cpumask *smt_mask = cpu_smt_mask(cpu);
	int t;

	for_each_cpu(t, smt_mask)
		raw_spin_unlock(&cpu_rq(t)->__lock);
	local_irq_restore(*flags);
}
```
*What this shows:* All declarations at the top of the function block before any statement; one blank line separates declarations from logic; single purpose, short body.

### Snippet 4: kernel/sched/core.c — declarations before statements
```c
struct rq *___task_rq_lock(struct task_struct *p, struct rq_flags *rf)
{
	struct rq *rq;

	lockdep_assert_held(&p->pi_lock);
	for (;;) {
		rq = task_rq(p);
		raw_spin_rq_lock(rq);
		if (likely(rq == task_rq(p) && !task_on_rq_migrating(p))) {
			rq_pin_lock(rq, rf);
			return rq;
		}
		raw_spin_rq_unlock(rq);
		while (unlikely(task_on_rq_migrating(p)))
			cpu_relax();
	}
}
```
*What this shows:* `struct rq *rq;` declared at top; no mid-function `struct` or type declarations; K&R braces on functions (opening brace on its own line after signature).

## Snippets — brace placement and spacing

### Snippet 5: coding-style.rst §3 (Placing Braces and Spaces)
```
The other issue that always comes up in C styling is the placement of
braces.  Unlike Indentation, there are few technical reasons to choose
one placement strategy over the other, but the preferred way, as shown to
us by the prophets Kernighan and Ritchie, is to put the opening brace
last on the line, and put the closing brace first, on its own line...

However, there is one special case, namely functions: they have the
opening brace at the beginning of the next line...
```
*What this shows:* K&R brace style — opening brace at end of control-flow lines, but on its own line for functions.

### Snippet 6: init/main.c — function with K&R brace on next line
```c
static int __init debug_kernel(char *str)
{
	console_loglevel = CONSOLE_LOGLEVEL_DEBUG;
	return 0;
}
```
*What this shows:* Opening function brace on its own line; single-purpose function; tabs for indentation; body is trivially readable.

### Snippet 7: coding-style.rst §3 — no braces for single-statement bodies
```
Do not unnecessarily use braces where a single statement will do.

if (condition)
	action();

and

if (condition)
	do_this();
else
	do_that();
```
*What this shows:* Single-statement `if` bodies have no braces; braces only appear when the body has more than one statement.

## Snippets — naming

### Snippet 8: coding-style.rst §4 (Naming)
```
LOCAL variable names should be short, and to the point.  If you have
some random integer loop counter, it should probably be called "i".
Calling it "loop_counter" is non-productive, if there is no chance of it
being mis-understood.  Similarly, "tmp" can be just about anything.

GLOBAL variables (to be used only if you REALLY need them) need to have
descriptive names, as do global functions.  If you have a function that
counts the number of active users, you should call that
"count_active_users()" or similar, you should NOT call it "cntusr()".

Encoding the type of a function into the name (so-called Hungarian
notation) is brain damaged -- the compiler knows the types anyway and can
check those, and it only confuses the programmer.  NEVER use Hungarian
notation.
```
*What this shows:* Local names short; global names fully spelled out; no Hungarian notation; no CamelCase; `snake_case` everywhere.

### Snippet 9: kernel/fork.c — snake_case names
```c
static struct task_struct *dup_task_struct(struct task_struct *orig, int node)
{
	struct task_struct *tsk;
	int err;

	err = arch_dup_task_struct(tsk, orig);
	if (err)
		goto free_tsk;

	err = alloc_thread_stack_node(tsk, node);
	if (err)
		goto free_tsk;
```
*What this shows:* Every identifier is `lower_snake_case`; no abbreviations beyond conventional `tsk`, `err`; `goto` label names are descriptive (`free_tsk`).

### Snippet 10: fs/open.c — function name hierarchy (verb_noun)
```c
int do_truncate(struct mnt_idmap *idmap, struct dentry *dentry,
		loff_t length, unsigned int time_attrs, struct file *filp)
int vfs_truncate(const struct path *path, loff_t length)
int ksys_truncate(const char __user *pathname, loff_t length)
```
*What this shows:* Function names are `verb_noun` pairs in snake_case; layered naming (`do_`, `vfs_`, `ksys_`) conveys abstraction level; never CamelCase.

## Snippets — typedefs

### Snippet 11: coding-style.rst §5 (Typedefs)
```
Please don't use things like "vps_t".
It's a _mistake_ to use typedef for structures and pointers.  When you see a

	vps_t a;

in the source, what does it mean?  In contrast, if it says

	struct virtual_container *a;

you can actually tell what "a" is.  Lots of people think that typedefs
"help readability".  They don't.  They are useful only for:
 (a) totally opaque objects (where the typedef is actively used to hide
     what the object is)
 ...
 (f) Types safe for use in userspace (in certain header files).

In those cases, typedefs are acceptable. But in general, NEVER EVER use a
typedef unless you can clearly match one of those rules.
```
*What this shows:* `typedef struct foo foo_t;` is explicitly banned. Struct tags are always written out. Hiding a struct behind a typedef is a mistake.

### Snippet 12: coding-style.rst §5 — pointer typedef prohibition
```
Typedef pointers is almost always a bad idea.  When you typedef a pointer
type, you actively hide information about pointers from programmers.
```
*What this shows:* `typedef struct foo *foo_ptr_t;` doubly banned — it hides both the struct and the pointer.

## Snippets — functions

### Snippet 13: coding-style.rst §6 (Functions)
```
Functions should be short and sweet, and do just one thing.  They should
fit on one or two screenfuls of text (the ISO/ANSI screen size is 80x24,
as we all know), and do one thing and do it well.

The maximum length of a function is inversely proportional to the
complexity and indentation level of that function.  So, if you have a
conceptually simple function that is just one long (but simple) case-
statement, where you have to do lots of small things for a lot of
different cases, it's OK to have a longer function.

However, if you have a complex function, and you suspect that a less-
than-gifted first-year high-school student would not be able to understand
the function, you should adhere more strictly to the maximum limits.  Use
helper functions with descriptive names.

Another measure of the function is the number of local variables.  They
shouldn't exceed 5-10, and if they do, you should think about splitting
the function.
```
*What this shows:* 80×24 screen limit; max 5-10 local variables; complexity inversely proportional to length; split when you scroll.

### Snippet 14: mm/page_alloc.c — minimal function
```c
static inline struct page *get_page_from_free_area(struct free_area *area,
						    int migratetype)
{
	return list_first_entry_or_null(&area->free_list[migratetype],
		struct page, buddy_list);
}
```
*What this shows:* A function that does one thing; two lines of body; no local variables; perfectly readable.

## Snippets — goto for cleanup

### Snippet 15: coding-style.rst §7 (Centralized Exiting)
```
The goto statement comes in handy when a function exits from multiple
locations and some common work such as cleanup has to be done.  If there
is no cleanup needed then just return directly.

Choose label names which say what the goto does or why the goto is there.
An example of a good name would be "out_free_buffer:" if the goto frees
"buffer".  Avoid using GW-BASIC names like "err1:" and "err2:", as you
would have to renumber them if you ever add or remove exit paths.

The rationale for using goto is:
- unconditional statements are easier to understand and follow
- nesting is reduced
- errors by not updating individual exit points when making
  modifications are prevented
- saves the compiler work to optimize redundant code away ;)
```
*What this shows:* `goto` for cleanup is the *preferred* pattern; label names describe what is freed; eliminates nested conditionals for error paths.

### Snippet 16: fs/open.c — hierarchical goto cleanup
```c
error = file_get_write_access(f);
if (unlikely(error))
    goto cleanup_file;
f->f_mode |= FMODE_WRITER;

cleanup_all:
cleanup_mnt:
    mnt_put_write_access(f->f_path.mnt);
cleanup_inode:
    put_write_access(f->f_inode);
```
*What this shows:* Each label names what it frees (`cleanup_mnt`, `cleanup_inode`); labels cascade naturally; no nested conditionals.

### Snippet 17: kernel/fork.c — goto in error path
```c
err = arch_dup_task_struct(tsk, orig);
if (err)
    goto free_tsk;

err = alloc_thread_stack_node(tsk, node);
if (err)
    goto free_tsk;
```
*What this shows:* Every failing call jumps to the same label; flat linear error flow; no nesting; descriptive label name.

## Snippets — comments

### Snippet 18: coding-style.rst §8 (Commenting)
```
Comments are good, but there is also a danger of over-commenting.  NEVER
try to explain HOW your code works in a comment: it's much better to
write the code so that the _working_ is obvious, and it's a waste of time
to explain badly written code.

Generally, you want your comments to tell WHAT your code does, not HOW.
Also, try to avoid putting comments inside a function body: if the
function is so complex that you need to separately comment parts of it,
you should probably go back to chapter 6 for a while.  You can make
small comments to note or warn about something particularly clever (or
ugly), but try to avoid excess.  Instead, put the comments at the head
of the function, explaining what it does, and possibly WHY it does it.
```
*What this shows:* Comments explain WHY or WHAT (the purpose), never HOW (the mechanism); prefer comments above functions, not inline; complex inline code is a sign to refactor.

### Snippet 19: init/main.c — block comment explaining WHY
```c
/*
 * Debug helper: via this flag we know that we are in 'early bootup code'
 * where only the boot processor is running with IRQ disabled. This means
 * two things - IRQ must not be enabled before the flag is cleared and some
 * operations which are not allowed with IRQ disabled are allowed while the
 * flag is set.
 */
```
*What this shows:* Block comment above a declaration explains the reason the flag exists and the constraints it imposes — pure WHY reasoning.

### Snippet 20: coding-style.rst §8 — preferred comment style
```c
/*
 * This is the preferred style for multi-line
 * comments in the Linux kernel source code.
 * Please use it consistently.
 *
 * Description:  A column of asterisks on the left side,
 * with beginning and ending almost-blank lines.
 */
```
*What this shows:* `/* */` block comments with a leading space and asterisk on each interior line; no `//` single-line comments in kernel C; opening and closing lines nearly blank.

## Snippets — macros and inline

### Snippet 21: coding-style.rst §12 (Macros)
```
Names of macros defining constants and labels in enums are capitalized.

#define CONSTANT 0x12345

Enums are preferred when defining several related constants.

CAPITALIZED macro names are appreciated but macros resembling functions
may be named in lowercase.

Generally, inline functions are preferable to macros resembling functions.
If the macro is protecting against multiple evaluation of its arguments,
it's OK to use macro -- but only if there's no alternative.
```
*What this shows:* Constants in ALL_CAPS; function-like macros discouraged in favour of `static inline`; multi-statement macros require `do { } while (0)`.

### Snippet 22: coding-style.rst §15 (The Inline Disease)
```
A reasonable rule of thumb is to not put inline at functions that have
more than 3 lines of code in them.  An exception to this rule are the
cases where a parameter is known to be a compiletime constant, and as a
result of this constantness you *know* the compiler will be able to
optimize most of your function away at compile time.

The compiler has enough information to make these decisions itself (based
on optimization level).  It doesn't need help, and pretending you know
better is usually wrong.
```
*What this shows:* `inline` on functions larger than 3 lines is the "inline disease"; the compiler decides; excessive inlining bloats the kernel.

## Snippets — function return values

### Snippet 23: coding-style.rst §16 (Return Values and Names)
```
If the name of a function is an action or an imperative command, the
function should return an error-code integer.  If the name is a predicate,
the function should return a "succeeded" boolean.

For example, "add work" is a command, and the add_work() function returns 0
for success or -EBUSY for failure.  In the same way, "PCI device present"
is a predicate, and the pci_dev_present() function returns 1 if it
succeeds in finding a matching device or 0 if it doesn't.
```
*What this shows:* Action functions return 0 on success, negative errno on failure; predicate functions return bool-like 0/1; the naming convention encodes the contract.

## Snippets — no-clever-code principle

### Snippet 24: coding-style.rst §1 — deep nesting indicts design
```
Now, some people will claim that having 8-character indentations makes
the code move too far to the right, and makes it hard to read on a
80-column terminal screen.  The answer to that is that if you need
more than 3 levels of indentation, you're screwed anyway, and should
fix your program.
```
*What this shows:* More than 3 levels of nesting signals broken design; 8-wide tabs make excessive nesting physically painful on purpose — that is the point.

### Snippet 25: coding-style.rst §6 — on complex code
```
if you have a complex function, and you suspect that a less-than-gifted
first-year high-school student would not be able to understand the
function, you should adhere more strictly to the maximum limits.
```
*What this shows:* The readability bar is a first-year student, not an expert; clever code that requires expertise to parse is wrong code.
