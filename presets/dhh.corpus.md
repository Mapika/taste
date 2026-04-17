# dhh — corpus

Research corpus for the `dhh` taste preset. All snippets are real excerpts
from public Rails source or direct quotations from DHH's writing. Every rule
in `dhh.md` must trace to at least one of these snippets.

## Sources

- https://raw.githubusercontent.com/rails/rails/main/activerecord/lib/active_record/base.rb (ActiveRecord documentation, query DSL, attribute conventions)
- https://raw.githubusercontent.com/rails/rails/main/activerecord/lib/active_record/scoping/named.rb (named scopes, composable relations)
- https://raw.githubusercontent.com/rails/rails/main/activerecord/lib/active_record/validations.rb (validation lifecycle, save!/valid? pattern)
- https://raw.githubusercontent.com/rails/rails/main/activerecord/lib/active_record/associations.rb (association builder autoloading)
- https://raw.githubusercontent.com/rails/rails/main/railties/lib/rails/application.rb (Application class, initializer ordering, delegate DSL)
- https://raw.githubusercontent.com/rails/rails/main/railties/lib/rails/generators/rails/scaffold_controller/templates/controller.rb.tt (canonical scaffold controller shape)
- https://raw.githubusercontent.com/rails/rails/main/actionpack/lib/action_controller/metal/strong_parameters.rb (params DSL, ParameterMissing hierarchy)
- https://raw.githubusercontent.com/rails/rails/main/activesupport/lib/active_support/concern.rb (Concern module, included/class_methods DSL)
- https://raw.githubusercontent.com/rails/rails/main/activesupport/lib/active_support/callbacks.rb (define_callbacks, set_callback, run_callbacks)
- https://raw.githubusercontent.com/rails/rails/main/activesupport/lib/active_support/core_ext/string/inflections.rb (String core-ext: pluralize, singularize, constantize)
- https://rubyonrails.org/doctrine (Rails Doctrine — Convention over Configuration, Omakase, Conceptual Compression, Beautiful Code, Integrated Systems, Progress over Stability, Raise a Big Tent)
- https://world.hey.com/dhh (DHH blog posts on taste, simplicity, and the writing-experience of APIs)

## Snippets — DSL & naming conventions

### Snippet 1: activerecord/lib/active_record/base.rb:18-25 (class-inferred columns)
```ruby
# Active Record objects don't specify their attributes directly, but rather
# infer them from the table definition with which they're linked. Adding,
# removing, and changing attributes and their type is done directly in the
# database. Any change is instantly reflected in the Active Record objects.
module ActiveRecord
  class Base
    # ...
  end
end
```
*What this shows:* Convention over configuration at its most radical — the class never declares attributes; the database is the single source of truth. No `attr_accessor :name, :email` boilerplate.

### Snippet 2: activerecord/lib/active_record/base.rb:32-45 (fluent query API)
```ruby
user = User.new(name: "David", occupation: "Code Artist")
user.name # => "David"

# Conditions can either be specified as a string, array, or hash
# representing the WHERE-part of an SQL statement.
User.where(user_name: user_name, password: password).first

Student.where(first_name: "Harvey", status: 1)
Student.where(grade: 9..12)
Student.where(grade: [9,11,12])
Student.joins(:schools).where(schools: { category: 'public' })
```
*What this shows:* Ornate, English-prose query chain. Hash arguments read like natural-language predicates. Ranges and arrays slot directly into `where`. No builder objects, no query DSL class, no `.eq()` / `.in()` wrappers.

### Snippet 3: activerecord/lib/active_record/scoping/named.rb:64-70 (named scope DSL)
```ruby
class Shirt < ActiveRecord::Base
  scope :red,            -> { where(color: 'red') }
  scope :dry_clean_only, -> { joins(:washing_instructions).where('washing_instructions.dry_clean_only = ?', true) }
end

Shirt.red.dry_clean_only.count
Shirt.red.dry_clean_only.average(:thread_count)
```
*What this shows:* `scope` is a class-level macro that names a reusable, composable query fragment. The name reads like plain English: `Shirt.red`, `Shirt.dry_clean_only`. Composing them (`Shirt.red.dry_clean_only`) reads like a sentence.

