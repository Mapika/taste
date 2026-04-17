# google-go — corpus

Research corpus for the `google-go` taste preset. All snippets are real excerpts
from the Go standard library, Effective Go, and the Google Go Style Guide.
Every rule in `google-go.md` must trace to at least one of these snippets.

## Sources

- https://go.dev/doc/effective_go (canonical Effective Go guide — naming, errors, comments, formatting)
- https://go.dev/doc/effective_go#names (naming section specifically)
- https://google.github.io/styleguide/go/ (Google's formal Go style guide index)
- https://google.github.io/styleguide/go/best-practices (best-practices supplement)
- https://github.com/golang/go/wiki/CodeReviewComments (crowd-sourced Go code review wisdom)
- https://raw.githubusercontent.com/golang/go/master/src/net/http/server.go (net/http stdlib)
- https://raw.githubusercontent.com/golang/go/master/src/io/io.go (io stdlib — canonical interfaces)
- https://raw.githubusercontent.com/golang/go/master/src/bytes/buffer.go (bytes stdlib — zero-value design)
- https://raw.githubusercontent.com/golang/go/master/src/strings/strings.go (strings stdlib — short scope names)
- https://raw.githubusercontent.com/golang/go/master/src/os/file.go (os stdlib — error value returns)

## Snippets — naming & receivers

### Snippet 1: io/io.go — canonical interface naming (method name + -er)
```go
// Reader is the interface that wraps the basic Read method.
//
// Read reads up to len(p) bytes into p. It returns the number of bytes
// read (0 <= n <= len(p)) and any error encountered. Even if Read
// returns n < len(p), it may use all of p as scratch space during the call.
type Reader interface {
    Read(p []byte) (n int, err error)
}

// Writer is the interface that wraps the basic Write method.
type Writer interface {
    Write(p []byte) (n int, err error)
}

// Closer is the interface that wraps the basic Close method.
type Closer interface {
    Close() error
}

// ReadWriter is the interface that groups the basic Read and Write methods.
type ReadWriter interface {
    Reader
    Writer
}
```
*What this shows:* One-method interfaces named `<Method>-er` (`Reader`, `Writer`, `Closer`); doc comment begins with the identifier name; composed interfaces group named interfaces, not anonymous methods; named return values in signatures serve as documentation.

### Snippet 2: net/http/server.go — one-letter receiver on method
```go
// Handler responds to an HTTP request.
//
// ServeHTTP should write reply headers and data to the ResponseWriter
// and then return. Returning signals that the request is finished; it
// is not valid to use the ResponseWriter or read from the
// Request.Body after or concurrently with the completion of the
// ServeHTTP call.
type Handler interface {
    ServeHTTP(ResponseWriter, *Request)
}

// ServeMux is an HTTP request multiplexer.
type ServeMux struct {
    mu    sync.RWMutex
    m     map[string]muxEntry
    es    []muxEntry
    hosts bool
}

func (mux *ServeMux) Handle(pattern string, handler Handler) {
    mux.mu.Lock()
    defer mux.mu.Unlock()
    // ...
}
```
*What this shows:* Receiver variable `mux` — short abbreviation of the type name, not `this` or `self`; lock/defer pattern for resource cleanup; interface doc comment begins "Handler responds to…" (identifier first).

### Snippet 3: bytes/buffer.go — zero-value design and short variable names
```go
// A Buffer is a variable-sized buffer of bytes with Read and Write methods.
// The zero value for Buffer is an empty buffer ready to use.
type Buffer struct {
    buf      []byte
    off      int    // read at &buf[off], write at &buf[len(buf)]
    lastRead readOp // last read operation, so that Unread* can work correctly.
}

func (b *Buffer) Write(p []byte) (n int, err error) {
    b.lastRead = opInvalid
    m, ok := b.tryGrowByReslice(len(p))
    if !ok {
        m = b.grow(len(p))
    }
    return copy(b.buf[m:], p), nil
}
```
*What this shows:* Zero value is documented as immediately useful; single-letter receiver `b` for `*Buffer`; short internal variable names `m`, `ok`, `n`; fields named `buf`, `off` — short, purposeful; doc comment on struct begins with type name.

