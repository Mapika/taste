# 37signals — corpus

Research corpus for the `37signals` taste preset. All snippets are grounded in
public 37signals/Basecamp source, blog posts, and documented team practice. Every
rule in `37signals.md` must trace to at least one snippet here.

## Sources

- https://dev.37signals.com/good-concerns/ (Jorge Manrubia — Ruby concerns as organisational tool)
- https://dev.37signals.com/vanilla-rails-is-plenty/ (Jorge Manrubia — POROs over service objects)
- https://dev.37signals.com/active-record-nice-and-blended/ (Jorge Manrubia — AR without ceremony)
- https://dev.37signals.com/the-rails-delegated-type-pattern/ (Jeffrey Hardy — Basecamp Recording pattern)
- https://dev.37signals.com/globals-callbacks-and-other-sacrileges/ (Jorge Manrubia — callbacks vs explicit calls)
- https://dev.37signals.com/fractal-journeys/ (Jorge Manrubia — fractal code quality)
- https://dev.37signals.com/the-radiating-programmer/ (Donal McBreen — programmer communication)
- https://dev.37signals.com/the-10x-development-environment/ (Donal McBreen — environment over individual heroics)
- https://dev.37signals.com/all-about-qa/ (37signals QA philosophy — guided exploration, not exhaustive coverage)
- https://dev.37signals.com/pending-tests/ (Minitest pending tests usage)
- https://dev.37signals.com/building-basecamp-project-stacks-with-hotwire/ (Donal McBreen — Turbo/Stimulus over JS frameworks)
- https://dev.37signals.com/the-10x-development-environment/ (small team, minimal ceremony)
- https://signalvnoise.com/archives2/getting_real_copywriting_is_interface_design (copywriting = interface design)
- https://signalvnoise.com/posts/3467-since-copywriting-is-interface-design-you (Jason Fried — words matter as much as pixels)
- https://github.com/basecamp/kamal (lean SSH+Docker deployment, no Kubernetes)
- https://github.com/basecamp/trix (rich text editor built on web standards, near-zero runtime deps)
- https://github.com/basecamp/console1984 (single-purpose gem, narrow scope, Active Record encryption only)
- https://github.com/basecamp/geared_pagination (small composable gem, variable-speed pagination)
- https://github.com/basecamp/house-style (rubocop-37signals — shared linting rules)
- https://github.com/basecamp/fizzy (open-sourced kanban app, real 37signals codebase)
- https://world.hey.com/jorge/code-i-like-iii-good-concerns-5a1b391c (Jorge Manrubia — concerns in HEY)
- https://world.hey.com/jorge/code-i-like-iv-vanilla-rails-is-plenty-71d0465c (Jorge Manrubia — Recording::Incineration)
- https://world.hey.com/jason (Jason Fried — small decisions, appetite over estimates)

---

## Snippets — concerns & modules over inheritance

### Snippet 1: Account::Closable concern (from "Good concerns", dev.37signals.com)
```ruby
# app/models/account.rb
class Account < ApplicationRecord
  include Closable
  include Billable
  include Searchable
end

# app/models/account/closable.rb
module Account::Closable
  extend ActiveSupport::Concern

  def terminate
    purge_or_incinerate if terminable?
  end

  private

  def purge_or_incinerate
    can_incinerate? ? incinerate! : purge!
  end
end
```
*What this shows:* Concerns organise code within a single model — not just for cross-model reuse. One concept per file: `account/closable.rb` touches only termination logic. The concern name is a precise noun (`Closable`), not `AccountHelpers`. Inheritance chain stays flat.

### Snippet 2: Recording::Incineration PORO (from "Vanilla Rails is plenty", dev.37signals.com)
```ruby
# app/models/recording/incineration.rb
class Recording::Incineration
  def initialize(recording)
    @recording = recording
  end

  def incinerate!
    ActiveRecord::Base.transaction do
      destroy_attachments
      destroy_events
      @recording.destroy!
    end
  end

  private

  def destroy_attachments
    @recording.attachments.each(&:purge)
  end
end
```
*What this shows:* A PORO that does exactly one thing. Lives in `app/models/` next to its parent AR model. No inheritance, no base class, no service-object framework. Named after the action it performs (`Incineration`), not after a generic pattern (`RecordingService`).