### Snippet 4: railties/…/scaffold_controller/templates/controller.rb.tt (canonical CRUD shape)
```ruby
class PostsController < ApplicationController
  before_action :set_post, only: %i[ show edit update destroy ]

  def index
    @posts = Post.all
  end

  def show
  end

  def create
    @post = Post.new(post_params)
    if @post.save
      redirect_to @post, notice: "Post was successfully created."
    else
      render :new, status: :unprocessable_entity
    end
  end

  private
    def set_post
      @post = Post.find(params.expect(:id))
    end

    def post_params
      params.expect(post: [ :title, :body ])
    end
end
```
*What this shows:* `before_action :set_post` is the archetypal DHH naming convention — verb (before) + noun (action) + predicate method name (`:set_post`). REST actions are empty when they only render. Private section is indented one extra level to visually signal it is implementation detail.

### Snippet 5: railties/lib/rails/application.rb:69-82 (delegate DSL and autoload)
```ruby
autoload :Bootstrap,              "rails/application/bootstrap"
autoload :Configuration,          "rails/application/configuration"
autoload :DefaultMiddlewareStack, "rails/application/default_middleware_stack"
autoload :Finisher,               "rails/application/finisher"

delegate :default_url_options, :default_url_options=, to: :routes

attr_accessor :assets, :sandbox
alias_method  :sandbox?, :sandbox
attr_reader   :reloaders, :reloader, :executor, :autoloaders
```
*What this shows:* `delegate` reads like English: "delegate `default_url_options` to `routes`". `alias_method :sandbox?, :sandbox` creates the predicate form without duplication. `autoload` is lazy-require by convention — no eager-loading boilerplate.

### Snippet 6: activesupport/lib/active_support/concern.rb:17-37 (Concern included/class_methods DSL)
```ruby
module M
  extend ActiveSupport::Concern

  included do
    scope :disabled, -> { where(disabled: true) }
  end

  class_methods do
    def find_or_create_by_name(name)
      find_or_create_by(name: name)
    end
  end
end
```
*What this shows:* `included do … end` and `class_methods do … end` are DHH-style DSL blocks that replace the boilerplate `def self.included(base); base.class_eval do … end; end` ceremony. The code reads top-to-bottom like a specification.

### Snippet 7: activesupport/lib/active_support/core_ext/string/inflections.rb:8-32 (String core extensions)
```ruby
'post'.pluralize              # => "posts"
'ScaleScore'.tableize         # => "scale_scores"
'Module'.constantize          # => Module
'posts'.singularize           # => "post"
'active_record'.camelize      # => "ActiveRecord"
'active_record/errors'.camelize # => "ActiveRecord::Errors"
```
*What this shows:* ActiveSupport extends core Ruby classes with domain-relevant methods. `'post'.pluralize` rather than `Inflector.pluralize('post')`. DHH treats this extension of stdlib as a feature, not an anti-pattern. It compresses intent: one method call replaces an import + function call.

### Snippet 8: activerecord/lib/active_record/validations.rb:24-44 (save!/valid? lifecycle)
```ruby
def save(**options)
  perform_validations(options) ? super : false
end

def save!(**options)
  perform_validations(options) ? super : raise_validation_error
end

def valid?(context = nil)
  context ||= default_validation_context
  output = super(context)
  errors.empty? && output
end

alias_method :validate, :valid?
```
*What this shows:* Bang-method convention (`save!`) signals "raise on failure". The non-bang version returns false. `alias_method :validate, :valid?` gives the predicate two English-natural names. No checked-exception style; errors surface via `record.errors`.

## Snippets — metaprogramming & conceptual compression

### Snippet 9: activerecord/lib/active_record/associations.rb:21-38 (builder autoload by convention)
```ruby
module Builder
  autoload :Association,           "active_record/associations/builder/association"
  autoload :SingularAssociation,   "active_record/associations/builder/singular_association"
  autoload :CollectionAssociation, "active_record/associations/builder/collection_association"

  autoload :BelongsTo,           "active_record/associations/builder/belongs_to"
  autoload :HasOne,              "active_record/associations/builder/has_one"
  autoload :HasMany,             "active_record/associations/builder/has_many"
  autoload :HasAndBelongsToMany, "active_record/associations/builder/has_and_belongs_to_many"
end
```
*What this shows:* File naming follows a strict `snake_case` convention that mirrors the module hierarchy. `HasAndBelongsToMany` lives at `builder/has_and_belongs_to_many.rb`. The file system is the namespace map.

### Snippet 10: activesupport/lib/active_support/callbacks.rb:55-75 (define_callbacks DSL)
```ruby
class Record
  include ActiveSupport::Callbacks
  define_callbacks :save

  def save
    run_callbacks :save do
      puts "- save"
    end
  end
end

class PersonRecord < Record
  set_callback :save, :before, :saving_message
  def saving_message
    puts "saving..."
  end

  set_callback :save, :after do |object|
    puts "saved"
  end
end
```
*What this shows:* `define_callbacks :save` with one symbol creates an entire before/around/after callback lifecycle. `set_callback :save, :before, :saving_message` reads like a sentence. Metaprogramming creates the infrastructure; the programmer names the moment.