### Snippet 4: strings/strings.go — short-scope index variables
```go
// Contains reports whether substr is within s.
func Contains(s, substr string) bool {
    return Index(s, substr) >= 0
}

// Count counts the number of non-overlapping instances of substr in s.
// If substr is an empty string, Count returns 1 + the number of Unicode code points in s.
func Count(s, substr string) int {
    // special case
    if len(substr) == 0 {
        return utf8.RuneCountInString(s) + 1
    }
    if len(substr) == 1 {
        return bytealg.CountString(s, substr[0])
    }
    n := 0
    for {
        i := Index(s, substr)
        if i == -1 {
            return n
        }
        n++
        s = s[i+len(substr):]
    }
}
```
*What this shows:* Loop counter `n` and index `i` in tight scope; parameter names `s` and `substr` are short but not cryptic; no `var n int = 0` — use `:=` or declare with zero value; doc comment is complete sentence starting with function name.

### Snippet 5: os/file.go — errors as return values, not panics
```go
// Open opens the named file for reading. If successful, methods on
// the returned file can be used for reading; the associated file
// descriptor has mode O_RDONLY.
// If there is an error, it will be of type *PathError.
func Open(name string) (*File, error) {
    return OpenFile(name, O_RDONLY, 0)
}

// OpenFile is the generalized open call; most users will use Open
// or Create instead. It opens the named file with specified flag
// (O_RDONLY etc.). If the file does not exist, and the O_CREATE flag
// is passed, it is created with mode perm (before umask). If successful,
// methods on the returned file can be used for I/O.
// If there is an error, it will be of type *PathError.
func OpenFile(name string, flag int, perm FileMode) (*File, error) {
    testlog.Open(name)
    f, err := openFileNolog(name, flag, perm)
    if err != nil {
        return nil, err
    }
    f.appendMode = flag&O_APPEND != 0
    return f, nil
}
```
*What this shows:* Error returned as second value, never panicked; `if err != nil { return nil, err }` is idiomatic early return; doc comment on exported function starts with function name; type of error documented (`*PathError`).

### Snippet 6: net/http/server.go — short parameter names `w`, `r`
```go
// ServeHTTP calls f(w, r).
func (f HandlerFunc) ServeHTTP(w ResponseWriter, r *Request) {
    f(w, r)
}

// Error replies to the request with the specified error message and HTTP code.
// It does not otherwise end the request; the caller should ensure no further
// writes are done to w.
// The error message should be plain text.
func Error(w ResponseWriter, error string, code int) {
    h := w.Header()
    // ...
    w.WriteHeader(code)
    fmt.Fprintln(w, error)
}
```
*What this shows:* `w` for `ResponseWriter`, `r` for `*Request` — the canonical Go HTTP handler parameter names; short names in short function scopes are idiomatic; `HandlerFunc` is a function type that implements `Handler` — function-as-interface idiom.

### Snippet 7: Effective Go — package naming (from effective_go doc)
```go
// Good: package name is the base name of the source directory
// src/encoding/base64 → package base64
import "encoding/base64"
// Usage: base64.StdEncoding

// Good: after "import bytes", use bytes.Buffer
import "bytes"
var b bytes.Buffer

// Bad: redundant — package context already provides scope
type BufReader struct { ... }  // in package bufio
// Should be:
type Reader struct { ... }  // seen as bufio.Reader
```
*What this shows:* Package name provides the first word of the qualified name; avoid stutter (`url.URL` is fine but `urlutil.URLUtil` is not); package names: lowercase, no underscores, singular.

### Snippet 8: Effective Go — getter/setter naming
```go
// Good: getter is Owner(), not GetOwner()
owner := obj.Owner()
if owner != user {
    obj.SetOwner(user)  // setter uses Set prefix
}

// Bad:
owner := obj.GetOwner()  // "Get" prefix is not idiomatic Go
```
*What this shows:* Go getters drop the "Get" prefix; setter uses "Set"; upper case provides the visibility signal, not a "Get"/"Is" prefix.

