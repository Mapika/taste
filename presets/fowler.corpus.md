# fowler — corpus

Research corpus for the `fowler` taste preset. All snippets are grounded in
Martin Fowler's published writing, public catalog entries, and the refactoring
idioms documented across martinfowler.com/bliki/, martinfowler.com/articles/,
refactoring.com/catalog/, martinfowler.com/eaaCatalog/, and the two editions
of *Refactoring: Improving the Design of Existing Code* (1999, 2018).

## Sources

- https://martinfowler.com/bliki/ (bliki index — running commentary on OO and design)
- https://martinfowler.com/bliki/TwoHardThings.html (naming is hard; ubiquitous language)
- https://martinfowler.com/bliki/FunctionLength.html (short functions and the power of naming)
- https://martinfowler.com/bliki/TellDontAsk.html (avoid query chains; push behavior into objects)
- https://martinfowler.com/bliki/AnemicDomainModel.html (domain objects should have behavior)
- https://martinfowler.com/bliki/FluentInterface.html (intention-revealing method chains)
- https://martinfowler.com/bliki/IntentionRevealingNames.html (names as documentation)
- https://martinfowler.com/bliki/BeckDesignRules.html (passes tests, reveals intention, no duplication, fewest elements)
- https://martinfowler.com/bliki/CommandQuerySeparation.html (methods either change state or return a value, never both)
- https://martinfowler.com/bliki/DomainDrivenDesign.html (ubiquitous language, bounded context)
- https://martinfowler.com/articles/refactoring-document-store.html (step-by-step refactoring walkthrough)
- https://martinfowler.com/articles/injection.html (Dependency Injection / Inversion of Control)
- https://martinfowler.com/articles/practical-test-pyramid.html (test isolation and naming)
- https://refactoring.com/catalog/ (catalog of all refactorings: Extract Method, Rename Variable, etc.)
- https://refactoring.com/catalog/extractFunction.html (Extract Function: most fundamental refactoring)
- https://refactoring.com/catalog/renameVariable.html (Rename Variable: make purpose explicit)
- https://refactoring.com/catalog/replaceConditionalWithPolymorphism.html (Replace Conditional with Polymorphism)
- https://refactoring.com/catalog/introduceParameterObject.html (Introduce Parameter Object)
- https://refactoring.com/catalog/replaceQueryWithParameter.html (Replace Query with Parameter)
- https://martinfowler.com/eaaCatalog/ (Patterns of EAA: Repository, Service Layer, Domain Model, etc.)
- https://martinfowler.com/eaaCatalog/repository.html (Repository pattern)
- https://martinfowler.com/eaaCatalog/serviceLayer.html (Service Layer pattern)
- https://martinfowler.com/eaaCatalog/domainModel.html (Domain Model pattern)

## Snippets — naming & intention revelation

### Snippet 1: Extract Function — before (Refactoring catalog, extractFunction)
```java
// BEFORE: what does this block do? The reader must parse every line.
void printOwing(Order order) {
    double outstanding = 0;
    System.out.println("***********************");
    System.out.println("**** Customer Owes ****");
    System.out.println("***********************");
    for (OrderLine line : order.getOrderLines()) {
        outstanding += line.getAmount();
    }
    System.out.println("name: " + order.getCustomer().getName());
    System.out.println("amount: " + outstanding);
}
```
*What this shows:* A long method mixing banner printing, total calculation, and output — three jobs in one function. Reader must reverse-engineer intent from mechanics.

### Snippet 2: Extract Function — after (Refactoring catalog, extractFunction)
```java
// AFTER: each extracted method names what it does; reader never enters a method
// they don't care about.
void printOwing(Order order) {
    printBanner();
    double outstanding = calculateOutstanding(order);
    printDetails(order, outstanding);
}

void printBanner() {
    System.out.println("***********************");
    System.out.println("**** Customer Owes ****");
    System.out.println("***********************");
}

double calculateOutstanding(Order order) {
    double result = 0;
    for (OrderLine line : order.getOrderLines()) {
        result += line.getAmount();
    }
    return result;
}

void printDetails(Order order, double outstanding) {
    System.out.println("name: " + order.getCustomer().getName());
    System.out.println("amount: " + outstanding);
}
```
*What this shows:* Three extracted functions, each 3–5 lines, each named for WHAT it does. `printOwing` is now a table of contents. The name does all explaining — no comments needed.

