# anthropic

Distilled from the Anthropic SDK repos (`anthropics/anthropic-sdk-typescript`) — the TypeScript SDK is the most representative public Anthropic code and is written entirely by Anthropic engineers rather than generated.

## Voice

Anthropic TypeScript is architecturally conservative and semantically precise. Classes are single-purpose and shallow: `APIResource` holds only `_client`; `AbstractPage` holds only navigation logic. Methods are overload-heavy — the public surface uses TypeScript overload chains to encode the streaming/non-streaming duality at the type level rather than at runtime, so callers never need a cast. Naming reads like an API contract: `validatePositiveInteger`, `ensurePresent`, `castToError`, `isAbsoluteURL` — verb + noun, no abbreviation, no acronym soup. File names are kebab-case (`detect-platform.ts`, `api-promise.ts`, `request-options.ts`); directories mirror logical scope (`internal/utils/`, `core/`, `resources/`).

Comments appear at two levels and nowhere else: JSDoc on every exported symbol (with `@example`, `@unit`, `@default`, `@deprecated`, `{@link}` as needed), and inline `// <reason>` on any line where a reader would stop and ask "why?". There are no section dividers, no `// ========` banners, no TODO-style breadcrumbs left in production code. Error handling follows a strict hierarchy: `AnthropicError` at the root, `APIError` with typed generics for status/headers/body, then narrow subclasses dispatched by HTTP status code in a `static generate()` factory. `try/catch` appears only at infrastructure boundaries; application code never catches `unknown` without checking `isAbortError` first and rethrowing everything else.

## Examples

- good: `export class BadRequestError extends APIError<400, Headers, Object> {}`
- good: `export type LogLevel = 'off' | 'error' | 'warn' | 'info' | 'debug';`
- good: `create(body: MessageCreateParamsNonStreaming, options?: RequestOptions): APIPromise<Message>;`
- good: `export { type Uploadable, toFile } from './core/uploads';`
- good: `export type { ParsedMessage, ParsedContentBlock } from './lib/parser';`
- good: `const isTimeout = isAbortError(response) || /timed? ?out/i.test(String(response));`
- good: `if (!status || !headers) { return new APIConnectionError({ message, cause: castToError(errorResponse) }); }`
- good: `/** @deprecated Import from ./core/error instead */\nexport * from './core/error';`
- bad: `export enum LogLevel { Off = 'off', Error = 'error', Warn = 'warn' }`
- bad: `catch (e: any) { console.error(e); }`
- bad: `export * from './messages';`
- bad: `// ===== Error handling section =====`
- bad: `function createMsg(b: MsgCreateParams, opts?: ReqOpts): APIPromise<Msg>`
- bad: `const isTimeout = e.name == 'AbortError'`

## Hard rules

- banned-token: `\benum\b` — "Anthropic uses string-union types (`type LogLevel = 'off' | 'error'`) never TypeScript `enum`; see corpus snippet 4 (src/internal/utils/log.ts)"
- banned-token: `catch\s*\(\s*\w+\s*:\s*any\s*\)` — "Error parameters must be typed `unknown`, not `any`; cast with `castToError()` before use; see corpus snippet 8 (src/internal/errors.ts)"
- banned-token: `export \* from` — "Public API re-exports are explicit named exports, not barrel `export *`; `export *` appears only on deprecated compatibility shims; see corpus snippet 11 (src/index.ts) and snippet 14 (src/error.ts)"
- file-naming: kebab-case
- banned-token: `class\s+\w+(Utils|Helpers?|Factory|Service|Manager|Handler|Processor)\b` — "Anthropic uses single-purpose classes with domain-specific names (`Messages`, `APIResource`, `Stream`), never utility-bag classes like `StringUtils` or `RequestUtils`; see corpus snippets 1–2"
- banned-token: `throw\s+['"\`]` — "Errors must be thrown as `Error` instances (preferably `AnthropicError` subclasses), never as bare string literals; see corpus snippet 7 (src/core/error.ts)"
- banned-token: `console\.(log|error|warn|info|debug)\(` — "Production code routes all output through the `Logger` interface (`loggerFor(this).info(...)`); bare `console.*` calls are never used in SDK source; see corpus snippet 18 (src/internal/utils/log.ts)"
- banned-token: `\brequire\s*\(` — "All imports use ES module `import`/`import type` syntax; CommonJS `require()` is absent from the SDK source; see corpus snippet 13 (src/client.ts imports block)"
- banned-token: `\bexport default\b` — "Anthropic SDK exports are all named exports; `export default` is not used — default re-exports appear only as `export { Foo as default }` aliased form; see corpus snippet 11 (src/index.ts)"
- banned-token: `//\s*[-=]{3,}` — "Section-divider banner comments (`// ===== Section =====`, `// ---- setup ----`) do not appear in production Anthropic code; see corpus snippet 16–18 (no banners in pagination.ts, log.ts)"
- banned-token: `//\s*TODO` — "TODO breadcrumbs are not left in production SDK code; see Voice prose: 'no TODO-style breadcrumbs left in production code'"
- banned-token: `\b(procReq|hdrs|ReqOpts|MsgCreate)\b` — "Anthropic naming is fully spelled out (`processRequest`, `headers`, `RequestOptions`); abbreviation soup violates the 'verb + noun, no abbreviation' rule; see corpus snippet 5 bad example: `createMsg(b: MsgCreateParams, opts?: ReqOpts)`"
- banned-token: `extends\s+\w+Service\b` — "Deep class hierarchies (`BaseService → HttpService → MessagesService`) contradict the shallow single-purpose class pattern; resource classes extend only `APIResource`; see corpus snippet 1 (src/core/resource.ts)"
- banned-token: `//\s*file:.*_.*\.(ts|js)` — "File names are kebab-case (`detect-platform.ts`); snake_case filenames (e.g. `detect_platform.ts`) violate the file-naming rule; see corpus snippet 3 (src/internal/detect-platform.ts)"
- banned-token: `Returns the (length|value|string|number|array|object|result|list)` — "JSDoc explains the *why*, not the *what*; descriptions that restate what the code obviously does ('Returns the length of a string') add no information; see corpus snippet 16–17 (informative JSDoc in pagination.ts)"
- banned-token: `this\.name\s*=` — "Custom error classes must extend the `AnthropicError` hierarchy and set no `.name` manually; `AnthropicError` and `APIError` handle the error identity; see corpus snippet 6–7 (src/core/error.ts)"