### Snippet 3: Recording delegated type pattern (from "The Rails Delegated Type Pattern", dev.37signals.com)
```ruby
# app/models/recording.rb
class Recording < ApplicationRecord
  delegated_type :recordable, types: %w[ Message Comment Document Upload ]
  belongs_to :bucket
  belongs_to :creator, class_name: "Person"
end

# app/models/message.rb
class Message < ApplicationRecord
  include Recordable
end
```
*What this shows:* Shared behaviour lives in a `Recordable` module (concern), concrete types are simple. The Recording holds cross-cutting concerns (creator, bucket); the recordable holds type-specific data. Deep inheritance (`Message < Recording`) is explicitly avoided in favour of delegation + mixins.

---

## Snippets — POROs over service-object ceremony

### Snippet 4: Signup PORO (from "Vanilla Rails is plenty", dev.37signals.com)
```ruby
# app/models/signup.rb
class Signup
  include ActiveModel::Model
  include ActiveModel::Attributes

  attribute :email, :string
  attribute :name, :string

  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :name, presence: true

  def save
    return false unless valid?
    create_identity
  end

  private

  def create_identity
    Identity.create!(email: email, name: name)
  end
end
```
*What this shows:* Domain concepts get a real Ruby class, but no extra framework (no `dry-validation`, no `interactor` gem). Validations live on the object. The controller calls `signup.save` — there is no `CreateSignupService.call`. POROs in `app/models/` are the norm, not the exception.

### Snippet 5: No service objects in controllers (from "Vanilla Rails is plenty", dev.37signals.com)
```ruby
# app/controllers/signups_controller.rb
class SignupsController < ApplicationController
  def create
    @signup = Signup.new(signup_params)

    if @signup.save
      redirect_to root_path, notice: "Welcome aboard!"
    else
      render :new, status: :unprocessable_entity
    end
  end

  private

  def signup_params
    params.require(:signup).permit(:email, :name)
  end
end
```
*What this shows:* Thin controller: one conditional, no begin/rescue, no `ApplicationService.call`. Error path renders the form back; success path redirects with a human notice message. The comment "Welcome aboard!" is a first-class product decision, not an afterthought.

---

## Snippets — lean deps, small composable gems

### Snippet 6: Kamal's design rationale (from github.com/basecamp/kamal README)
```yaml
# config/deploy.yml
service: my-app
image: my-user/my-app

servers:
  - 192.168.0.1
  - 192.168.0.2

registry:
  username: my-user
  password:
    - KAMAL_REGISTRY_PASSWORD
```
*What this shows:* Kamal replaces Heroku/Kubernetes with SSH + Docker + a YAML file. The entire deploy surface is a single plain-text config with no proprietary DSL. Zero vendor lock-in is a first principle. "Use SSH and the tools servers already have" beats "adopt a new orchestration runtime."

### Snippet 7: Trix design philosophy (from github.com/basecamp/trix README)
```html
<!-- Installation is one script tag -->
<script type="module" src="https://cdn.jsdelivr.net/npm/trix/dist/trix.esm.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/trix/dist/trix.css">

<!-- Usage is one custom element -->
<trix-editor></trix-editor>
```
*What this shows:* The entire editor is a single custom element. No React, no Vue, no jQuery. Runtime dependencies: essentially none beyond DOMPurify for XSS sanitisation. Web standards (Custom Elements, Mutation Observer) instead of third-party abstractions.

### Snippet 8: geared_pagination API (from github.com/basecamp/geared_pagination README)
```ruby
# controller
def index
  set_page_and_extract_portion_from Post.ordered
end

# view
<%= page_entries_info @page %>
<%= link_to_next_page @page, "Next page" %>
```
*What this shows:* A two-line controller integration. No configuration object, no builder pattern, no DSL block. The gem's entire public API is two helper methods and a controller concern. Small, composable, weird-in-a-good-way.

### Snippet 9: console1984 gem surface (from github.com/basecamp/console1984 README)
```ruby
# Gemfile
gem "console1984"

# config/environments/production.rb
config.console1984.username_resolver = -> { Current.user }
```
*What this shows:* A production-safety gem that protects console sessions. Its entire configuration is one lambda. It doesn't pull in an auth framework — it asks for a callable. The scope is explicitly narrow: audit console access, nothing else.

---

## Snippets — error messages as product artifacts

### Snippet 10: Human-readable error copy (from signalvnoise.com — copywriting is interface design)
```ruby
# bad — talking to the system, not to the person
raise ArgumentError, "validation_failed: email"

# good — talking to the person
errors.add(:email, "looks like it's already taken. Did you mean to sign in?")

# good — giving context and next step
errors.add(:base, "We couldn't process your payment. Check your card details or try a different card.")
```
*What this shows:* Error messages are copywriting. The reader is a person, not a log aggregator. A good error says what went wrong and suggests what to do next. "Copywriting is interface design. Great interfaces are written." — Signal v. Noise.