### Snippet 3: Intention-Revealing Names — rename (bliki/IntentionRevealingNames, Refactoring §6)
```java
// BEFORE: d is a temporal coincidence, not a declaration of intent
int d; // elapsed time in days

// AFTER: the name IS the comment
int elapsedTimeInDays;
int daysSinceCreation;
int daysSinceModification;
int fileAgeInDays;
```
*What this shows:* Abbreviations force the reader to hold a mental mapping. Long names pay off at every read site. The renamed variable needs no comment.

### Snippet 4: Ubiquitous Language — domain name alignment (bliki/DomainDrivenDesign)
```java
// BAD: technical name leaks into domain
class InvoiceRecord {
    double calcTtl() { ... }
    boolean chkDue() { ... }
}

// GOOD: matches the language a domain expert would use
class Invoice {
    Money calculateTotalIncludingTax() { ... }
    boolean isOverdue() { ... }
}
```
*What this shows:* Class and method names should come from the business domain. `calculateTotalIncludingTax` is a domain phrase; `calcTtl` is a programmer shortcut that disconnects code from requirements.

### Snippet 5: Introduce Parameter Object (refactoring.com/catalog/introduceParameterObject)
```java
// BEFORE: a cluster of related parameters traveling together
double calculateCharge(Date startDate, Date endDate, int numberOfNights) { ... }
void applyDiscount(Date startDate, Date endDate, int numberOfNights, Customer customer) { ... }

// AFTER: Parameter Object groups them under a meaningful name
class DateRange {
    private final Date startDate;
    private final Date endDate;

    DateRange(Date startDate, Date endDate) {
        this.startDate = startDate;
        this.endDate = endDate;
    }

    boolean includes(Date date) { ... }
    int lengthInDays() { ... }
}

double calculateCharge(DateRange period, int numberOfNights) { ... }
```
*What this shows:* Three co-traveling parameters become a named concept. `DateRange` can now carry its own behavior (`includes`, `lengthInDays`) — the Anemic Domain Model anti-pattern defeated.

## Snippets — patterns by name

### Snippet 6: Replace Conditional with Polymorphism — Strategy pattern (refactoring.com/catalog/replaceConditionalWithPolymorphism)
```java
// BEFORE: switch on type — must be updated whenever a new type is added
double calculateRentalCharge(Movie movie, int daysRented) {
    switch (movie.getPriceCode()) {
        case Movie.REGULAR:
            return daysRented > 2 ? 1.5 + (daysRented - 2) * 1.5 : 1.5;
        case Movie.NEW_RELEASE:
            return daysRented * 3.0;
        case Movie.CHILDREN:
            return daysRented > 3 ? 1.5 + (daysRented - 3) * 1.5 : 1.5;
    }
    throw new IllegalStateException("Unknown price code");
}

// AFTER: each type encapsulates its own pricing; open/closed principle satisfied
interface PricingStrategy {
    Money calculateCharge(int daysRented);
}

class RegularPricingStrategy implements PricingStrategy {
    public Money calculateCharge(int daysRented) {
        return daysRented > 2
            ? Money.of(1.5 + (daysRented - 2) * 1.5)
            : Money.of(1.5);
    }
}

class NewReleasePricingStrategy implements PricingStrategy {
    public Money calculateCharge(int daysRented) {
        return Money.of(daysRented * 3.0);
    }
}
```
*What this shows:* The refactoring replaces a `switch`-on-type with a Strategy interface plus concrete implementations. Adding a price code now means adding a class, not editing a conditional. Factory creates the right strategy.

