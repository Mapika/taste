# fowler

Distilled from Martin Fowler's published work: *Refactoring: Improving the Design of Existing Code* (1st ed. 1999, 2nd ed. 2018), the bliki (martinfowler.com/bliki/), the Refactoring Catalog (refactoring.com/catalog/), and *Patterns of Enterprise Application Architecture* (2002). Fowler writes about OO languages — primarily Java and, increasingly, JavaScript/TypeScript — but the discipline is language-agnostic.

## Voice

Fowler code is encyclopedic in its names and tiny in its methods. Every function is extracted until it has one job and a name that announces that job without ambiguity: `calculateTotalIncludingTax`, `isOverdue`, `markOrderAsFulfilled`. Abbreviations are a refactoring smell — `calcTtl`, `chkDue`, `qty` belong in a draft, not in production code. Magic numbers beyond `0`, `1`, and `-1` must be replaced with named constants that carry domain meaning (`SESSION_TIMEOUT_MILLISECONDS`, `ANNUAL_INTEREST_RATE`). Single-letter variables, `foo`, `bar`, `baz`, and `tmp` are banned outright: they announce that the author gave up on naming.

Functions are short — typically three to seven lines — because each extracted function is named for WHAT it does rather than HOW. The top-level method becomes a table of contents: `validateOrder`, `calculateOrderPricing`, `reserveInventory`, `scheduleDelivery`. The caller reads the story; they only dive into a chapter if they need it. A long method that mixes levels of abstraction — banner printing alongside database calls alongside business logic — is the canonical Fowler refactoring target.

Patterns are named and applied deliberately: Strategy when behavior varies by type (instead of a `switch`), Repository to hide persistence from the domain, Service Layer to define application operations, Factory when three concrete implementations exist. Interfaces are earned by real variation: an interface with one current and one test implementation is enough. The Anemic Domain Model is the chief anti-pattern — domain objects must carry their own behavior, not expose getters for service classes to puppet. Tell, Don't Ask: push decisions into the object that owns the state rather than interrogating it from outside.

## Examples

- good: `double calculateTotalIncludingTax(int quantity, double unitPrice, double taxRate)`
- good: `boolean isOverdue(LocalDate asOf) { return dueDate.isBefore(asOf); }`
- good: `void fulfillOrder(OrderId id) { validateOrder(id); calculatePricing(id); reserveInventory(id); }`
- good: `interface OrderRepository { Order findById(OrderId id); void save(Order order); }`
- good: `PricingStrategy strategy = PricingStrategyFactory.forMovieType(movie.getType());`
- good: `private static final double ANNUAL_INTEREST_RATE = 0.05;`
- good: `Money calculateLifetimeValue() { return orders.stream().map(Order::calculateTotal).reduce(Money.ZERO, Money::add); }`
- good: `class RegularPricingStrategy implements PricingStrategy { public Money calculateCharge(int daysRented) { ... } }`
- bad: `double calc(int qty, double up, double taxPct) { double sub = qty * up; ... }`
- bad: `int d; // elapsed time in days`
- bad: `if (customer.getOrders().size() > 0 && customer.getStatus() == Customer.ACTIVE) { ... }`
- bad: `double rate = 0.05; // annual rate`
- bad: `String tmp = customer.getName().trim().toLowerCase();`
- bad: `class CustomerService { Money calculateLifetimeValue(Customer c) { return c.getOrders().stream()... } }`

## Hard rules

- banned-token: `\bfoo\b|\bbar\b|\bbaz\b` — "Intention-revealing names are mandatory; placeholder names like foo/bar/baz announce that naming was abandoned; see corpus snippet 3 (rename) and snippet 21 (abbreviation discipline)"
- banned-token: `\btmp\b|\btemp\b(?=\s*[=;,)])` — "Temporary variables must be named for their domain role, not their transience; Extract Function or Replace Temp with Query instead; see corpus snippet 15"
- banned-token: `\b(calc|chk|mgr|svc|util|hlpr)\b` — "Abbreviations obscure intent; spell out the full domain word — calculateTotal not calcTotal, checkOverdue not chkDue; see corpus snippet 4 and snippet 21"
- banned-token: `(?<![0-9])\b[2-9][0-9]{2,}\b(?!\s*[,\]])` — "Magic numbers beyond 0/1/-1 must be named constants that carry domain meaning; see corpus snippet 16 (Replace Magic Number with Symbolic Constant)"
- banned-token: `class\s+\w*Utils\b` — "Utility classes are an anti-pattern: a class named OrderUtils is a grab-bag with no domain concept; move each method into the domain object that owns the data it operates on; see Fowler bliki/AnemicDomainModel and corpus snippet 12"
- banned-token: `switch\s*\(\s*\w+\.get\w+\(\)\s*\)` — "A switch dispatching on a getter's return value is the classic target for Replace Conditional with Polymorphism; each case becomes a Strategy implementation; see corpus snippet 6 (Replace Conditional with Polymorphism)"
- banned-token: `case\s+\d+\s*:` — "Switching on raw integer type-codes is a double violation: magic numbers obscure meaning, and a conditional on type is better replaced by a Strategy interface; see corpus snippet 6 and snippet 16 (Replace Magic Number + Replace Conditional with Polymorphism)"
- banned-token: `void\s+set[A-Z]\w+\s*\(` — "Public setters on domain objects expose raw state mutation and enable the Anemic Domain Model anti-pattern; domain objects should own their own state transitions through meaningful command methods; see corpus snippet 12 (bliki/AnemicDomainModel) and snippet 11 (TellDontAsk)"
- banned-token: `interface\s+I[A-Z]|class\s+\w+Impl\b` — "Hungarian I-prefix interfaces (IOrderRepository) and Impl-suffix classes (OrderRepositoryImpl) are technology noise; Fowler names interfaces for the domain role they play (OrderRepository, PaymentGateway) and names implementations for their mechanism (SqlOrderRepository, StripePaymentGateway); see corpus snippet 7 (eaaCatalog/repository) and snippet 22 (injection)"
- banned-token: `\bDao\b` — "DAO (Data Access Object) is a technology-centric name that leaks persistence concern into domain naming; Fowler uses Repository — a domain-role name that hides the mapping layer behind a collection-like interface; see corpus snippet 7 (eaaCatalog/repository)"
- banned-token: `private\s+final\s+\w+\s+\w+\s*=\s*new\s+\w+\(` — "Field-initialised concrete dependencies (private final Foo x = new ConcreteX(...)) hard-wire construction inside the class and make it untestable; inject dependencies through the constructor so callers control the implementation; see corpus snippet 10 (articles/injection)"
- banned-token: `\w+And(?:Return|Get)[A-Z]\w+\b` — "A method name containing AndReturn or AndGet announces a Command-Query Separation violation: it both mutates state and returns a value; split into a void command and a separate query; see corpus snippet 13 (bliki/CommandQuerySeparation)"
- banned-token: `get\w+\(\)\s*==\s*[0-9]` — "Comparing a getter's result to a raw integer (alarm.getStatus() == 0) violates Tell-Don't-Ask and replaces domain language with magic numbers; push the decision into the owning object as a named command or query method; see corpus snippet 11 (bliki/TellDontAsk) and snippet 16 (Replace Magic Number)"
- banned-token: `\.getLow\(\)|\.getHigh\(\)` — "Extracting Low and High primitives from a range object before passing them separately violates Preserve Whole Object; pass the range object directly so the callee can access its full semantics; see corpus snippet 17 (Refactoring §11, Preserve Whole Object)"
