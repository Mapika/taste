# fowler — showcase

Illustrative before/after pairs demonstrating the `fowler` preset in action.
Each pair is a judge input followed by the expected rewrite direction.

---

## 1 · Extract Function + Intention-Revealing Names

**Before** — one long method, no names, three jobs mixed together:

```java
void process(Order o) {
    // validate
    if (o.getItems().isEmpty()) throw new IllegalArgumentException("no items");
    // calc
    double sub = 0;
    for (OrderLine l : o.getLines()) sub += l.getQty() * l.getUp();
    double tax = sub * 0.08;
    o.setTotal(sub + tax);
    // notify
    emailSvc.send(o.getCust().getEmail(), o.getId().toString());
}
```

**After** — table-of-contents top-level method; each step is a named delegate:

```java
void fulfillOrder(Order order) {
    validateOrderIsReadyToFulfill(order);
    calculateAndApplyOrderTotal(order);
    sendOrderConfirmationToCustomer(order);
}

private void validateOrderIsReadyToFulfill(Order order) {
    if (order.getLines().isEmpty()) {
        throw new IllegalArgumentException("Order must have at least one line item");
    }
}

private void calculateAndApplyOrderTotal(Order order) {
    Money subtotal = calculateOrderSubtotal(order);
    Money salesTax = calculateSalesTax(subtotal);
    order.setTotal(subtotal.add(salesTax));
}

private Money calculateOrderSubtotal(Order order) {
    return order.getLines().stream()
        .map(OrderLine::calculateLineTotal)
        .reduce(Money.ZERO, Money::add);
}

private Money calculateSalesTax(Money subtotal) {
    return subtotal.multipliedBy(SALES_TAX_RATE);
}

private void sendOrderConfirmationToCustomer(Order order) {
    emailNotificationService.send(order.getCustomer().getEmailAddress(), order.getId());
}
```

*Voice:* The caller reads business prose. They never need to enter `calculateSalesTax` unless they suspect a tax bug. Names are the documentation.

---

## 2 · Replace Conditional with Polymorphism (Strategy)

**Before** — switch on type code will need editing every time a new type is added:

```java
double getCharge(int priceCode, int daysRented) {
    switch (priceCode) {
        case 0: return daysRented > 2 ? 1.5 + (daysRented - 2) * 1.5 : 1.5;
        case 1: return daysRented * 3.0;
        case 2: return daysRented > 3 ? 1.5 + (daysRented - 3) * 1.5 : 1.5;
        default: throw new RuntimeException("unknown");
    }
}
```

**After** — each price code becomes a class; Factory isolates the switch:

```java
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

class PricingStrategyFactory {
    static PricingStrategy forMovieType(MovieType type) {
        switch (type) {
            case REGULAR:     return new RegularPricingStrategy();
            case NEW_RELEASE: return new NewReleasePricingStrategy();
            case CHILDRENS:   return new ChildrensPricingStrategy();
        }
        throw new IllegalArgumentException("Unknown movie type: " + type);
    }
}
```

*Voice:* Patterns by name. Strategy for type-varying behavior. Factory when three implementations exist. The `switch` is isolated to the factory — domain code never sees it.

---

## 3 · Replace Magic Number with Symbolic Constant

**Before** — literals scatter meaning across the file:

```java
boolean isExpired(long lastActivity) {
    return System.currentTimeMillis() - lastActivity > 86400000;
}

double dailyInterest(double principal) {
    return principal * 0.05 / 365;
}
```

**After** — every number has a domain name:

```java
private static final long SESSION_TIMEOUT_MILLISECONDS = 86_400_000L;
private static final double ANNUAL_INTEREST_RATE = 0.05;
private static final int DAYS_PER_YEAR = 365;

boolean isSessionExpired(long lastActivityTimestamp) {
    long elapsedMilliseconds = System.currentTimeMillis() - lastActivityTimestamp;
    return elapsedMilliseconds > SESSION_TIMEOUT_MILLISECONDS;
}

double calculateDailyInterest(double principal) {
    return principal * ANNUAL_INTEREST_RATE / DAYS_PER_YEAR;
}
```

*Voice:* Magic numbers are the silent enemies of intention-revealing code. `SESSION_TIMEOUT_MILLISECONDS` is the whole sentence; `86400000` forces every reader to do arithmetic.

---

## 4 · Anemic Domain Model → Rich Domain Object