### Snippet 7: Repository pattern (eaaCatalog/repository)
```java
// Repository: mediates between domain and data mapping layers
// using a collection-like interface for accessing domain objects.
interface OrderRepository {
    Order findById(OrderId id);
    List<Order> findByCustomer(CustomerId customerId);
    List<Order> findOverdueOrders(LocalDate asOf);
    void save(Order order);
    void remove(Order order);
}

class SqlOrderRepository implements OrderRepository {
    private final DataSource dataSource;

    SqlOrderRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public Order findById(OrderId id) {
        // SQL + mapping — domain layer never sees JDBC
        ...
    }
}
```
*What this shows:* Repository presents a collection-like interface; domain code never imports JDBC or ORM details. The interface is named for the domain concept (`OrderRepository`), not the technology (`JdbcOrderDao`). Constructor injection for testability.

### Snippet 8: Service Layer pattern (eaaCatalog/serviceLayer)
```java
// Service Layer: defines an application's boundary with a layer of services
// that establishes a set of available operations.
class OrderFulfillmentService {
    private final OrderRepository orderRepository;
    private final InventoryService inventoryService;
    private final PaymentGateway paymentGateway;

    OrderFulfillmentService(
            OrderRepository orderRepository,
            InventoryService inventoryService,
            PaymentGateway paymentGateway) {
        this.orderRepository = orderRepository;
        this.inventoryService = inventoryService;
        this.paymentGateway = paymentGateway;
    }

    void fulfillOrder(OrderId orderId) {
        Order order = orderRepository.findById(orderId);
        reserveInventoryForOrder(order);
        chargeCustomerForOrder(order);
        markOrderAsFulfilled(order);
        orderRepository.save(order);
    }

    private void reserveInventoryForOrder(Order order) { ... }
    private void chargeCustomerForOrder(Order order) { ... }
    private void markOrderAsFulfilled(Order order) { ... }
}
```
*What this shows:* Service Layer methods map to use cases. Private methods extracted with intention-revealing names; the public `fulfillOrder` method reads like a business process, not an algorithm.

### Snippet 9: Factory Method — object creation with a named intent (GoF via Fowler)
```java
// BEFORE: caller must know the concrete class; violates DIP
PricingStrategy strategy = new RegularPricingStrategy();

// AFTER: Factory encapsulates construction; caller names intent
class PricingStrategyFactory {
    static PricingStrategy forMovieType(MovieType type) {
        switch (type) {
            case REGULAR:     return new RegularPricingStrategy();
            case NEW_RELEASE: return new NewReleasePricingStrategy();
            case CHILDREN:    return new ChildrenPricingStrategy();
        }
        throw new IllegalArgumentException("Unknown movie type: " + type);
    }
}

// Caller:
PricingStrategy strategy = PricingStrategyFactory.forMovieType(movie.getType());
```
*What this shows:* Factory method `forMovieType` reads like domain language, not construction. The `switch` is isolated to one place. Extending means adding a case + a class — not scattering `new` calls.

### Snippet 10: Dependency Injection — constructor injection (articles/injection)
```java
// BEFORE: MovieLister creates its own finder — untestable, tightly coupled
class MovieLister {
    private MovieFinder finder = new ColonDelimitedMovieFinder("movies.txt");

    List<Movie> moviesDirectedBy(String director) {
        return finder.findAll().stream()
            .filter(m -> m.getDirector().equals(director))
            .collect(toList());
    }
}

// AFTER: dependency injected through constructor — testable, decoupled
class MovieLister {
    private final MovieFinder finder;

    MovieLister(MovieFinder finder) {
        this.finder = finder;
    }

    List<Movie> moviesDirectedBy(String director) {
        return finder.findAll().stream()
            .filter(m -> m.getDirector().equals(director))
            .collect(toList());
    }
}
```
*What this shows:* Constructor injection makes the dependency explicit and swappable. Field is `final` — assigned once, enforces immutability. `MovieFinder` is an interface; callers control the implementation.

## Snippets — Tell, Don't Ask

