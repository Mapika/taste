# anthropic — showcase

The same function three ways: generic Claude output, Anthropic-profile output, and Carmack-profile output for contrast.

---

## Function 1

Validate a positive integer option value and throw if it is invalid.

---

### Generic Claude

```typescript
/**
 * Validates that a value is a positive integer.
 *
 * @param name - The name of the option being validated (used in error messages).
 * @param value - The value to validate.
 * @returns The validated value as a number.
 * @throws {TypeError} If the value is not a positive integer.
 */
export function validatePositiveInteger(name: string, value: unknown): number {
  if (typeof value !== 'number') {
    throw new TypeError(`${name} must be a number, but received ${typeof value}`);
  }
  if (!Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer, but received ${value}`);
  }
  if (value <= 0) {
    throw new TypeError(`${name} must be a positive integer, but received ${value}`);
  }
  return value;
}
```

Observations: JSDoc on everything including internal helpers; three separate throws with separate messages; `@param`/`@returns`/`@throws` all present; verbose messages naming the type.

---

### Anthropic

```typescript
import { AnthropicError } from '../../core/error';

/**
 * Validates that `value` is a positive integer.
 * Throws an {@link AnthropicError} with a clear message if it is not.
 *
 * @param name - Display name used in the error message (e.g. `"maxRetries"`).
 */
export const validatePositiveInteger = (name: string, value: unknown): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new AnthropicError(
      `${name} must be a positive integer, got ${JSON.stringify(value)}`,
    );
  }
  return value;
};
```

Key differences from generic Claude:
- Throws `AnthropicError`, not a generic `TypeError` — the SDK's own error hierarchy.
- Three guard conditions collapsed into one `if` — readable as a single predicate, not a waterfall.
- `{@link AnthropicError}` cross-reference in JSDoc instead of `@throws {TypeError}`.
- `export const` arrow function — utility style consistent with `internal/utils/values.ts`.
- `JSON.stringify(value)` in the message surfaces the actual bad value, not just its type.

---

### Carmack (contrast preset)

```c-style typescript
function validatePositiveInteger(name: string, value: unknown): number {
  const n = value as number;
  if (!Number.isInteger(n) || n < 1) iError(`${name}: expected positive integer, got ${n}`);
  return n;
}
```

Carmack skips the typed guard (`typeof value !== 'number'`) because in his call sites the type is already known from context. The error call is `iError` — crash-and-print, no class hierarchy needed.

---

## Function 2

Detect whether the current runtime is a browser environment.

---

### Generic Claude

```typescript
/**
 * Checks if the code is running in a browser environment.
 *
 * This function checks for the presence of `window`, `window.document`,
 * and `navigator` to determine if the code is running in a browser.
 *
 * @returns {boolean} `true` if running in a browser, `false` otherwise.
 */
export function isBrowserEnvironment(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.document !== 'undefined' &&
      typeof navigator !== 'undefined'
    );
  } catch {
    return false;
  }
}
```

Observations: function name longer than necessary; `try/catch` around non-throwing expressions; JSDoc restates what the code already says.

---

### Anthropic

```typescript
// detect-platform.ts

export const isRunningInBrowser = () => {
  return (
    // @ts-ignore
    typeof window !== 'undefined' &&
    // @ts-ignore
    typeof window.document !== 'undefined' &&
    // @ts-ignore
    typeof navigator !== 'undefined'
  );
};
```

Key differences from generic Claude:
- Name matches what is being detected (`isRunningInBrowser`, not `isBrowserEnvironment`).
- `// @ts-ignore` on each globalThis access — TypeScript cannot know these exist in all environments; the comment acknowledges this without suppressing the whole file.
- No `try/catch` — `typeof` checks never throw; the wrapper buys nothing.
- No JSDoc — the arrow function is short enough that the body is the documentation.
- File name is kebab-case (`detect-platform.ts`), not `browserUtils.ts`.

---

### Carmack (contrast preset)

```c
static bool IsRunningInBrowser() {
    return EM_ASM_INT({ return typeof window !== 'undefined'; }) != 0;
}
```

Carmack's version is a thin Emscripten shim, PascalCase method, static — a single inline JS check via `EM_ASM_INT`. The checks for `document` and `navigator` are omitted; `window` alone is the discriminant.