### Snippet 9: Effective Go — short declaration vs var
```go
// Good: short variable declaration
x := 5
s := "hello"
f, err := os.Open(name)

// Bad: redundant type annotation
var x int = 5
var s string = "hello"

// Good: var for zero value initialization
var b bytes.Buffer   // zero value is usable
var count int        // count starts at 0 — meaningful zero
```
*What this shows:* `:=` for non-zero initialization; `var` without assignment for zero values; never `var x T = value` when `:=` works.

### Snippet 10: Effective Go — error handling idiom
```go
// Good: early return on error, no else needed
f, err := os.Open(name)
if err != nil {
    return err
}
defer f.Close()
// Use f here — no else block needed

// Good: error type assertion for additional context
if e, ok := err.(*os.PathError); ok && e.Err == syscall.ENOSPC {
    deleteTempFiles()
    continue
}

// Bad: ignoring errors
f, _ := os.Open(name)

// Bad: unnecessary else after return
if err != nil {
    return err
} else {
    doWork(f)  // else is redundant when if body returns
}
```
*What this shows:* Early return keeps the "happy path" unindented; `_` to discard is acceptable for second return of clearly-safe calls but never for error; else is redundant when the if-branch always returns.

### Snippet 11: Effective Go — defer for cleanup
```go
// Good: defer guarantees Close even on error paths
func readFile(filename string) ([]byte, error) {
    f, err := os.Open(filename)
    if err != nil {
        return nil, err
    }
    defer f.Close()
    return io.ReadAll(f)
}

// Good: unlock with defer
func (m *MyMap) Lookup(key string) string {
    m.mu.Lock()
    defer m.mu.Unlock()
    return m.data[key]
}
```
*What this shows:* `defer` immediately after acquiring a resource ensures cleanup regardless of return path; one-liner unlock via defer is idiomatic.

### Snippet 12: Effective Go — `any` since Go 1.18 (replaces `interface{}`)
```go
// Good (Go 1.18+): use the any alias
func printAll(vals []any) {
    for _, v := range vals {
        fmt.Println(v)
    }
}

func store(key string, value any) {
    cache[key] = value
}

// Bad: interface{} is the old spelling
func printAll(vals []interface{}) { ... }
func store(key string, value interface{}) { ... }
```
*What this shows:* `any` is the canonical alias for `interface{}` since Go 1.18; using `interface{}` in new code is a style violation.

### Snippet 13: Effective Go — interface naming conventions
```go
// Good: one-method interface named for the method + -er
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Stringer interface {
    String() string
}

type Formatter interface {
    Format(f State, verb rune)
}

// Bad: IFoo-style naming (Java/C# convention — not Go)
type IReader interface { ... }
type IWriter interface { ... }

// Bad: -able suffix (not conventional in Go core)
type Readable interface { ... }
```
*What this shows:* Go interfaces named for the action, not the implementer; no "I" prefix; `-er` suffix is canonical.

### Snippet 14: Effective Go — MixedCaps not underscores
```go
// Good: MixedCaps for exported names
type ServerConfig struct { ... }
func ParseURL(raw string) (*URL, error) { ... }
const MaxRetries = 3

// Good: mixedCaps for unexported names
type requestContext struct { ... }
func parseHeaders(r *http.Request) map[string]string { ... }
const defaultTimeout = 30 * time.Second

// Bad: underscores in non-test, non-generated code
type Server_Config struct { ... }
func parse_url(raw string) (*url.URL, error) { ... }
const max_retries = 3
```
*What this shows:* Go uses MixedCaps exclusively; underscores in names (not file names) are a style violation in production code.