### Snippet 11: Tell, Don't Ask — push behavior into the object (bliki/TellDontAsk)
```java
// BAD: caller interrogates internal state then decides — the object is passive
if (alarm.getSeverity() == Alarm.HIGH && alarm.getOwner() == null) {
    alarm.setStatus(Alarm.UNOWNED_CRITICAL);
    notificationService.sendCriticalAlert(alarm);
}

// GOOD: tell the alarm what happened; it knows what to do
alarm.markAsUnownedCritical();
// Alarm.markAsUnownedCritical() internally:
//   this.status = Status.UNOWNED_CRITICAL;
//   if (this.severity == Severity.HIGH) owner.notifyAllHandlers(this);
```
*What this shows:* "Tell, don't ask" moves the decision into the object that owns the state. The caller stops being a puppeteer of getters and setters. This is OO's core discipline — behavior lives with data.

### Snippet 12: Anemic Domain Model anti-pattern (bliki/AnemicDomainModel)
```java
// ANTI-PATTERN: anemic — Customer is just a data bag; all logic in service
class Customer {
    private String name;
    private List<Order> orders;
    public String getName() { return name; }
    public List<Order> getOrders() { return orders; }
    public void setOrders(List<Order> orders) { this.orders = orders; }
}

class CustomerService {
    Money calculateLifetimeValue(Customer customer) {
        return customer.getOrders().stream()
            .map(Order::getTotal)
            .reduce(Money.ZERO, Money::add);
    }
}

// FOWLER PREFERRED: domain object owns its behavior
class Customer {
    private final String name;
    private final List<Order> orders;

    Customer(String name, List<Order> orders) {
        this.name = name;
        this.orders = Collections.unmodifiableList(orders);
    }

    Money calculateLifetimeValue() {
        return orders.stream()
            .map(Order::calculateTotal)
            .reduce(Money.ZERO, Money::add);
    }
}
```
*What this shows:* The Anemic Domain Model is a Fowler anti-pattern. Domain objects must own their behavior — data without behavior is not OO, it is a record type with extra syntax.

### Snippet 13: Command-Query Separation (bliki/CommandQuerySeparation)
```java
// VIOLATION: pop() both returns a value AND modifies state
T pop() {
    T value = stack.peek();
    stack.remove(stack.size() - 1);
    return value;
}

// CQS-COMPLIANT: two separate methods with clear names
T peek() {           // query: returns value, no side effect
    return stack.get(stack.size() - 1);
}

void removeTop() {   // command: mutates state, returns void
    stack.remove(stack.size() - 1);
}
```
*What this shows:* CQS says methods should either change state OR return a value, never both (with narrow exceptions like `pop` in classic stacks). Separation makes reasoning about sequences of calls far simpler.

## Snippets — small methods & decomposition

### Snippet 14: FunctionLength — short methods as navigation (bliki/FunctionLength)
```java
// Fowler's position: the right length for a function is determined
// by the effort to understand it at the call site, not by line count.
// A function named well needs no docstring.

// The key insight: short functions only save pain when names are perfect.
// A 3-line function named "process()" is worse than a 15-line one.

// GOOD: table-of-contents style top-level method
void processOrder(Order order) {
    validateOrder(order);
    calculateOrderPricing(order);
    reserveInventory(order);
    scheduleDelivery(order);
    sendOrderConfirmation(order);
}

// Each delegate is 3-7 lines; no delegate calls another delegate.
// Reading processOrder tells you everything; you only dive when needed.
```
*What this shows:* The top-level method is a prose-like description of the algorithm. The reader chooses which sub-method to read. Short + well-named beats a comment block every time.

