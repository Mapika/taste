# google-go

Distilled from the Go standard library (`io`, `bytes`, `strings`, `net/http`, `os`), Effective Go, the Google Go Style Guide, and the canonical CodeReviewComments wiki. The Go standard library is written entirely by the Go team and serves as the authoritative reference for idiomatic Go.

## Voice

Go-at-Google code is architecturally minimal and lexically terse. Names shrink to match their scope: a loop counter is `i`, an HTTP writer is `w`, a context is `ctx`, a server receiver is `s`. Longer scopes earn longer names — `defaultTimeout`, `shutdownPollInterval` — but never Hungarian prefixes or `Get` prefixes on getters. Interfaces are named for what they do: `Reader`, `Writer`, `Closer`, `Stringer`, `Formatter` — one method, one `-er` suffix, no `I` prefix. Package names are lowercase, singular, no underscores: `http`, `bytes`, `url`, not `HTTPClient`, `byteUtils`, or `url_parser`. Source files are `snake_case.go`; test files end in `_test.go`.

Errors are values that travel up the call stack, never exceptions that unwind it. Every function that can fail returns `(result, error)` as its last pair; `panic` is reserved for `main` and `init` only. The error-handling idiom is uniform: `if err != nil { return nil, fmt.Errorf("funcName: %w", err) }` — early return, `%w` to preserve the chain, lowercase message without trailing punctuation. Sentinel errors are package-level `var ErrXxx = errors.New(...)`. `defer` acquires cleanup obligations immediately after acquiring resources. `any` is the canonical spelling since Go 1.18 — `interface{}` in new code is a style violation.

Doc comments appear above every exported identifier and begin with the identifier name: `// Server handles HTTP connections.`, `// NewClient creates a Client...`, `// ErrNotFound is returned when...`. There are no section-divider banners, no TODO breadcrumbs in production code, and no inline comments restating what the code already says. `gofmt` is the arbiter of all formatting — no style debates, no alternatives. Table-driven tests in `_test.go` files use anonymous struct slices with `tt` as the range variable.

## Examples

- good: `func (s *Server) ListenAndServe() error { ... }`
- good: `func fetch(ctx context.Context, url string) ([]byte, error) { ... }`
- good: `type Reader interface { Read(p []byte) (n int, err error) }`
- good: `return nil, fmt.Errorf("store.Get %q: %w", key, err)`
- good: `x := 5` (not `var x int = 5`)
- good: `for _, v := range items { sum += v }` (not `for i := 0; i < len(items); i++`)
- good: `defer f.Close()` immediately after error check
- good: `// Server handles incoming HTTP connections.` (starts with identifier)
- good: `var ErrNotFound = errors.New("not found")`
- good: `func (b *Buffer) Write(p []byte) (n int, err error) { ... }`
- bad: `func (this *Server) ListenAndServe() error { ... }` — `this` is not Go
- bad: `type IReader interface { ... }` — no `I` prefix on interfaces
- bad: `func printAll(vals []interface{}) { ... }` — use `any` since Go 1.18
- bad: `panic(err)` in library code — return the error
- bad: `var x int = 5` — redundant type; use `x := 5`
- bad: `func GetOwner() string { ... }` — getter drops `Get`; use `Owner()`

## Hard rules

- banned-token: `\binterface\{\}` — "Use `any` (the predeclared alias) instead of `interface{}` in all Go 1.18+ code; `interface{}` is the legacy spelling; see corpus snippet 12"
- banned-token: `\bpanic\(` — "Library code must return errors, never panic; `panic` belongs only in `main` or `init`; see corpus snippet 18"
- banned-token: `\bthis\b` — "Go receivers are short abbreviations of the type name (`s` for `*Server`, `b` for `*Buffer`), never `this` or `self`; see corpus snippets 2, 3, 17"
- banned-token: `\bI[A-Z][a-z]` — "Go interfaces are named for behavior with an `-er` suffix (`Reader`, `Writer`), never with a Java-style `I` prefix (`IReader`, `IWriter`); see corpus snippets 1, 13"
- banned-token: `\bGet[A-Z]` — "Go getters drop the `Get` prefix; `Owner()` not `GetOwner()`; see corpus snippet 8 (Effective Go naming)"
- banned-token: `\bself\b` — "Go receivers are short abbreviations of the type name (`c` for `*Client`, `s` for `*Server`), never `self`; see corpus snippets 2, 17 (receiver naming)"
- banned-token: `\bvar\s+\w+\s+(?:int|string|bool|float64|float32|byte|rune|uint|int64|int32)\s*=` — "Redundant typed `var` declaration with initializer (`var count int = 0`) must be written as a short declaration (`count := 0`); `var` without assignment is fine for zero-value init; see corpus snippet 9 (Effective Go short declaration)"
- banned-token: `,\s*_\s*:=` — "Errors must not be discarded with the blank identifier (`f, _ := os.Open(path)`); always check and handle or propagate errors; see corpus snippet 10 (Effective Go error handling) and snippet 21 (blank identifier)"
- banned-token: `fmt\.Errorf\([^)]*%v` — "Use `%w` (not `%v`) in `fmt.Errorf` to wrap errors and preserve the chain for `errors.Is`/`errors.As`; `%v` loses unwrappability; see corpus snippet 22 (error wrapping)"
- banned-token: `\bpackage\s+[a-z]+[A-Z]\w*\b` — "Package names must be all-lowercase with no underscores or camelCase (`package httputils`, not `package httpUtils`); see corpus snippet 7 (Effective Go package naming)"
- banned-token: `}\s*else\s*{` — "Unnecessary `else` after a returning `if` branch adds indentation without value; drop the `else` and let the code fall through; see corpus snippet 10 (Effective Go error handling: 'else is redundant when the if-branch always returns')"
- banned-token: `fmt\.Errorf\("[^"]*[.!?]"` — "Error strings must not end with punctuation (`.`, `!`, `?`); they are concatenated by callers and the trailing mark produces double-punctuated messages; see corpus snippet 20 (Effective Go: 'error messages use lowercase and do not end with punctuation')"
- banned-token: `// file:\s*[a-z]+[A-Z]\w*\.go` — "Go source files must use snake_case names (`http_server.go`, not `httpServer.go`); camelCase file names violate the Go file-naming convention; see corpus snippet 19 (Google Go Style file naming)"
- banned-token: `,\s*ctx\s+context\.Context` — "`context.Context` must always be the first parameter of any function or method that accepts it; placing it after other parameters violates the canonical Go parameter ordering; see corpus snippet 16 (Effective Go goroutines) and snippet 24 (net/http Shutdown)"
- banned-token: `//\s+This\s+(?:function|method|struct|type|interface|variable|field)` — "Doc comments must begin with the identifier name, not a generic preamble (`// ParseURL parses…`, not `// This function parses…`); see corpus snippet 17 (Google Go Style doc comments)"
- file-naming: snake_case