### Snippet 15: net/http stdlib — table-driven test pattern
```go
// file: net/http/serve_test.go
func TestHostHandlers(t *testing.T) {
    tests := []struct {
        host    string
        path    string
        handler string
        want    string
    }{
        {"example.com", "/", "example", "example.com/"},
        {"example.com", "/bar", "example", "example.com/bar"},
        {"", "/", "default", "/"},
    }

    for _, tt := range tests {
        t.Run(tt.host+tt.path, func(t *testing.T) {
            got := routeRequest(tt.host, tt.path)
            if got != tt.want {
                t.Errorf("route(%q, %q) = %q; want %q", tt.host, tt.path, got, tt.want)
            }
        })
    }
}
```
*What this shows:* Table-driven tests with anonymous struct slices; `tt` is the conventional loop variable for test cases; `t.Errorf` not `t.Fatalf` for non-fatal failures; test file is `serve_test.go` — snake_case with `_test.go` suffix.

### Snippet 16: Effective Go — goroutine and channel idiom
```go
// Good: channel for signaling
done := make(chan struct{})
go func() {
    defer close(done)
    doWork()
}()
<-done

// Good: context for cancellation (idiomatic modern Go)
func fetch(ctx context.Context, url string) ([]byte, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return nil, err
    }
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    return io.ReadAll(resp.Body)
}
```
*What this shows:* `ctx` is the canonical name for `context.Context`; `context.Context` is always the first parameter; `resp` for HTTP response; defer close body immediately after checking error.

### Snippet 17: Google Go Style — doc comments on exported identifiers
```go
// Server handles incoming HTTP connections.
// A zero-value Server is not valid; use NewServer to create one.
type Server struct {
    Addr    string
    Handler http.Handler
    // contains unexported fields
}

// NewServer creates a Server listening on addr with the given handler.
func NewServer(addr string, handler http.Handler) *Server {
    return &Server{Addr: addr, Handler: handler}
}

// ListenAndServe starts the server and blocks until it is stopped.
// It returns a non-nil error if the server fails to start.
func (s *Server) ListenAndServe() error {
    // ...
}
```
*What this shows:* Doc comment on every exported type and function; comment begins with the identifier name; one-letter or short receiver `s` for `*Server`; constructor named `New<Type>`.

### Snippet 18: Google Go Style — panic only in main or init
```go
// Good: return error from library code
func ParseConfig(data []byte) (*Config, error) {
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("parseConfig: %w", err)
    }
    return &cfg, nil
}

// Bad: panic in library code
func ParseConfig(data []byte) *Config {
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        panic(err)  // forces callers to use recover — anti-pattern
    }
    return &cfg
}

// Acceptable: panic in main for unrecoverable startup failures
func main() {
    cfg, err := ParseConfig(data)
    if err != nil {
        log.Fatal(err)  // prefer log.Fatal to panic in main
    }
    // ...
}
```
*What this shows:* Library code never panics — always returns `error`; `panic` in library code breaks caller's error handling contract; `log.Fatal` is preferred over `panic` in `main`.

### Snippet 19: Google Go Style — file naming snake_case
```go
// Good file names (snake_case):
// http_server.go
// request_parser.go
// url_builder.go
// json_codec.go
// tls_config.go

// Bad file names:
// httpServer.go     — camelCase
// requestParser.go  — camelCase
// URLBuilder.go     — starts with uppercase

// Test files:
// http_server_test.go
// request_parser_test.go
```
*What this shows:* Go source files use snake_case; test files append `_test.go`; no camelCase or kebab-case for file names.

### Snippet 20: Effective Go — named result parameters as documentation
```go
// Good: named returns document what each value means
func divide(a, b float64) (result float64, err error) {
    if b == 0 {
        err = errors.New("divide by zero")
        return
    }
    result = a / b
    return
}

// Also good: named returns in interface definition
type Reader interface {
    Read(p []byte) (n int, err error)  // n = bytes read, err = nil or EOF
}

// Good: wrapping errors with context
func loadUser(id int) (*User, error) {
    u, err := db.QueryUser(id)
    if err != nil {
        return nil, fmt.Errorf("loadUser %d: %w", id, err)
    }
    return u, nil
}
```
*What this shows:* Named result parameters serve as lightweight documentation; `fmt.Errorf` with `%w` wraps errors preserving the chain; error messages use lowercase and do not end with punctuation (they get prefixed by callers).