### Snippet 15: Replace Temp with Query (Refactoring §7, extractFunction cousin)
```java
// BEFORE: temp variable makes body longer and forces reader to track variable lifetime
double calculateTotal(Order order) {
    double basePrice = order.getQuantity() * order.getItemPrice();
    double discountFactor = basePrice > 1000 ? 0.95 : 0.98;
    return basePrice * discountFactor;
}

// AFTER: each extracted query is named, reusable, testable
double calculateTotal(Order order) {
    return calculateBasePrice(order) * calculateDiscountFactor(order);
}

double calculateBasePrice(Order order) {
    return order.getQuantity() * order.getItemPrice();
}

double calculateDiscountFactor(Order order) {
    return calculateBasePrice(this.order) > 1000 ? 0.95 : 0.98;
}
```
*What this shows:* Temporary variables are refactored into named query methods. The main method shrinks to one expression. Each extracted query can be unit-tested in isolation.

### Snippet 16: Replace Magic Number with Symbolic Constant (Refactoring §8)
```java
// BEFORE: what does 86400 mean? Why 0.05?
double calculateDailyInterest(double principal) {
    return principal * 0.05 / 365;
}

boolean isSessionExpired(long lastActivityTimestamp) {
    return System.currentTimeMillis() - lastActivityTimestamp > 86400000;
}

// AFTER: constants carry meaning at every read site
private static final double ANNUAL_INTEREST_RATE = 0.05;
private static final int DAYS_IN_YEAR = 365;
private static final long SESSION_TIMEOUT_MILLISECONDS = 86_400_000L;

double calculateDailyInterest(double principal) {
    return principal * ANNUAL_INTEREST_RATE / DAYS_IN_YEAR;
}

boolean isSessionExpired(long lastActivityTimestamp) {
    return System.currentTimeMillis() - lastActivityTimestamp > SESSION_TIMEOUT_MILLISECONDS;
}
```
*What this shows:* Magic numbers are the silent enemies of intention-revealing code. Named constants let the reader understand the domain meaning without looking up a formula.

### Snippet 17: Preserve Whole Object (Refactoring §11) — avoid shotgun surgery
```java
// BEFORE: passing multiple properties extracted from an object
int low = room.getDaysTempRange().getLow();
int high = room.getDaysTempRange().getHigh();
plan.withinRange(low, high);

// AFTER: pass the object itself — method signature is stable when TempRange grows
plan.withinRange(room.getDaysTempRange());

// TempRange carries its own semantics:
class TempRange {
    boolean overlaps(TempRange other) { ... }
    boolean includes(int temperature) { ... }
    int spanInDegrees() { ... }
}
```
*What this shows:* Preserve Whole Object avoids decomposing domain concepts into primitives. The callee method gains access to all semantics of the object. Parameter lists shrink; domain concepts stay cohesive.

### Snippet 18: Decompose Conditional (Refactoring §10)
```java
// BEFORE: long conditional hides business logic in boolean operators
if (!date.isBefore(SUMMER_START) && !date.isAfter(SUMMER_END)) {
    charge = quantity * summerRate;
    if (quantity > SUMMER_SERVICE_CHARGE_THRESHOLD) {
        charge += SUMMER_SERVICE_CHARGE;
    }
} else {
    charge = quantity * winterRate + winterServiceCharge;
}

// AFTER: named methods explain WHAT each branch means
if (isSummerDate(date)) {
    charge = calculateSummerCharge(quantity);
} else {
    charge = calculateWinterCharge(quantity);
}

boolean isSummerDate(LocalDate date) {
    return !date.isBefore(SUMMER_START) && !date.isAfter(SUMMER_END);
}

Money calculateSummerCharge(int quantity) {
    Money base = Money.of(quantity * summerRate);
    return quantity > SUMMER_SERVICE_CHARGE_THRESHOLD
        ? base.add(SUMMER_SERVICE_CHARGE)
        : base;
}
```
*What this shows:* Decompose Conditional extracts the condition and each branch into named methods. The original conditional becomes self-documenting. Each piece is individually testable.

## Snippets — structure & separation