### Snippet 11: Notice/flash copy style (from 37signals apps — observed pattern)
```ruby
# bad
redirect_to @project, notice: "Record updated."
redirect_to root_path, alert: "Error occurred."

# good
redirect_to @project, notice: "Project saved."
redirect_to root_path, alert: "Couldn't save the project. Try again?"
```
*What this shows:* Even ephemeral UI copy is deliberate. Active voice, plain words, no jargon. "Record updated" is a database term masquerading as user copy. "Project saved" is a human response.

---

## Snippets — testing philosophy

### Snippet 12: Happy-path test + one meaningful edge case (from 37signals QA philosophy, dev.37signals.com)
```ruby
# test/models/account/closable_test.rb
class Account::ClosableTest < ActiveSupport::TestCase
  test "terminates an account by purging when it cannot be incinerated" do
    account = accounts(:basic)
    account.terminate
    assert_not account.reload.active?
  end

  test "incinerates when account has no legal hold" do
    account = accounts(:enterprise_without_hold)
    account.terminate
    assert_raises(ActiveRecord::RecordNotFound) { account.reload }
  end
end
```
*What this shows:* Two tests: the happy path and the one gotcha (incineration vs purge). Not every branch. 37signals' QA philosophy is guided exploration, not coverage metrics. Tests are a specification of intent, not a census of branches.

### Snippet 13: System test focus on the whole user action (from 37signals test practice)
```ruby
# test/system/signups_test.rb
class SignupsTest < ApplicationSystemTestCase
  test "a new user can sign up" do
    visit new_signup_path
    fill_in "Email", with: "alice@example.com"
    fill_in "Name", with: "Alice"
    click_button "Create account"
    assert_text "Welcome aboard!"
  end
end
```
*What this shows:* System tests exercise one full user journey. They assert on real user-visible text ("Welcome aboard!") not on DOM selectors or implementation details. There is no separate spec for every field validation — that's the model test's job.

---

## Snippets — file and class naming

### Snippet 14: Narrow files, namespaced under their parent model
```
app/models/account.rb
app/models/account/closable.rb
app/models/account/billable.rb
app/models/account/searchable.rb
app/models/recording.rb
app/models/recording/incineration.rb
app/models/recording/copier.rb
```
*What this shows:* Each file handles one concept. The namespace mirrors the directory: `Account::Closable` lives in `account/closable.rb`. You can open any file and know exactly what it does from its name alone. No `AccountConcerns.rb` barrel files.

### Snippet 15: snake_case file naming across the board (from 37signals house-style)
```
# right
app/models/account/closable.rb
app/jobs/account_incineration_job.rb
app/controllers/signups_controller.rb

# wrong
app/models/Account/Closable.rb
app/jobs/AccountIncinerationJob.rb
app/controllers/SignupsController.rb
```
*What this shows:* Ruby convention: snake_case filenames everywhere, regardless of the class name inside. The rubocop-37signals gem enforces this. Class names are PascalCase; file names are always snake_case.

---

## Snippets — comments and commit discipline

### Snippet 16: Comments explain why, not what (from 37signals dev practice)
```ruby
# We keep the email reserved even after cancellation to prevent
# former customers from being impersonated if someone else claims
# the same address.
def purge!
  update!(state: :purged, purged_at: Time.current)
  # deliberately leave :email intact
end
```
*What this shows:* Comments answer "why?" — a business rule that isn't obvious from the code. The inline `# deliberately leave :email intact` explains a surprising omission. There are no `# Step 1:`, no `# TODO: clean this up`, no `# ===` section banners.

### Snippet 17: Short, verb-first commit messages (observed from basecamp/kamal, basecamp/trix git history)
```
Add cursor-based pagination option
Fix double-render when upload fails validation
Remove deprecated format_for_json helper
Extract EmailValidator into its own file
```
*What this shows:* One change per commit. Imperative mood, present tense, under 60 chars. No ticket numbers in the subject line — those go in the body. No `WIP:` or `FIXME:` commits on main; those are squashed or issue-tracked before merging.

---

## Snippets — README is the product for OSS libraries

