# dhh

Distilled from the Rails source (`rails/rails`) and DHH's own writing — the Rails Doctrine, his Hey.com blog, and the scaffold templates that ship with every `rails new`. Rails is DHH's most expressive artifact; the framework and the author's taste are inseparable.

## Voice

DHH code is ornate and English-flavored. The writing experience trumps the reading experience: `before_action :authenticate_user!` feels natural to type and reads like a directive even if you need Rails knowledge to parse it cold. Method names are long when length earns clarity (`find_or_create_by`, `has_and_belongs_to_many`, `authenticate_safely_simply`) and short when idiom has settled the question (`Post.all`, `post.save!`, `scope :published`). The exclamation mark and question mark suffixes are load-bearing punctuation — `save!` raises, `valid?` returns boolean — not decorative noise.

Convention over configuration means the file system is the namespace map: `app/models/post.rb` defines `Post`, `app/controllers/posts_controller.rb` defines `PostsController`. No declaration needed; the rails is already there. Conceptual compression is the design goal: `scope :red, -> { where(color: "red") }` replaces an entire query-builder class. ActiveRecord's column inference replaces every `attr_accessor`. `delegate :name, to: :author` replaces three lines of forwarding code. The programmer names the concept; the framework provides the machinery.

Metaprogramming is fine — even praiseworthy — when it reads like English. DSLs are a feature. `has_many :posts, dependent: :destroy` is metaprogramming; it is also the clearest possible statement of domain intent. Service objects, manager classes, and `*Service` suffixes are Java-brain imported into Ruby: they exist to compensate for languages that can't do `before_action`. In Ruby with Rails the model is the right home for business logic. Tests cover the golden path and the critical failure modes; exhaustive branch coverage of unshipped logic is ceremony.

## Examples

- good: `before_action :authenticate_user!, except: %i[ index show ]`
- good: `scope :published, -> { where(published: true).order(created_at: :desc) }`
- good: `has_many :comments, dependent: :destroy`
- good: `Post.where(author: current_user).order(created_at: :desc).limit(10)`
- good: `redirect_to @post, notice: "Post was successfully created."`
- good: `validates :title, presence: true, length: { maximum: 255 }`
- good: `delegate :name, :email, to: :author`
- good: `alias_method :publish!, :save!`
- bad: `class PostCreationService; def self.call(params) ...`
- bad: `UserManager.new(user).authenticate(password)`
- bad: `import _ from 'lodash'; _.map(posts, p => p.title)`
- bad: `private final String userName;`
- bad: `PostController` (PascalCase singular, wrong Rails convention)
- bad: `def getPostById(id) ... end`

## Hard rules

- banned-token: `\bclass\s+\w+Service\b` — "Rails domain logic lives in models, controllers, and jobs — not `*Service` wrappers; see corpus snippet 22 (Rails Doctrine: No Service Objects)"
- file-naming: snake_case — "Rails autoloading maps `PostsController` to `posts_controller.rb`; the file system is the namespace; see corpus snippet 9 (associations builder autoload)"
- banned-token: `^\s*private\s+final\s` — "Java-style `private final` field ceremony is antithetical to Rails expressiveness; Ruby uses `attr_reader` + `freeze` only when needed; see corpus snippet 23 (Rails Doctrine: Beautiful Code)"
- banned-token: `\brequire\s+['"]lodash['"]` — "Reach for Ruby stdlib, ActiveSupport core-ext, or Enumerable instead of utility libraries; see corpus snippet 24 (Rails Doctrine: Integrated Systems)"
- banned-token: `\bbefore_filter\s+:` — "Deprecated Rails 4 alias; the canonical name is `before_action`; using the old name signals unfamiliarity with Rails conventions; see corpus snippet 4 (scaffold controller template uses `before_action`)"
- banned-token: `from\s+['"]lodash['"]` — "ES-module lodash imports are as foreign in a Rails codebase as CommonJS `require`; reach for ActiveSupport or native JavaScript instead; see corpus snippet 24 (Rails Doctrine: Integrated Systems)"
- banned-token: `def\s+[a-z][a-z0-9]*[A-Z][a-zA-Z0-9]*` — "Ruby method names are snake_case; camelCase defs (`getPostById`, `createNewPost`) are Java-brain imported into Ruby and violate every Rails naming convention; see corpus snippet 23 (Rails Doctrine: Beautiful Code)"
- banned-token: `sql\s*\+=` — "Building SQL strings by concatenation (`sql += ' AND ...'`) defeats ActiveRecord's composable, injection-safe query DSL; use `where`, named scopes, and relation chaining instead; see corpus snippet 2 (AR fluent query API) and snippet 3 (named scope DSL)"
- banned-token: `\.nil\?\s*&&` — "Chained `.nil? &&` guards are the long-hand for `present?` / `blank?`; ActiveSupport ships exactly these predicates to compress this ceremony; see corpus snippet 21 (Rails Doctrine: Conceptual Compression)"
- banned-token: `\.find\(self\.\w+_id\)` — "Manually walking foreign-key IDs (`User.find(self.author_id)`) bypasses the `belongs_to` DSL that already infers the association; see corpus snippet 4 (scaffold) and snippet 6 (Concern DSL) for idiomatic association use"
- banned-token: `self\.primary_key\s*=\s*['"]id['"]` — "Explicitly setting `self.primary_key = 'id'` reconfigures the Rails default to itself; configuration over convention; omit it and let Rails infer; see corpus snippet 19 (Rails Doctrine: Convention over Configuration)"
- banned-token: `\.published\s*=\s*true` — "Directly setting `record.published = true` then calling `save!` in a controller action is business logic that belongs in a model bang method (e.g. `post.publish!`); see corpus snippet 8 (save!/valid? lifecycle) and corpus snippet 4 (scaffold action delegates to model)"
- banned-token: `offset\s*=\s*\(page\s*-\s*1\)\s*\*` — "Manually computing `offset = (page - 1) * per_page` is pagination ceremony that should be compressed into a scope or a gem like Pagy/Kaminari; raw offset arithmetic in a controller violates conceptual compression; see corpus snippet 21 (Rails Doctrine: Conceptual Compression)"
- banned-token: `attr_accessor\s+:\w+_id\b` — "Declaring `attr_accessor :author_id` on an ActiveRecord model shadows the column AR infers automatically from the schema; this is the exact anti-pattern snippet 1 warns against ('objects don't specify their attributes directly'); see corpus snippet 1 (class-inferred columns)"