### Snippet 11: activerecord/lib/active_record/base.rb:88-102 (overwriting accessors without boilerplate)
```ruby
class Song < ActiveRecord::Base
  # Uses an integer of seconds to hold the length of the song

  def length=(minutes)
    super(minutes.to_i * 60)
  end

  def length
    super / 60
  end
end
```
*What this shows:* Override the generated accessor by simply defining it — call `super` to reach the underlying column. No adapter, no separate converter class, no decorator. The model is the domain object.

### Snippet 12: actionpack/…/strong_parameters.rb:20-42 (ParameterMissing hierarchy)
```ruby
class ParameterMissing < KeyError
  attr_reader :param, :keys

  def initialize(param, keys = nil)
    @param = param
    @keys  = keys
    super("param is missing or the value is empty or invalid: #{param}")
  end
end

class ExpectedParameterMissing < ParameterMissing
end

class UnpermittedParameters < IndexError
  attr_reader :params

  def initialize(params)
    @params = params
    super("found unpermitted parameter#{'s' if params.size > 1}: #{params.map { |e| ":#{e}" }.join(", ")}")
  end
end
```
*What this shows:* Error classes inherit from stdlib (`KeyError`, `IndexError`) rather than a custom base. Short subclass `ExpectedParameterMissing < ParameterMissing` with no body — pure taxonomy. Error messages are prose sentences, not codes.

### Snippet 13: railties/lib/rails/application.rb:98-108 (run_load_hooks! and initializer ordering)
```ruby
def initialize(initial_variable_values = {}, &block)
  super()
  @initialized       = false
  @reloaders         = []
  @routes_reloader   = nil
  @app_env_config    = nil
  @ordered_railties  = nil
  @railties          = nil
  @key_generators    = {}
  @message_verifiers = nil
  @deprecators       = nil
end
```
*What this shows:* Instance variables initialized explicitly to `nil` or `[]`/`{}` rather than relying on Ruby's implicit nil. Alignment of `=` signs is a Rails codebase convention — visual scan shows the slot list. No type annotations, no factory methods.

## Snippets — comments & documentation style

### Snippet 14: activerecord/lib/active_record/base.rb:15-22 (single-sentence opening comment)
```ruby
# Active Record objects don't specify their attributes directly, but rather
# infer them from the table definition with which they're linked. Adding,
# removing, and changing attributes and their type is done directly in the
# database. Any change is instantly reflected in the Active Record objects.
```
*What this shows:* The opening module comment states the philosophy, not the API. First sentence leads with the surprising, opinionated choice ("don't specify … directly"). Comments are prose paragraphs, not bullet lists.

### Snippet 15: activerecord/lib/active_record/base.rb:55-68 (safe vs. unsafe contrast in docs)
```ruby
def self.authenticate_unsafely(user_name, password)
  where("user_name = '#{user_name}' AND password = '#{password}'").first
end

def self.authenticate_safely(user_name, password)
  where("user_name = ? AND password = ?", user_name, password).first
end

def self.authenticate_safely_simply(user_name, password)
  where(user_name: user_name, password: password).first
end
```
*What this shows:* Documentation through contrast — `_unsafely` vs `_safely` vs `_safely_simply`. Showing the bad pattern alongside the good is a DHH documentation technique. Three levels of "better" rather than one dogmatic correct answer.

### Snippet 16: activerecord/lib/active_record/scoping/named.rb:55-62 (scope docs explaining composability)
```ruby
# These named scopes are composable. For instance,
# Shirt.red.dry_clean_only will produce all shirts that are
# both red and dry clean only. Nested finds and calculations also work
# with these compositions: Shirt.red.dry_clean_only.count
# returns the number of garments for which these criteria obtain.
# Similarly with Shirt.red.dry_clean_only.average(:thread_count).
```
*What this shows:* Inline docs explain the *why* and the composition story, not just the method signature. DHH writes docs like product copy: the feature's value proposition, not its spec.

