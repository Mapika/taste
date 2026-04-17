# anthropic — corpus

Research corpus for the `anthropic` taste preset. All snippets are real excerpts
from public Anthropic source. Every rule in `anthropic.md` must trace to at least
one of these snippets.

## Sources

- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/core/error.ts (error class hierarchy: AnthropicError, APIError, status-specific subclasses)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/index.ts (main entry-point re-export pattern)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/client.ts (BaseAnthropic class, constructor, request lifecycle, retry logic)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/core/pagination.ts (AbstractPage, PagePromise, async iterable pattern)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/core/api-promise.ts (APIPromise extends Promise)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/core/streaming.ts (Stream<Item> async iterator, SSE parsing)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/core/resource.ts (APIResource base class)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/internal/errors.ts (castToError, isAbortError utilities)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/internal/utils/values.ts (validatePositiveInteger, ensurePresent, coerce helpers)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/internal/utils/log.ts (Logger type, loggerFor, makeLogFn, formatRequestDetails)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/internal/utils/sleep.ts (minimal sleep utility)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/internal/utils/uuid.ts (uuid4 with lazy replacement)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/internal/utils/query.ts (stringifyQuery)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/internal/detect-platform.ts (isRunningInBrowser, getDetectedPlatform)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/internal/request-options.ts (RequestOptions, FinalRequestOptions interfaces)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/lib/parser.ts (maybeParseMessage, parseMessage, type helpers)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/resources/messages/messages.ts (Messages resource class, create overloads, JSDoc examples)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/tsconfig.json (compiler options: strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/examples/tools.ts (tool-use example, assertion style)
- https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/examples/streaming.ts (stream example, error handling at call site)

## Snippets — naming & structure

### Snippet 1: src/core/resource.ts:1-9
```typescript
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { BaseAnthropic } from '../client';

export abstract class APIResource {
  protected _client: BaseAnthropic;

  constructor(client: BaseAnthropic) {
    this._client = client;
  }
}
```
*What this shows:* Single-responsibility base classes; protected members use `_` prefix convention; `abstract class` for extension points.

### Snippet 2: src/resources/messages/messages.ts:36-70
```typescript
export class Messages extends APIResource {
  batches: BatchesAPI.Batches = new BatchesAPI.Batches(this._client);

  /**
   * Send a structured list of input messages with text and/or image content, and the
   * model will generate the next message in the conversation.
   *
   * The Messages API can be used for either single queries or stateless multi-turn
   * conversations.
   *
   * @example
   * ```ts
   * const message = await client.messages.create({
   *   max_tokens: 1024,
   *   messages: [{ content: 'Hello, world', role: 'user' }],
   *   model: 'claude-opus-4-6',
   * });
   * ```
   */
  create(body: MessageCreateParamsNonStreaming, options?: RequestOptions): APIPromise<Message>;
  create(
    body: MessageCreateParamsStreaming,
    options?: RequestOptions,
  ): APIPromise<Stream<RawMessageStreamEvent>>;
  create(
    body: MessageCreateParamsBase,
    options?: RequestOptions,
  ): APIPromise<Stream<RawMessageStreamEvent> | Message>;
  create(
    body: MessageCreateParams,
    options?: RequestOptions,
  ): APIPromise<Message> | APIPromise<Stream<RawMessageStreamEvent>> {
```
*What this shows:* Method overload signatures before implementation; JSDoc with `@example` using a real runnable snippet; resource classes extend `APIResource`.

### Snippet 3: src/internal/detect-platform.ts:1-25
```typescript
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { VERSION } from '../version';

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

type DetectedPlatform = 'deno' | 'node' | 'edge' | 'unknown';

/**
 * Note this does not detect 'browser'; for that, use getBrowserInfo().
 */
function getDetectedPlatform(): DetectedPlatform {
  if (typeof Deno !== 'undefined' && Deno.build != null) {
    return 'deno';
  }
```
*What this shows:* Kebab-case file names (`detect-platform.ts`); discriminated union string literals for platform types; exported arrow functions alongside named functions.

### Snippet 4: src/internal/utils/log.ts:6-14
```typescript
type LogFn = (message: string, ...rest: unknown[]) => void;
export type Logger = {
  error: LogFn;
  warn: LogFn;
  info: LogFn;
  debug: LogFn;
};
export type LogLevel = 'off' | 'error' | 'warn' | 'info' | 'debug';
```
*What this shows:* Type aliases for function shapes; string union for enumerable levels instead of `enum`; exported types co-located with implementation.

### Snippet 5: src/client.ts (ClientOptions interface, ~line 252-340)
```typescript
export interface ClientOptions {
  /**
   * API key used for authentication.
   *
   * - Accepts either a static string or an async function that resolves to a string.
   * - Defaults to process.env['ANTHROPIC_API_KEY'].
   * - When a function is provided, it is invoked before each request so you can rotate
   *   or refresh credentials at runtime.
   * - The function must return a non-empty string; otherwise an AnthropicError is thrown.
   */
  apiKey?: string | ApiKeySetter | null | undefined;

  /**
   * The maximum amount of time (in milliseconds) that the client should wait for a response
   * from the server before timing out a single request.
   *
   * @unit milliseconds
   */
  timeout?: number | undefined;

  /**
   * The maximum number of times that the client will retry a request in case of a
   * temporary failure, like a network error or a 5XX error from the server.
   *
   * @default 2
   */
  maxRetries?: number;
```
*What this shows:* Every interface property gets a JSDoc block; `@unit` and `@default` tags used consistently; optional fields typed `T | undefined` not just `T?` alone.

## Snippets — error handling

### Snippet 6: src/core/error.ts:1-65
```typescript
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { castToError } from '../internal/errors';
import type { ErrorType } from '../resources/shared';

export class AnthropicError extends Error {}

export class APIError<
  TStatus extends number | undefined = number | undefined,
  THeaders extends Headers | undefined = Headers | undefined,
  TError extends Object | undefined = Object | undefined,
> extends AnthropicError {
  readonly status: TStatus;
  readonly headers: THeaders;
  readonly error: TError;
  readonly requestID: string | null | undefined;
  /** The `error.type` from the API response body, e.g. `"rate_limit_error"` */
  readonly type: ErrorType | null;

  constructor(
    status: TStatus,
    error: TError,
    message: string | undefined,
    headers: THeaders,
    type?: ErrorType | null,
  ) {
    super(`${APIError.makeMessage(status, error, message)}`);
    this.status = status;
    this.headers = headers;
    this.requestID = headers?.get('request-id');
    this.error = error;
    this.type = type ?? null;
  }

  private static makeMessage(status: number | undefined, error: any, message: string | undefined) {
    const msg =
      error?.message ?
        typeof error.message === 'string' ?
          error.message
        : JSON.stringify(error.message)
      : error ? JSON.stringify(error)
      : message;

    if (status && msg) {
      return `${status} ${msg}`;
    }
    if (status) {
      return `${status} status code (no body)`;
    }
    if (msg) {
      return msg;
    }
    return '(no status code or body)';
  }
```
*What this shows:* Typed error hierarchy (`AnthropicError → APIError → BadRequestError` etc.); all error fields are `readonly`; static factory method `generate()` on the class itself; no `try/catch` in the error class — errors propagate up naturally.

### Snippet 7: src/core/error.ts:65-120 (APIError.generate + subclasses)
```typescript
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

    if (status === 400) {
      return new BadRequestError(status, error, message, headers, type);
    }
    if (status === 401) {
      return new AuthenticationError(status, error, message, headers, type);
    }
    if (status >= 500) {
      return new InternalServerError(status, error, message, headers, type);
    }

    return new APIError(status, error, message, headers, type);
  }
}

export class APIUserAbortError extends APIError<undefined, undefined, undefined> {
  constructor({ message }: { message?: string } = {}) {
    super(undefined, undefined, message || 'Request was aborted.', undefined);
  }
}

export class APIConnectionError extends APIError<undefined, undefined, undefined> {
  constructor({ message, cause }: { message?: string | undefined; cause?: Error | undefined }) {
    super(undefined, undefined, message || 'Connection error.', undefined);
```
*What this shows:* Status-code dispatch via plain `if` chains (not switch); subclasses for user-abort and connection errors with sensible default messages; `cause` threading for wrapping lower-level errors.

### Snippet 8: src/internal/errors.ts:1-40
```typescript
export function isAbortError(err: unknown) {
  return (
    typeof err === 'object' &&
    err !== null &&
    // Spec-compliant fetch implementations
    (('name' in err && (err as any).name === 'AbortError') ||
      // Expo fetch
      ('message' in err && String((err as any).message).includes('FetchRequestCanceledException')))
  );
}

export const castToError = (err: any): Error => {
  if (err instanceof Error) return err;
  if (typeof err === 'object' && err !== null) {
    try {
      if (Object.prototype.toString.call(err) === '[object Error]') {
        const error = new Error(err.message, err.cause ? { cause: err.cause } : {});
        if (err.stack) error.stack = err.stack;
        if (err.cause && !error.cause) error.cause = err.cause;
        if (err.name) error.name = err.name;
        return error;
      }
    } catch {}
    try {
      return new Error(JSON.stringify(err));
    } catch {}
  }
  return new Error(err);
};
```
*What this shows:* `unknown`-typed error parameters; empty `catch {}` blocks (no variable) when the catch is truly a swallow; `castToError` normalizes anything to `Error` before rethrowing.

### Snippet 9: src/core/streaming.ts:44-80
```typescript
    async function* iterator(): AsyncIterator<Item, any, undefined> {
      if (consumed) {
        throw new AnthropicError('Cannot iterate over a consumed stream, use `.tee()` to split the stream.');
      }
      consumed = true;
      let done = false;
      try {
        for await (const sse of _iterSSEMessages(response, controller)) {
          if (sse.event === 'error') {
            const body = safeJSON(sse.data) ?? sse.data;
            const type = body?.error?.type as ErrorType | undefined;
            throw new APIError(undefined, body, undefined, response.headers, type);
          }
        }
        done = true;
      } catch (e) {
        // If the user calls `stream.controller.abort()`, we should exit without throwing.
        if (isAbortError(e)) return;
        throw e;
      } finally {
        // If the user `break`s, abort the ongoing request.
        if (!done) controller.abort();
      }
    }
```
*What this shows:* `try/finally` used to ensure cleanup (abort) regardless of outcome; abort errors are silently swallowed; all other errors rethrown verbatim; generators typed as `AsyncIterator<Item, any, undefined>`.

### Snippet 10: src/client.ts (makeRequest error path, ~line 660-700)
```typescript
    if (response instanceof globalThis.Error) {
      if (options.signal?.aborted) {
        throw new Errors.APIUserAbortError();
      }
      const isTimeout =
        isAbortError(response) ||
        /timed? ?out/i.test(String(response) + ('cause' in response ? String(response.cause) : ''));
      if (retriesRemaining) {
        loggerFor(this).info(
          `[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} - ${retryMessage}`,
        );
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID);
      }
      if (isTimeout) {
        throw new Errors.APIConnectionTimeoutError();
      }
      throw new Errors.APIConnectionError({ cause: response });
    }
```
*What this shows:* Error discrimination at the call site before rethrowing specific typed errors; log before retry; no generic `catch (e: any)` — the error type is checked structurally.

## Snippets — imports / modules

### Snippet 11: src/index.ts:1-35
```typescript
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

export { Anthropic as default } from './client';

export { type Uploadable, toFile } from './core/uploads';
export { APIPromise } from './core/api-promise';
export { BaseAnthropic, Anthropic, type ClientOptions, HUMAN_PROMPT, AI_PROMPT } from './client';
export { PagePromise } from './core/pagination';
export {
  AnthropicError,
  APIError,
  APIConnectionError,
  APIConnectionTimeoutError,
  APIUserAbortError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  BadRequestError,
  AuthenticationError,
  InternalServerError,
  PermissionDeniedError,
  UnprocessableEntityError,
} from './core/error';

export type {
  AutoParseableOutputFormat,
  ParsedMessage,
  ParsedContentBlock,
  ParseableMessageCreateParams,
  ExtractParsedContentFromParams,
} from './lib/parser';
```
*What this shows:* `export type { ... }` block for type-only exports; re-exports grouped semantically (errors together, types together); default export aliased (`Anthropic as default`); no barrel `export * from` for public API — names are explicit.

### Snippet 12: src/resources/messages/messages.ts:1-32
```typescript
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIPromise } from '../../core/api-promise';
import { APIResource } from '../../core/resource';
import { Stream } from '../../core/streaming';
import { buildHeaders } from '../../internal/headers';
import { RequestOptions } from '../../internal/request-options';
import { stainlessHelperHeader } from '../../lib/stainless-helper-header';
import { MessageStream } from '../../lib/MessageStream';
import {
  parseMessage,
  type ExtractParsedContentFromParams,
  type ParseableMessageCreateParams,
  type ParsedMessage,
} from '../../lib/parser';
import * as BatchesAPI from './batches';
import {
  BatchCreateParams,
  BatchListParams,
  Batches,
  ...
} from './batches';
import * as MessagesAPI from './messages';
```
*What this shows:* Imports ordered: internal SDK infrastructure first, then sibling modules with `* as Namespace` alias, then destructured named imports from siblings; `type` keyword inline on individual type imports; namespace alias (`* as BatchesAPI`) for local-module circular-ref avoidance.

### Snippet 13: src/client.ts (imports block, lines 1-40)
```typescript
import type { RequestInit, RequestInfo, BodyInit } from './internal/builtin-types';
import type { HTTPMethod, PromiseOrValue, MergedRequestInit, FinalizedRequestInit } from './internal/types';
import { uuid4 } from './internal/utils/uuid';
import { validatePositiveInteger, isAbsoluteURL, safeJSON } from './internal/utils/values';
import { sleep } from './internal/utils/sleep';
export type { Logger, LogLevel } from './internal/utils/log';
import { castToError, isAbortError } from './internal/errors';
import * as Errors from './core/error';
import * as Pagination from './core/pagination';
import * as Uploads from './core/uploads';
import * as API from './resources/index';
```
*What this shows:* `import type` for pure-type imports; namespace star-imports (`* as Errors`) for modules that expose many names used under a common prefix; utility imports individually destructured.

### Snippet 14: src/error.ts (deprecation re-export)
```typescript
/** @deprecated Import from ./core/error instead */
export * from './core/error';
```
*What this shows:* `@deprecated` JSDoc on a module-level re-export; deprecated paths are preserved but annotated, not deleted; this is the only place where `export *` appears — only for a thin compatibility shim.

### Snippet 15: src/internal/utils/values.ts:1-10
```typescript
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { AnthropicError } from '../../core/error';

// https://url.spec.whatwg.org/#url-scheme-string
const startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;

export const isAbsoluteURL = (url: string): boolean => {
  return startsWithSchemeRegexp.test(url);
};
```
*What this shows:* Comment citing the spec URL immediately before a regexp constant; `export const` arrow for pure utilities; file lives in `internal/utils/` — deep folder nesting mirrors logical scoping.

## Snippets — comments & docs

### Snippet 16: src/core/pagination.ts:74-90
```typescript
/**
 * This subclass of Promise will resolve to an instantiated Page once the request completes.
 *
 * It also implements AsyncIterable to allow auto-paginating iteration on an unawaited list call, eg:
 *
 *    for await (const item of client.items.list()) {
 *      console.log(item)
 *    }
 */
export class PagePromise<
    PageClass extends AbstractPage<Item>,
    Item = ReturnType<PageClass['getPaginatedItems']>[number],
  >
  extends APIPromise<PageClass>
  implements AsyncIterable<Item>
```
*What this shows:* Block JSDoc on classes explains the why and gives usage example inline; no `@param` on constructors when the intent is obvious from the type signature alone; example uses `for await` — idiomatic async.

### Snippet 17: src/core/api-promise.ts:52-78
```typescript
  /**
   * Gets the raw `Response` instance instead of parsing the response
   * data.
   *
   * If you want to parse the response body but still get the `Response`
   * instance, you can use {@link withResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  asResponse(): Promise<Response> {
    return this.responsePromise.then((p) => p.response);
  }
```
*What this shows:* `{@link method()}` cross-references in JSDoc; troubleshooting notes embedded in docs rather than a separate wiki; emoji used sparingly for high-visibility callouts (one `👋`).

### Snippet 18: src/internal/utils/log.ts:95-125
```typescript
export const formatRequestDetails = (details: {
  options?: RequestOptions | undefined;
  headers?: Headers | Record<string, string> | undefined;
  retryOfRequestLogID?: string | undefined;
  retryOf?: string | undefined;
  url?: string | undefined;
  status?: number | undefined;
  method?: string | undefined;
  durationMs?: number | undefined;
  message?: unknown;
  body?: unknown;
}) => {
  if (details.options) {
    details.options = { ...details.options };
    delete details.options['headers']; // redundant + leaks internals
  }
  if (details.headers) {
    details.headers = Object.fromEntries(
      ...
      ([name, value]) => [
          name,
          (name.toLowerCase() === 'x-api-key' || name.toLowerCase() === 'authorization') ?
            '***'
          : value,
        ],
    );
  }
```
*What this shows:* Inline comment `// redundant + leaks internals` explaining why a field is scrubbed; security-sensitive headers redacted silently at the logging layer, not thrown.

### Snippet 19: src/internal/utils/uuid.ts:1-18
```typescript
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

/**
 * https://stackoverflow.com/a/2117523
 */
export let uuid4 = function () {
  const { crypto } = globalThis as any;
  if (crypto?.randomUUID) {
    uuid4 = crypto.randomUUID.bind(crypto);
    return crypto.randomUUID();
  }
  ...
};
```
*What this shows:* Block JSDoc citing a Stack Overflow answer for non-obvious algorithms; self-reassigning `let` function for lazy platform detection (no comment needed beyond the SO link).

### Snippet 20: src/client.ts (constructor JSDoc, ~line 368-381)
```typescript
  /**
   * Base class for Anthropic API clients.
   *
   * @param {string | null | undefined} [opts.apiKey=process.env['ANTHROPIC_API_KEY'] ?? null]
   * @param {string | null | undefined} [opts.authToken=process.env['ANTHROPIC_AUTH_TOKEN'] ?? null]
   * @param {string} [opts.baseURL=process.env['ANTHROPIC_BASE_URL'] ?? https://api.anthropic.com]
   * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds)
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry.
   * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of
   *   this library is not allowed, as it risks exposing your secret API credentials to attackers.
   */
  constructor({
    baseURL = readEnv('ANTHROPIC_BASE_URL'),
    apiKey = readEnv('ANTHROPIC_API_KEY') ?? null,
    ...opts
  }: ClientOptions = {}) {
```
*What this shows:* `@param` with `[opts.field=defaultValue]` syntax for destructured-options constructor; human-readable default values (`10 minutes` not `600000`); `dangerously`-prefix naming convention for escape-hatch options.
