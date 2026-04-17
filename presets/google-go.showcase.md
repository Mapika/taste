# google-go — showcase

Five representative pairs that demonstrate the google-go preset's signal in practice.
Each pair shows a **before** (flags `fix`) and **after** (passes) for the same code intent.

---

## 1 · Receiver naming

**Before — fails**
```go
// Server handles HTTP connections.
type Server struct {
    addr string
}

func (this *Server) ListenAndServe() error {
    return http.ListenAndServe(this.addr, nil)
}

func (self *Server) Shutdown(ctx context.Context) error {
    return nil
}
```
*Why it fails:* `this` and `self` as receiver names are not Go — they are OOP conventions from Java/Python. Go uses a short abbreviation of the type name.

**After — passes**
```go
// Server handles HTTP connections.
type Server struct {
    addr string
}

func (s *Server) ListenAndServe() error {
    return http.ListenAndServe(s.addr, nil)
}

func (s *Server) Shutdown(ctx context.Context) error {
    return nil
}
```

---

## 2 · `any` vs `interface{}`

**Before — fails**
```go
// Registry maps string keys to arbitrary values.
type Registry struct {
    data map[string]interface{}
}

func (r *Registry) Set(key string, value interface{}) {
    r.data[key] = value
}

func (r *Registry) Get(key string) (interface{}, bool) {
    v, ok := r.data[key]
    return v, ok
}
```
*Why it fails:* `interface{}` is the pre-Go 1.18 spelling. Since Go 1.18, `any` is the predeclared alias and is the idiomatic choice in all new code.

**After — passes**
```go
// Registry maps string keys to arbitrary values.
type Registry struct {
    data map[string]any
}

func (r *Registry) Set(key string, value any) {
    r.data[key] = value
}

func (r *Registry) Get(key string) (any, bool) {
    v, ok := r.data[key]
    return v, ok
}
```

---

## 3 · Panic vs error return in library code

**Before — fails**
```go
// ParseConfig parses JSON configuration from data.
func ParseConfig(data []byte) *Config {
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        panic(fmt.Sprintf("invalid config: %v", err))
    }
    return &cfg
}
```
*Why it fails:* Library functions must return errors — they cannot force callers into using `recover()`. `panic` in library code breaks the Go error-handling contract. Only `main` and `init` may reasonably use `panic` for unrecoverable startup failures.

**After — passes**
```go
// ParseConfig parses JSON configuration from data.
func ParseConfig(data []byte) (*Config, error) {
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("ParseConfig: %w", err)
    }
    return &cfg, nil
}
```

---

## 4 · Interface naming: `IFoo` vs `Foo`

**Before — fails**
```go
// IReader defines the read interface.
type IReader interface {
    Read(p []byte) (n int, err error)
}

// IWriter defines the write interface.
type IWriter interface {
    Write(p []byte) (n int, err error)
}
```
*Why it fails:* The `I` prefix is a Java/C# convention that Go explicitly rejects. Go interfaces are named for the action they represent, using the method name with an `-er` suffix: `Reader`, not `IReader`.

**After — passes**
```go
// Reader is the interface that wraps the basic Read method.
type Reader interface {
    Read(p []byte) (n int, err error)
}

// Writer is the interface that wraps the basic Write method.
type Writer interface {
    Write(p []byte) (n int, err error)
}
```

---

## 5 · Getter naming: `GetOwner` vs `Owner`

**Before — fails**
```go
// Config holds service configuration.
type Config struct {
    owner   string
    timeout time.Duration
}

func (c *Config) GetOwner() string {
    return c.owner
}

func (c *Config) GetTimeout() time.Duration {
    return c.timeout
}
```
*Why it fails:* Go getters drop the `Get` prefix. The uppercase first letter already signals that `Owner` is an exported method; adding `Get` is redundant and non-idiomatic.

**After — passes**
```go
// Config holds service configuration.
type Config struct {
    owner   string
    timeout time.Duration
}

// Owner returns the service owner name.
func (c *Config) Owner() string {
    return c.owner
}

// Timeout returns the configured request timeout.
func (c *Config) Timeout() time.Duration {
    return c.timeout
}
```

---

## Voice summary

Short names in short scopes, longer names in longer scopes. Errors as values returned up the call stack — `panic` stays in `main` and `init`, nowhere else. One-letter receivers (`s` for `*Server`, `b` for `*Buffer`). Interfaces named for behavior with an `-er` suffix (`Reader`, `Writer`, `Closer`), never `IFoo`. Package names: lowercase, singular, no underscores. Doc comments start with the identifier name. `gofmt` decides all formatting — no debate, no alternatives. `any` has been the canonical empty-interface spelling since Go 1.18; `interface{}` in new code is a style violation.
