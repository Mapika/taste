# linus — showcase

Canonical examples of code that passes the `linus` taste preset. Every snippet
below scores `pass` against every hard rule in `linus.md`.

## goto for cleanup — the right way

The kernel error-handling idiom. Each label names what it frees. No nesting.
Unconditional cleanup in reverse-acquisition order.

```c
int open_device(struct device *dev)
{
	int err;

	err = device_lock(dev);
	if (err)
		return err;

	err = device_power_on(dev);
	if (err)
		goto out_unlock;

	err = device_init(dev);
	if (err)
		goto out_power_off;

	return 0;

out_power_off:
	device_power_off(dev);
out_unlock:
	device_unlock(dev);
	return err;
}
```

**Why it passes:** Single return at bottom for error path; label names state what
they free (`out_power_off`, `out_unlock`); no nesting beyond two levels; K&R
function brace; `err` declared at top.

## minimal function — one thing, one screen

```c
static inline struct page *get_page_from_area(struct free_area *area,
					      int migratetype)
{
	return list_first_entry_or_null(&area->free_list[migratetype],
		struct page, buddy_list);
}
```

**Why it passes:** Fits on half a screen; no local variables; trivially readable;
`inline` is justified because the body is two lines; K&R function brace.

## struct definition without typedef

```c
struct ring_buffer {
	char *buf;
	size_t head;
	size_t tail;
	size_t capacity;
	spinlock_t lock;
};
```

**Why it passes:** No `typedef`. Users write `struct ring_buffer *rb` — the
`struct` keyword makes the type immediately visible. Members are `snake_case`.

## comment that explains WHY

```c
/*
 * We need to hold the lock across the power state transition because
 * another CPU may observe a partially-initialized device and attempt
 * to use it before init completes.
 */
int power_on_device(struct device *dev)
{
	int err;

	spin_lock(&dev->lock);
	err = do_power_on(dev);
	spin_unlock(&dev->lock);
	return err;
}
```

**Why it passes:** Block comment explains the *reason* for the lock (race with
another CPU), not the mechanism (acquire / release). Comment is above the
function, not inline. `/* */` style with aligned asterisks.

## action function returns errno on failure

```c
int register_driver(struct driver *drv)
{
	int err;

	err = bus_add_driver(drv);
	if (err)
		return err;

	err = driver_create_sysfs(drv);
	if (err)
		goto out_remove;

	return 0;

out_remove:
	bus_remove_driver(drv);
	return err;
}
```

**Why it passes:** `register_*` is an imperative command → returns 0 on success,
negative errno on failure. Descriptive goto label. Declarations before statements.

## predicate function returns boolean

```c
int device_is_present(struct bus *bus, unsigned int id)
{
	if (!bus || id >= bus->nr_slots)
		return 0;
	return bus->slots[id] != NULL;
}
```

**Why it passes:** `device_is_present` is a predicate → returns 0/non-zero, not
errno. Guard clause at the top. No local variables needed. Flat structure.

## switch with case at same indentation level

```c
int handle_event(struct event *ev)
{
	switch (ev->type) {
	case EVENT_READ:
		return do_read(ev);
	case EVENT_WRITE:
		return do_write(ev);
	case EVENT_CLOSE:
		return do_close(ev);
	default:
		return -EINVAL;
	}
}
```

**Why it passes:** `case` labels are not double-indented; they align with the
`switch` keyword. Each branch does one thing. `default` returns a proper errno.

## kmalloc idiom — sizeof(*p), no cast, null check

```c
int alloc_worker(struct worker_pool *pool)
{
	struct worker *w;

	w = kmalloc(sizeof(*w), GFP_KERNEL);
	if (!w)
		return -ENOMEM;
	w->pool = pool;
	list_add(&w->node, &pool->workers);
	return 0;
}
```

**Why it passes:** `sizeof(*w)` not `sizeof(struct worker)` — stays correct if
the type changes. No `(struct worker *)` cast — C void pointers need none.
Null check immediately after allocation. Declarations at top.

---

## Anti-patterns this preset rejects

| Pattern | Why it fails |
|---|---|
| `typedef struct Foo { ... } Foo;` | Hides what `a` is; see coding-style.rst §5 |
| `int processUserInput(InputData *d)` | CamelCase identifiers; see coding-style.rst §4 |
| Nesting error paths 3+ levels deep | goto is the correct idiom; see coding-style.rst §7 |
| `// allocate memory for buffer` | Explains WHAT not WHY; see coding-style.rst §8 |
| `int x = foo(); struct bar *b = ...;` | Mixed declarations and statements; see coding-style.rst §1 |
| `static inline int bigFunc(...) { 20 lines }` | Inline disease; see coding-style.rst §15 |
| 4-space or 2-space indentation | Tabs are 8 wide; anything less is heresy; see coding-style.rst §1 |
| Lines > 80 columns | 80-column limit; see coding-style.rst §2 |