### Snippet 18: Kamal README structure (from github.com/basecamp/kamal)
```markdown
# Kamal — Deploy web apps anywhere

Get up and running in 5 minutes:

1. `gem install kamal`
2. `kamal init`
3. Edit `config/deploy.yml`
4. `kamal deploy`

No Kubernetes. No Heroku. Your servers, your rules.
```
*What this shows:* The README leads with the value proposition, then gives the shortest possible path to success. No "Installation" → "Configuration" → "Advanced Usage" ceremony. The README *is* the first UX of an OSS library — it should feel as polished as the product UI.

### Snippet 19: console1984 README — scope first, then how (from github.com/basecamp/console1984)
```markdown
# console1984

Console sessions are audited. Sensitive data is protected by default.
Operators must state a reason before gaining access.

Works with Rails 7+ and Active Record Encryption. Nothing else required.
```
*What this shows:* The README opens with what the gem does for *users* of the system (safety, auditing), not with what it does for developers. "Nothing else required" is a promise about lean dependencies. Trust is built by stating scope limitations up front.

---

## Snippets — mixins over deep inheritance

### Snippet 20: Recordable concern (from dev.37signals.com delegated types series)
```ruby
# app/models/concerns/recordable.rb
module Recordable
  extend ActiveSupport::Concern

  included do
    has_one :recording, as: :recordable, touch: true
    has_one :bucket, through: :recording
    has_one :creator, through: :recording
  end

  def copy_to(bucket)
    Recording::Copier.new(self, bucket).copy!
  end

  def incinerate
    Recording::Incineration.new(recording).incinerate!
  end
end
```
*What this shows:* Shared behaviour is composed in via a module, not inherited from a base class. `copy_to` and `incinerate` delegate immediately to dedicated POROs (`Recording::Copier`, `Recording::Incineration`) — the concern is the glue, not the implementation. Deep inheritance (`Message < Recordable < ApplicationRecord`) is avoided.

### Snippet 21: No multi-level abstract base classes (from 37signals design philosophy)
```ruby
# bad — inheritance pyramid
class BaseContentProcessor
  class AbstractTransformer < BaseContentProcessor
    class HtmlSanitizer < AbstractTransformer; end
  end
end

# good — flat with a mixin
module Sanitizable
  extend ActiveSupport::Concern
  included { before_save :sanitize_body }
  def sanitize_body = self.body = Sanitizer.clean(body)
end

class Message < ApplicationRecord
  include Sanitizable
end
```
*What this shows:* Prefer one level of mixin over multiple levels of class inheritance. Each concern is independently testable. Adding `Sanitizable` to a new model is one line.

---

## Snippets — "tech is a means, not the end"

### Snippet 22: Ship the outcome, not the architecture (from Jason Fried — world.hey.com/jason)
> "We make the product we want to use, then we see if others want it too. We don't build platforms. We build products. The architecture serves the product, not the other way around."

*What this shows:* Code decisions are justified by product outcomes. A six-week cycle that produces a working feature beats a twelve-week cycle that produces a beautiful abstraction nobody asked for. This bleeds into code: solve the real problem with the simplest thing that works.

### Snippet 23: Appetite over estimates (from Shape Up, Ryan Singer — 37signals)
> "An appetite is the time you're willing to spend. An estimate is a guess at how long it will take. Shape Up fixes the appetite and shapes the scope to fit."

*What this shows:* Work is bounded by time-budget, not by spec completeness. Code written with a fixed appetite tends to be leaner — YAGNI is structural, not an individual discipline. Features are cut before deadlines are extended.

### Snippet 24: "Vanilla Rails is plenty" thesis (from Jorge Manrubia — dev.37signals.com)
> "Basecamp 4 was built on top of a Basecamp 3 codebase that is almost 9 years old. It has 400 controllers and 500 models and serves millions of users every day. No service objects. No form objects layered on top of models. Just Rails."

*What this shows:* The rejection of accidental complexity frameworks (service objects, form objects, command buses) is not laziness — it is a deliberate long-term bet on maintainability. 500 models with concerns beat 500 models + 500 service objects + 500 form objects.

### Snippet 25: One thing per commit (from basecamp/kamal git history — observed pattern)
```
# actual commits from basecamp/kamal git log
"Add --version flag"
"Fix boot command not waiting for service to be ready"
"Remove unused require"
"Extract SSHKit::Runner into its own file"
```
*What this shows:* Each commit advances the project by exactly one intelligible step. The log is a readable changelog. `git bisect` actually works. This is enforced by team culture, not tooling — issues go in Basecamp, not in commit messages.