### Snippet 19: Separate Domain Model from Data Access (eaaCatalog/domainModel)
```java
// Domain model: pure behavior, no persistence concern
class Order {
    private final OrderId id;
    private final CustomerId customerId;
    private final List<OrderLine> lines;
    private OrderStatus status;

    Money calculateTotal() { ... }
    boolean canBeCancelledBy(Customer customer) { ... }
    void markAsShipped(ShipmentId shipmentId) { ... }
}

// Repository: only thing that knows about SQL
interface OrderRepository {
    Optional<Order> findById(OrderId id);
    void save(Order order);
}

// Service Layer: orchestrates domain + infrastructure
class OrderShippingService {
    void markOrderShipped(OrderId orderId, ShipmentId shipmentId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
        order.markAsShipped(shipmentId);
        orderRepository.save(order);
    }
}
```
*What this shows:* Three-tier separation: domain model holds behavior, Repository abstracts persistence, Service Layer orchestrates. Domain object never imports a DAO. This is the architecture Fowler documents in PoEAA.

### Snippet 20: Fluent Interface / method chain (bliki/FluentInterface)
```java
// Fowler coined "fluent interface" — method chains that read like a sentence
MorphBuilder morph = new MorphBuilder()
    .withTarget(Target.LION)
    .withDuration(Duration.ofSeconds(10))
    .withEasingFunction(Easing.EASE_IN_OUT)
    .build();

// Compared to the setter-heavy alternative:
MorphBuilder morph = new MorphBuilder();
morph.setTarget(Target.LION);
morph.setDuration(Duration.ofSeconds(10));
morph.setEasingFunction(Easing.EASE_IN_OUT);
Morph result = morph.build();
```
*What this shows:* Fluent interfaces reveal intent through chaining. Each method name adds a clause to the sentence. The `build()` terminus makes the creation act explicit. Parameter names double as documentation.

### Snippet 21: Avoid Abbreviations — naming discipline (bliki/TwoHardThings, Refactoring §6)
```java
// BAD: abbreviated names require a Rosetta Stone
int calc(int qty, double up, double taxPct) {
    double sub = qty * up;
    double disc = sub > 100 ? sub * 0.1 : 0;
    return (int)((sub - disc) * (1 + taxPct));
}

// GOOD: every name reveals its purpose at a glance
int calculateFinalPriceIncludingTax(int quantity, double unitPrice, double taxRate) {
    double subtotal = quantity * unitPrice;
    double discount = calculateVolumeDiscount(subtotal);
    double preTaxTotal = subtotal - discount;
    return (int)(preTaxTotal * (1 + taxRate));
}

double calculateVolumeDiscount(double subtotal) {
    double VOLUME_DISCOUNT_THRESHOLD = 100.0;
    double VOLUME_DISCOUNT_RATE = 0.1;
    return subtotal > VOLUME_DISCOUNT_THRESHOLD ? subtotal * VOLUME_DISCOUNT_RATE : 0.0;
}
```
*What this shows:* Fowler insists that names should be long enough to be unambiguous. `calculateFinalPriceIncludingTax` is the whole sentence; `calc` is just noise. Extracted `calculateVolumeDiscount` names the business rule.

### Snippet 22: Interface for every exchangeable dependency (articles/injection, GoF)
```java
// Fowler's "Program to an interface, not an implementation"
// Every dependency that has more than one plausible implementation gets an interface.

// Interface names the role, not the technology
interface PaymentGateway {
    PaymentResult charge(CreditCard card, Money amount);
    RefundResult refund(TransactionId transactionId, Money amount);
}

// Multiple implementations; caller never sees the difference
class StripePaymentGateway implements PaymentGateway { ... }
class PayPalPaymentGateway implements PaymentGateway { ... }
class FakePaymentGateway implements PaymentGateway { ... }  // test double

// Factory decides which one to use
class PaymentGatewayFactory {
    static PaymentGateway createForEnvironment(Environment env) {
        if (env.isTest()) return new FakePaymentGateway();
        if (env.isProduction()) return new StripePaymentGateway();
        throw new IllegalStateException("Unknown environment: " + env);
    }
}
```
*What this shows:* Interfaces are named for the role they play in the domain. Three implementations (Stripe, PayPal, Fake) demonstrate that the interface is "earned by real variation." Factory encapsulates the selection logic.