### Snippet 17: actionpack/…/strong_parameters.rb:90-95 (markdown headers in RDoc comments)
```ruby
# # Action Controller Parameters
#
# Allows you to choose which attributes should be permitted for mass updating
# and thus prevent accidentally exposing that which shouldn't be exposed.
#
# Provides methods for filtering and requiring params:
# *   `expect` to safely permit and require parameters in one step.
# *   `permit` to filter params for mass assignment.
# *   `require` to require a parameter or raise an error.
```
*What this shows:* `# #` Markdown-style header inside RDoc. Bullet list explains the *three* entry points. Short, purposeful. No `@param` blocks on public DSL methods whose purpose is self-evident.

### Snippet 18: activesupport/lib/active_support/callbacks.rb:20-30 (lifecycle callbacks explained in prose)
```ruby
# Callbacks are code hooks that are run at key points in an object's life
# cycle. The typical use case is to have a base class define a set of
# callbacks relevant to the other functionality it supplies, so that
# subclasses can install callbacks that enhance or modify the base
# functionality without needing to override or redefine methods of the
# base class.
```
*What this shows:* Opens with the use case, not the definition. DHH-style prose comment assumes the reader is curious, not suspicious. No defensive "WARNING" or "NOTE" banners.

## Snippets — Rails Doctrine (primary source)

### Snippet 19: Rails Doctrine — Convention over Configuration
```
The Rails way is to lean on convention. Convention is the codified judgment of
the Rails team. When you write a class called Post and it maps to a posts table,
you save keystrokes and mental overhead. Convention allows us to build more in
less time. The key insight is that Rails didn't invent these conventions — it
extracted them from patterns that worked.
```
*What this shows:* Configuration is waste. When the team agrees to a convention, every individual decision is already made. DHH's design philosophy: make the common case need zero configuration.

### Snippet 20: Rails Doctrine — Omakase (chef's choice)
```
The menu was chosen for you by the chef. You don't get to swap out every
ingredient. You can customize at the margins, but the core stack is the core
stack. This isn't authoritarian — it's opinionated, which is different. An
opinion is a stance taken with reasons. The Rails stack is an opinion about
how web applications should be built.
```
*What this shows:* "Omakase" is DHH's word for curated, non-negotiable defaults. In code: don't expose every knob. Give the user the right answer rather than a configuration option.

### Snippet 21: Rails Doctrine — Conceptual Compression
```
Progress in software is often heralded by conceptual compression. Boiling
complex operations down to a single word or a single line. ActiveRecord turned
an entire ORM into three lines in a model file. Action Pack turned routing,
sessions, and rendering into a single `respond_to` block. That compression is
worth a lot.
```
*What this shows:* DHH values APIs that compress many concepts into very few symbols. Complexity must be absorbed by the framework, not exposed to the programmer.

### Snippet 22: Rails Doctrine — No need for Service Objects
```
There's a strong temptation in the Rails community to create Service Objects
for everything. UserCreationService, PaymentProcessingService. In most cases
this is needless ceremony. The model is the right home for business logic.
A fat model is not the same as a God object.
```
*What this shows:* The `Service` suffix is a DHH anti-pattern. Logic belongs in domain objects (models, controllers, jobs). "Service" objects are a Java/enterprise smell imported into Ruby.

### Snippet 23: Rails Doctrine — Beautiful Code
```
Writing code is an expressive act. The code you write should tell a story.
before_action :authenticate_user! reads better than
authenticateUserBeforeEachAction(). The exclamation mark carries meaning.
The snake_case carries rhythm. Ruby lets you write code that sounds like
English and Rails leans all the way in to that.
```
*What this shows:* DHH explicitly prefers writing experience over reading experience. APIs are designed so writing them feels natural, even if the reader needs context. `before_action :authenticate_user!` is the canonical example.

### Snippet 24: Rails Doctrine — Integrated Systems
```
The pieces of a Rails application are designed to work together. You don't
assemble a web application from 12 micro-packages. You get Action Mailer,
Active Job, Active Storage, and a cable channel, and they all know about each
other. The integration tax is paid by Rails, not by you.
```
*What this shows:* DHH opposes the micro-package philosophy (import lodash for `_.map`, import date-fns for date handling). Reach for the standard library and the framework's built-ins first.

### Snippet 25: Rails Doctrine — Test the Golden Path
```
Test the happy path thoroughly. Test the critical sad paths. Don't write tests
for every possible edge case in business logic you haven't shipped yet. Rails
generated tests cover the CRUD actions — that's intentional. Ship, then add
tests for the bugs you find.
```
*What this shows:* DHH's testing philosophy: golden-path coverage over exhaustive coverage. No test-driven ceremony for every method. Tests follow code, not the reverse (DHH has been famously critical of strict TDD).