**Before** — Customer is a data bag; all logic exiled to a service:

```java
class Customer {
    private String name;
    private List<Order> orders;
    public List<Order> getOrders() { return orders; }
}

class CustomerService {
    Money calcLtv(Customer c) {
        return c.getOrders().stream().map(Order::getTotal).reduce(Money.ZERO, Money::add);
    }
}
```

**After** — Customer owns its own behavior; service layer is thin:

```java
class Customer {
    private final CustomerName name;
    private final List<Order> orders;

    Customer(CustomerName name, List<Order> orders) {
        this.name = name;
        this.orders = Collections.unmodifiableList(orders);
    }

    Money calculateLifetimeValue() {
        return orders.stream()
            .map(Order::calculateTotal)
            .reduce(Money.ZERO, Money::add);
    }

    boolean isHighValueCustomer() {
        return calculateLifetimeValue().isGreaterThan(HIGH_VALUE_THRESHOLD);
    }
}
```

*Voice:* The Anemic Domain Model is a Fowler anti-pattern. Domain objects must carry behavior. Data without behavior is a record type with extra syntax.

---

## 5 · Introduce Parameter Object

**Before** — date pair travels as primitives through every signature:

```java
boolean isRoomAvailable(String startDate, String endDate, int roomId) { ... }
void bookRoom(String startDate, String endDate, int roomId, String guestId) { ... }
double calculateRoomRate(String startDate, String endDate, RoomType roomType) { ... }
```

**After** — `StayPeriod` groups the concept and can carry its own behavior:

```java
class StayPeriod {
    private final LocalDate checkInDate;
    private final LocalDate checkOutDate;

    StayPeriod(LocalDate checkInDate, LocalDate checkOutDate) {
        if (!checkOutDate.isAfter(checkInDate)) {
            throw new IllegalArgumentException("Check-out must be after check-in");
        }
        this.checkInDate = checkInDate;
        this.checkOutDate = checkOutDate;
    }

    long lengthInNights() {
        return ChronoUnit.DAYS.between(checkInDate, checkOutDate);
    }

    boolean overlaps(StayPeriod other) {
        return checkInDate.isBefore(other.checkOutDate)
            && checkOutDate.isAfter(other.checkInDate);
    }
}

boolean isRoomAvailable(RoomId roomId, StayPeriod requestedPeriod) { ... }
void bookRoom(RoomId roomId, StayPeriod stayPeriod, GuestId guestId) { ... }
Money calculateRoomRate(RoomType roomType, StayPeriod stayPeriod) { ... }
```

*Voice:* Abstractions are earned by real variation, not speculation. `StayPeriod` earns its existence the moment the first overlaps check or length calculation appears. Now the concept is named, testable, and reusable.

---

## 6 · Tell, Don't Ask

**Before** — caller puppets the object's internal state:

```java
void checkAlarmStatus(Alarm alarm) {
    if (alarm.getSeverity() == 2 && alarm.getOwner() == null) {
        alarm.setStatus(3);
        notificationService.sendCriticalAlert(alarm.getId(), alarm.getMessage());
    }
}
```

**After** — caller tells the object what happened; it decides what to do:

```java
// Caller:
alarm.markAsUnownedCritical();

// Alarm:
void markAsUnownedCritical() {
    this.status = AlarmStatus.UNOWNED_CRITICAL;
    if (this.severity == AlarmSeverity.HIGH) {
        notificationDispatcher.notifyAllHandlers(this);
    }
}
```

*Voice:* Tell, don't ask. Push decisions into the object that owns the state. The caller stops being a getter-and-setter puppeteer. This is the core discipline of classical OO.

---

## Hard-rule violations the regex tier catches immediately

| Pattern | Violation | Rule |
|---|---|---|
| `void calc(int qty)` | `calc` is a banned abbreviation | `banned-token: \b(calc|chk|mgr|svc|util|hlpr)\b` |
| `String foo = getName()` | `foo` is a banned placeholder | `banned-token: \bfoo\b|\bbar\b|\bbaz\b` |
| `double temp = subtotal * 0.05` | `temp` hides domain meaning | `banned-token: \btmp\b|\btemp\b(?=\s*[=;,)])` |
| `if (total > 500) { ... }` | `500` is a magic number | `banned-token: (?<![0-9])\b[2-9][0-9]{2,}\b` |

These four rules fire before the LLM judge is ever invoked — zero cost, deterministic, immediate.
