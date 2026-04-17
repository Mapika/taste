# 37signals — showcase

Representative examples of the 37signals team taste. These are the patterns that distinguish this preset from the `dhh` preset: DHH covers the Rails DSL; this covers the *shape* of the models, the tone of the error messages, the philosophy of the README, and the discipline of the commit.

---

## Narrow concerns, not an inheritance pyramid

```ruby
# bad — abstract base class hierarchy
class AbstractContentProcessor
  def process(content) = raise NotImplementedError
end
class AbstractHtmlProcessor < AbstractContentProcessor
  def sanitize(html) = raise NotImplementedError
end
class BodySanitizer < AbstractHtmlProcessor
  def process(content) = sanitize(content.body)
  def sanitize(html) = ActionController::Base.helpers.sanitize(html)
end

# good — flat mixin, one concept per concern
module Sanitizable
  extend ActiveSupport::Concern
  included { before_save :sanitize_body }

  private
  def sanitize_body
    self.body = ActionController::Base.helpers.sanitize(body)
  end
end

class Message < ApplicationRecord
  include Sanitizable
end
```

The `Abstract*` hierarchy creates coupling for no real benefit. The concern is independently testable, can be added to any model in one line, and has a single reason to change.

---

## Domain-named POROs in `app/models/` — no service suffix

```ruby
# bad — pattern name masquerading as a domain concept
class AccountClosureService
  def self.call(account) = new(account).execute
  def execute = account.update!(state: :closed)
end

# good — the domain concept has a real name
class Account::Closure
  def initialize(account)
    @account = account
  end

  def close!
    ActiveRecord::Base.transaction do
      @account.update!(state: :closed, closed_at: Time.current)
      @account.projects.each(&:archive!)
      AccountMailer.closure_confirmation(@account).deliver_later
    end
  end
end
```

`Account::Closure` is in `app/models/account/closure.rb`. You know what it does from the name. `AccountClosureService` tells you there was a pattern applied; `Account::Closure` tells you there's a thing in the domain called a closure.

---

## Error messages talk to people, not to logs

```ruby
# bad — technical identifier leaking into user-visible copy
errors.add(:email, "validation_failed: uniqueness_constraint_violated")
redirect_to root_path, alert: "An error occurred."
flash[:notice] = "Record updated."

# good — written for the person reading it
errors.add(:email, "looks like it's already taken. Did you mean to sign in?")
redirect_to root_path, alert: "Couldn't save your changes. Try again?"
redirect_to @project, notice: "Project saved."
```

"Copywriting is interface design. Great interfaces are written." — Signal v. Noise. The words in a flash message are as deliberate as the colour of a button. A good error message says what went wrong and, where possible, what to do next.

---

## Happy-path tests plus one meaningful edge case

```ruby
# bad — exhaustive branch coverage that adds noise without insight
class AccountTest < ActiveSupport::TestCase
  test "terminable? when active"       do assert Account.new(state: :active).terminable?   end
  test "terminable? when closed"       do refute Account.new(state: :closed).terminable?   end
  test "terminable? when purged"       do refute Account.new(state: :purged).terminable?   end
  test "terminable? when incinerated"  do refute Account.new(state: :incinerated).terminable? end
  test "terminable? when nil"          do refute Account.new(state: nil).terminable?        end
end

# good — intent is clear, the gotcha is covered
class Account::ClosableTest < ActiveSupport::TestCase
  test "terminates an account by purging when incineration is not allowed" do
    account = accounts(:basic)
    account.terminate
    assert_not account.reload.active?
  end

  test "incinerates when account has no data-retention hold" do
    account = accounts(:enterprise_without_hold)
    account.terminate
    assert_raises(ActiveRecord::RecordNotFound) { account.reload }
  end
end
```

37signals' QA philosophy is guided exploration. Tests are a specification of intent, not a census of code paths. The second test catches the one scenario where the outcome is qualitatively different — that's the edge case worth having.

---

## README as the first UX of an OSS library

```markdown
# bad — installation ceremony before value

## Installation
Add this line to your Gemfile: `gem 'geared_pagination'`
Then execute: `bundle install`
Or install yourself: `gem install geared_pagination`
...

## What does it do?
(Three paragraphs down) Paginate Active Record sets at variable speeds.

---

# good — value proposition first, then the path

# Geared Pagination

Paginate Active Record sets at variable speeds — more records per page
as you go deeper, without any extra configuration.

```ruby
def index
  set_page_and_extract_portion_from Post.ordered
end
```

That's it. Add `gem 'geared_pagination'` to your Gemfile.
```

The README is the product for an OSS library. A developer reads the first three lines and decides whether to keep going. Lead with what it does for them, then show the shortest path to success. Installation instructions can wait.

---

## Comments explain why, not what

```ruby
# bad — restates the code in English
def purge!
  # Update the state to purged
  update!(state: :purged)
  # Set the purged_at timestamp to now
  update!(purged_at: Time.current)
  # Delete all attachments
  attachments.each(&:purge)
end

# good — explains the surprising omission
def purge!
  # We keep :email intact even after purging so former customers can't be
  # impersonated if someone else claims the same address later.
  update!(state: :purged, purged_at: Time.current)
  attachments.each(&:purge)
end
```

If a comment just translates the code into a sentence, delete it. If it explains a business rule that would be a mystery to the next reader — or to yourself in six months — it earns its line.

---

## One thing per commit

```
# bad — scope creep, no signal in the log
ab3f1c2 WIP: fixing stuff
9d8e4b1 more changes and updates
7f2a3d0 FIXME: temp commit please ignore

# good — each commit is a complete, intelligible step
a1b2c3d Add cursor-based pagination option
e4f5a6b Fix double-render when upload fails validation
c7d8e9f Remove unused format_for_json helper
b0a1c2d Extract EmailValidator into its own file
```

The git log is a changelog. `git bisect` works. New team members understand what changed and why. Issues, references, and context go in Basecamp — the commit subject is for one thing, stated clearly.

---

## Lean deps: SSH + Docker beats Kubernetes

```yaml
# bad — Kubernetes manifest, 200 lines of YAML, vendor lock-in
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: my-app
          image: my-registry/my-app:latest
          resources:
            requests: { cpu: "250m", memory: "512Mi" }
            limits:   { cpu: "500m", memory: "1Gi" }

# good — Kamal, plain YAML, your servers, your rules
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

Kamal uses SSH and tools the servers already have. No control plane, no cluster, no vendor-specific runtime. If you can SSH into a box and run Docker, you can deploy. The principle: reach for the simplest tool that solves the real problem.
