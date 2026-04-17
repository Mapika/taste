# 37signals

Distilled from the 37signals/Basecamp public repos (`basecamp/kamal`, `basecamp/trix`, `basecamp/console1984`, `basecamp/geared_pagination`, `basecamp/fizzy`) and the team blog at `dev.37signals.com`. This preset captures the voice of the whole team — Jorge Manrubia, Donal McBreen, Jeffrey Hardy, Jason Fried, Ryan Singer — not DHH's Rails DSL opinions, which are covered by the `dhh` preset.

## Voice

37signals code is shaped by one overriding conviction: the product is the point, and the tech is just the means. This produces a distinct aesthetic. Files are narrow — one concept, one class, one concern. Names are nouns that reflect domain reality (`Recording::Incineration`, `Account::Closable`), not patterns (`RecordingService`, `IncinerationHandler`). Modules and mixins compose behaviour; deep inheritance hierarchies do not. Dependency trees are lean by policy: Kamal works over plain SSH, Trix runs on web standards with near-zero runtime deps, geared_pagination adds exactly two helpers. Comments answer "why?" — a business rule that wouldn't survive a refactor without context — not "what?" POROs live in `app/models/` alongside Active Records without apology. Tests cover the happy path and one or two meaningful edge cases; coverage metrics are not a goal. READMEs open with the value proposition and the shortest path to success, because for an OSS library the README *is* the product. Commit messages are imperative, single-purpose, and short; issues go in Basecamp, not in commit subject lines.

**How this differs from the `dhh` preset:** DHH covers the Rails house style — `before_action`, resourceful routing, ActiveRecord sugar, the Rails DSL itself. 37signals-team covers the decisions *around* Rails: when to use a concern vs. a class, why you don't need service objects, what makes an error message good product copy, how to write an OSS README that converts readers into users, and how a six-week appetite shapes code scope. Jorge Manrubia writes about the shape of a well-factored model. Jason Fried writes about the shape of a well-scoped project. The team runs these together.

## Examples

- good: `module Account::Closable\n  extend ActiveSupport::Concern\n  def terminate = purge_or_incinerate if terminable?\nend`
- good: `class Recording::Incineration\n  def initialize(recording) = @recording = recording\n  def incinerate! = ActiveRecord::Base.transaction { ... @recording.destroy! }\nend`
- good: `errors.add(:email, "looks like it's already taken. Did you mean to sign in?")`
- good: `redirect_to @project, notice: "Project saved."`
- good: `# We keep the email reserved after cancellation to prevent impersonation.`
- good: `set_page_and_extract_portion_from Post.ordered` (geared_pagination — two helper methods, no configuration ceremony)
- good: `gem "console1984"` + one-lambda config (scope declared, nothing else imported)
- good: README opening: "Get up and running in 5 minutes: 1. gem install kamal  2. kamal init  3. Edit config/deploy.yml  4. kamal deploy"
- bad: `class RecordingService\n  def self.call(recording) ... end\nend`
- bad: `errors.add(:base, "An error occurred.")`
- bad: `redirect_to root_path, notice: "Record updated."`
- bad: `# TODO: clean this up later`
- bad: `class AbstractContentProcessor; class BaseTransformer < AbstractContentProcessor; end; end`
- bad: `require 'heavy_framework'; require 'another_dep'; require 'yet_another'`
- bad: `git commit -m "WIP fixes and changes"`

## Hard rules

- banned-token: `TODO:` — "Unresolved work items belong in Basecamp/the issue tracker, not in source code. A `TODO:` comment is a broken window that signals the team abandoned a decision mid-thought; see corpus snippet 16."
- banned-token: `@deprecated` — "37signals removes deprecated paths rather than annotating them. If a method must survive for compatibility, extract it to a named shim file with a comment citing the migration; don't scatter `@deprecated` tags in production code; see corpus snippet 17 (commit discipline)."
- banned-token: `class.*Service\b` — "37signals uses domain-named POROs (`Recording::Incineration`, `Signup`) instead of the `*Service` suffix. The suffix signals a failure to find the right noun; see corpus snippet 2 and snippet 4."
- file-naming: snake_case — "Ruby files are always snake_case. `account/closable.rb` not `Account/Closable.rb`. Enforced by rubocop-37signals (github.com/basecamp/house-style); see corpus snippet 15."
- banned-token: `\bAbstract[A-Z]` — "Abstract base classes signal over-engineering. Prefer a flat mixin (`extend ActiveSupport::Concern`) over an `AbstractFoo` class; see corpus snippets 20 and 21."
- banned-token: `class\s+\w+(Handler|Manager)\b` — "Pattern-suffix names (`SubscriptionExpirationHandler`, `ProjectManager`) hide the domain concept. Name the class after the noun it embodies (`Subscription::Expiration`, `Project`). The suffix is a red flag that the author couldn't find the right noun; see corpus snippet 2 and the bad example in snippet 21."
- banned-token: `module\s+\w+Helpers\b` — "37signals names concerns after the behaviour they add (`Closable`, `Billable`, `Searchable`), never after a holder (`AccountHelpers`). A `*Helpers` module name is a barrel, not a concept — it will accumulate unrelated methods over time; see corpus snippet 1."
- banned-token: `class\s+Base[A-Z]` — "Base classes that exist only to be subclassed are an inheritance smell. 37signals shares behaviour through mixins (`extend ActiveSupport::Concern`), not through `BaseAccount → SubscribedAccount → TrialAccount` chains; see corpus snippet 21."
- banned-token: `raise NotImplementedError` — "`raise NotImplementedError` is a sign of an abstract-base-class design. 37signals uses flat mixins with concrete implementations rather than stub methods that force subclasses to override; see corpus snippets 20 and 21."
- banned-token: `module Services\b|app/services/` — "37signals does not use a `services/` directory or a `Services` namespace. Domain behaviour lives in `app/models/` as POROs or concerns. `module Services` signals an accidental-complexity layer that Vanilla Rails makes unnecessary; see corpus snippet 24 and the bad example in snippet 4."
- banned-token: `gem ['\"](reform|dry-validation|virtus|draper|pundit|aasm|paper_trail|chronic|money-rails)['\"]` — "These gems introduce heavy abstractions (form objects, policy objects, state machines, decorators, versioning) that Vanilla Rails and plain Ruby already handle. 37signals' dep policy is lean by conviction: if ActiveModel::Model, a simple `case`/`when`, or a one-method PORO solves it, reach for the gem last; see corpus snippets 6–9 and snippet 24."
- banned-token: `# ={3,}|# -{3,}` — "Section-banner comments (`# ======= BILLING METHODS =======`) are a code smell: they signal that the class is doing too many things and should be split into narrow concerns. 37signals splits responsibilities into separate files, not into fenced sections; see corpus snippet 1 and snippet 14."
- banned-token: `WIP:` — "WIP commits on main signal undisciplined commit hygiene. 37signals squashes or branches WIP work; every commit on main should be a complete, coherent change with an imperative subject line under 60 chars; see corpus snippet 17 and 25."
- banned-token: `FIXME:` — "FIXME breadcrumbs in source or commit messages belong in Basecamp, not in code. A `FIXME:` in a commit subject line or in-code comment is a broken window — it signals known broken code was shipped; see corpus snippet 16 and 17."
- banned-token: `notice:.*Record (created|updated|deleted|saved) successfully` — "Database-term flash copy (`Record created successfully`) talks to the system, not the person. 37signals writes flash messages like product copy: active voice, plain words, humanised context (`Project saved.`, `Welcome aboard!`); see corpus snippets 10 and 11."