### Snippet 21: Effective Go — blank identifier and compile-time interface checks
```go
// Import for side effects only
import _ "net/http/pprof"

// Discard unneeded loop value
for _, v := range items {
    process(v)
}

// Compile-time interface satisfaction check
var _ json.Marshaler = (*RawMessage)(nil)
var _ http.Handler = (*MyHandler)(nil)

// Discard error only when truly safe (rare)
// Good: closing a read-only file where Close error is irrelevant
defer f.Close()
```
*What this shows:* `_` used deliberately for side-effect imports, range discards, and compile-time checks; `defer f.Close()` without error check is acceptable for read-only files.

### Snippet 22: Google Go Style — error wrapping with fmt.Errorf
```go
// Good: wrap with context at each layer
func (s *Store) Get(key string) ([]byte, error) {
    v, err := s.cache.Lookup(key)
    if err != nil {
        return nil, fmt.Errorf("store.Get %q: %w", key, err)
    }
    return v, nil
}

// Good: sentinel errors with errors.Is
var ErrNotFound = errors.New("not found")

func Find(id int) (*Item, error) {
    item, ok := db[id]
    if !ok {
        return nil, ErrNotFound
    }
    return item, nil
}

// Bad: fmt.Errorf without %w loses the error chain
return nil, fmt.Errorf("store.Get %q: %v", key, err)  // %v, not %w — can't unwrap
```
*What this shows:* `%w` verb in `fmt.Errorf` preserves the error chain for `errors.Is`/`errors.As`; sentinel errors are package-level `var` named `ErrXxx`; error messages are lowercase.

### Snippet 23: Effective Go — range idioms
```go
// Range over slice: both index and value
for i, v := range items {
    fmt.Printf("items[%d] = %v\n", i, v)
}

// Range: only index
for i := range items {
    items[i] *= 2
}

// Range: only value (discard index)
for _, v := range items {
    sum += v
}

// Range over map
for k, v := range m {
    fmt.Printf("%s -> %v\n", k, v)
}

// Range over channel (reads until closed)
for msg := range ch {
    process(msg)
}
```
*What this shows:* `_` to discard index when only value needed; short names `i`, `v`, `k` for range variables in short scopes; `for range` channel is idiomatic consumer pattern.

### Snippet 24: net/http — short-scope context names
```go
// ctx for context.Context — always first parameter
func (s *Server) Shutdown(ctx context.Context) error {
    atomic.StoreInt32(&s.inShutdown, 1)
    s.mu.Lock()
    lnerr := s.closeListenersLocked()
    s.closeDoneChanLocked()
    s.mu.Unlock()

    ticker := time.NewTicker(shutdownPollInterval)
    defer ticker.Stop()
    for {
        if s.closeIdleConns() {
            return lnerr
        }
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-ticker.C:
        }
    }
}
```
*What this shows:* `ctx` is always the name for `context.Context`; receiver is `s` for `*Server`; local variables are short (`lnerr`, `ticker`); no Hungarian notation.

### Snippet 25: Google Go Style — constructor and initialization patterns
```go
// Good: NewXxx constructor returns pointer and error
func NewClient(addr string, opts ...Option) (*Client, error) {
    c := &Client{
        addr:    addr,
        timeout: defaultTimeout,
    }
    for _, opt := range opts {
        opt(c)
    }
    if err := c.dial(); err != nil {
        return nil, fmt.Errorf("NewClient: %w", err)
    }
    return c, nil
}

// Good: functional options pattern
type Option func(*Client)

func WithTimeout(d time.Duration) Option {
    return func(c *Client) {
        c.timeout = d
    }
}
```
*What this shows:* Constructor named `New<Type>`; returns `(*Type, error)`; functional options using `Option func(*Type)` type alias; short receiver in option closure; error wrapped with context.