---

## Function 3

HTTP error factory — dispatch by status code and return a typed error instance.

---

### Generic Claude

```typescript
/**
 * Creates an appropriate HTTP error based on the status code.
 *
 * @param status - The HTTP status code.
 * @param body - The response body, if any.
 * @param message - An optional error message.
 * @param headers - The response headers.
 * @returns An instance of the appropriate error class for the given status.
 */
export function createHTTPError(
  status: number,
  body: unknown,
  message?: string,
  headers?: Headers,
): Error {
  switch (status) {
    case 400: return new BadRequestError(message ?? 'Bad Request');
    case 401: return new UnauthorizedError(message ?? 'Unauthorized');
    case 403: return new ForbiddenError(message ?? 'Forbidden');
    case 404: return new NotFoundError(message ?? 'Not Found');
    case 429: return new RateLimitError(message ?? 'Rate limit exceeded');
    default:  return new GenericHTTPError(status, message ?? 'Unknown error');
  }
}
```

Observations: `switch` statement; `Error` return type (not a subtype); default message strings hardcoded at the call site; standalone function rather than a class method.

---

### Anthropic

```typescript
// src/core/error.ts

static generate(
  status: number | undefined,
  errorResponse: Object | undefined,
  message: string | undefined,
  headers: Headers | undefined,
): APIError {
  if (!status || !headers) {
    return new APIConnectionError({ message, cause: castToError(errorResponse) });
  }

  const error = errorResponse as Record<string, any>;
  const type = error?.['error']?.['type'] as ErrorType | undefined;

  if (status === 400) return new BadRequestError(status, error, message, headers, type);
  if (status === 401) return new AuthenticationError(status, error, message, headers, type);
  if (status === 403) return new PermissionDeniedError(status, error, message, headers, type);
  if (status === 404) return new NotFoundError(status, error, message, headers, type);
  if (status === 429) return new RateLimitError(status, error, message, headers, type);
  if (status >= 500) return new InternalServerError(status, error, message, headers, type);

  return new APIError(status, error, message, headers, type);
}
```

Key differences from generic Claude:
- Static factory method on the class (`APIError.generate`), not a standalone function — keeps error construction co-located with the error hierarchy.
- Return type is `APIError`, not the broad `Error` — callers get the specific subtype and its typed fields.
- `if` chain instead of `switch` — each branch is visually identical width, easy to scan and extend.
- `castToError(errorResponse)` normalizes the body before passing it as `cause`.
- The `type` field is extracted from the response body and threaded into every subclass — subclasses carry API-level metadata, not just HTTP status.
- No default message strings — the subclass constructors carry their own defaults.

---

### Carmack (contrast preset)

```c
static APIError* MakeHTTPError(int status, const char* msg) {
    if (status == 401) return new AuthError(msg);
    if (status == 429) return new RateLimitError(msg);
    if (status >= 500) return new ServerError(status, msg);
    return new APIError(status, msg);
}
```

Carmack skips the 400/403/404 distinctions (they are all "the caller's problem"), passes the raw message string, and returns a raw pointer. No header or body threading — the server's response is the error, not a typed re-wrap of it.

---

## Summary contrast

| Dimension          | anthropic                                      | carmack                              | generic Claude                        |
|--------------------|------------------------------------------------|--------------------------------------|---------------------------------------|
| Error hierarchy    | `AnthropicError → APIError → subclass`         | crash function or raw pointer        | `TypeError` or `Error` subclass       |
| Error factory      | static method on the class (`APIError.generate`) | standalone function, raw pointer   | standalone function returning `Error` |
| Guard clauses      | single compound `if` with `JSON.stringify`     | cast + one guard                     | waterfall of separate `if` checks     |
| JSDoc              | exported symbols only; `{@link}` cross-refs    | none                                 | every function including internals    |
| `@ts-ignore`       | per-line with implicit rationale               | n/a (C)                              | suppressed via `try/catch` instead    |
| Naming             | `isRunningInBrowser`, `validatePositiveInteger` | `IsRunningInBrowser`, single-letter | `isBrowserEnvironment`, verbose       |
| Export style       | `export const` arrow for utilities             | static method or plain function      | `export function` for everything      |
