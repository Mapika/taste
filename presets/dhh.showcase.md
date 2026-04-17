# dhh — showcase

Illustrative before/after pairs that demonstrate the DHH preset in action. Each pair anchors one or more rules from `dhh.md` and at least one corpus snippet.

---

## 1. The Service Object trap

**Before (flagged)**
```ruby
class PostCreationService
  def initialize(params, author)
    @params = params
    @author = author
  end

  def call
    post = Post.new(@params)
    post.author = @author
    post.save!
    NotificationService.new(post).notify_followers!
    post
  end
end
```

**After (passes)**
```ruby
class Post < ApplicationRecord
  belongs_to :author, class_name: 'User'
  has_many   :followers, through: :author

  after_create_commit :notify_followers!

  def notify_followers!
    followers.each { |f| FollowerMailer.new_post(f, self).deliver_later }
  end
end

# In the controller:
@post = current_user.posts.create!(post_params)
redirect_to @post, notice: "Post was successfully created."
```

*Rule triggered:* `banned-token: \bclass\s+\w+Service\b` (corpus snippet 22 — Rails Doctrine: No Service Objects). The model is the right home; callbacks and mailers absorb what a service object would have coordinated.

---

## 2. Ornate query chain vs. raw SQL string

**Before (flagged)**
```ruby
def recent_published_posts_by(author)
  sql  = "SELECT * FROM posts WHERE author_id = #{author.id}"
  sql += " AND published = 1"
  sql += " ORDER BY created_at DESC"
  sql += " LIMIT 10"
  Post.find_by_sql(sql)
end
```

**After (passes)**
```ruby
Post.published
    .by_author(author)
    .order(created_at: :desc)
    .limit(10)

# And in the model:
scope :published,  -> { where(published: true) }
scope :by_author,  ->(user) { where(author: user) }
```

*Rule triggered:* style violation — imperative string concatenation instead of composable scope chain (corpus snippet 3 — named scope DSL). The after version reads like an English sentence: "published posts by this author, newest first, ten of them."

---

## 3. `before_action :authenticate_user!` vs. inline guard

**Before (flagged)**
```ruby
class PostsController < ApplicationController
  def edit
    @post = Post.find(params[:id])
    unless current_user
      redirect_to login_path, alert: "Please log in."
      return
    end
    unless @post.author == current_user
      redirect_to root_path, alert: "Not authorized."
      return
    end
  end
end
```

**After (passes)**
```ruby
class PostsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_post
  before_action :require_author!, only: %i[ edit update destroy ]

  def edit
  end

  private
    def set_post
      @post = Post.find(params.expect(:id))
    end

    def require_author!
      redirect_to root_path, alert: "Not authorized." unless @post.author?(current_user)
    end
end
```

*Rule triggered:* style — inline auth guard duplicates `before_action` machinery (corpus snippet 4 — scaffold controller shape, snippet 23 — Rails Doctrine: Beautiful Code). `before_action :authenticate_user!` reads like a directive; guard clauses inside each action read like paranoia.

---

## 4. lodash imported for utilities that ActiveSupport/Enumerable provides

**Before (flagged)**
```javascript
import { map, filter, sortBy, groupBy, isEmpty } from 'lodash';

const titles     = map(posts, p => p.title);
const published  = filter(posts, p => p.published);
const sorted     = sortBy(posts, 'created_at');
const byCategory = groupBy(posts, 'category');
const blank      = isEmpty(posts);
```

**After (passes — Rails-adjacent JS following integrated-system philosophy)**
```javascript
const titles     = posts.map(p => p.title);
const published  = posts.filter(p => p.published);
const sorted     = posts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
const byCategory = Object.groupBy(posts, p => p.category);
const blank      = posts.length === 0;
```

*Rule triggered:* `banned-token: \brequire\s+['"]lodash['"]` (corpus snippet 24 — Rails Doctrine: Integrated Systems). Reach for the platform's native capabilities before importing a utility belt. In Ruby: Enumerable. In modern JS: native Array methods + Object.groupBy.

---

## 5. Java ceremony vs. Ruby expressiveness

**Before (flagged)**
```java
public class UserAuthenticatorService {
    private final String secretKey;
    private final int timeoutSeconds;

    public UserAuthenticatorService(String secretKey, int timeoutSeconds) {
        this.secretKey    = secretKey;
        this.timeoutSeconds = timeoutSeconds;
    }

    public boolean isAuthenticated(String token) {
        return TokenVerifier.verify(token, secretKey, timeoutSeconds);
    }
}
```

**After (passes — Ruby equivalent)**
```ruby
class User < ApplicationRecord
  has_secure_token :auth_token

  def authenticate_token(token)
    ActiveSupport::SecurityUtils.secure_compare(auth_token, token)
  end
end
```

*Rule triggered:* `banned-token: ^\s*private\s+final\s` + `banned-token: \bclass\s+\w+Service\b` (corpus snippets 22, 23). `private final` fields are Java ceremony; `has_secure_token` compresses the entire token lifecycle into one declaration. `UserAuthenticatorService` should become a method on the `User` model.

---

## 6. Convention over configuration — attribute declaration

**Before (flagged)**
```ruby
class Post < ActiveRecord::Base
  self.table_name  = 'posts'
  self.primary_key = 'id'

  attr_accessor :title
  attr_accessor :body
  attr_accessor :published
  attr_accessor :author_id
  attr_accessor :created_at
  attr_accessor :updated_at
end
```

**After (passes)**
```ruby
class Post < ApplicationRecord
  validates :title, presence: true
  validates :body,  presence: true
end
```

*Rule triggered:* convention violation — `attr_accessor` for database columns (corpus snippet 1 — ActiveRecord base, snippet 19 — Rails Doctrine: Convention over Configuration). Rails infers every column from the schema; declaring them manually adds noise and introduces desync risk.

---

## Voice summary

DHH code reads like a confident letter, not a specification. `before_action :authenticate_user!` is a directive. `Post.published.recent.limit(10)` is a sentence. `publish!` is a command. The exclamation mark means "raise if this fails"; the question mark means "return a boolean"; neither is decorative. Service objects are what you write when your language can't do `before_action` — Ruby can, so skip them. The framework absorbed the ceremony so you don't have to.
