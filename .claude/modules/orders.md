# Orders Module — raco-backend

> Generated: 2026-07-10 | Status: Production Ready

## Module Overview

Handles complete order lifecycle from creation to payment confirmation with deterministic totals and safe stock reduction.

## Domain Model

### Order Entity

- **Status Machine**: `pending → paid | canceled` (strict transitions only)
- **Ownership**: Each order belongs to exactly one user
- **Deterministic Totals**: `total = sum(item.price * item.quantity)` (integer arithmetic only)
- **State Methods**:
  - `canBePaid()`: true only if status === PENDING
  - `canBeCancelled()`: true only if status === PENDING
  - `markAsPaid()`: throws if not PENDING, returns PAID
  - `markAsCanceled()`: throws if not PENDING, returns CANCELED

### OrderItem Entity

- **Price Snapshots**: Captures product price at order creation time
- **Deterministic Subtotal**: `subtotal = price * quantity` (pure integer arithmetic)
- **Key Methods**:
  - `calculateSubtotal()`: Returns `price * quantity` (minor units)
  - `createForOrder()`: Factory for order creation data

## Critical Algorithms

### Order Totals Computation (§2.2.3)

```typescript
// 1. Snapshot price on each OrderItem at creation time
price = product.price // stored in minor units (cents/poisha)

// 2. Calculate item subtotal (integer arithmetic)
subtotal = price * quantity // never use floating point

// 3. Calculate order total (deterministic sum)
totalAmount = sum(item.subtotal for item in items)
```

**Properties:**

- Pure/deterministic: same inputs → same output every time
- Uses only integer arithmetic (minor units)
- No floating point operations
- Price snapshots prevent retroactive price changes

### Stock Reduction with Conditional Updates (§2.2.3)

**When:** Only after successful payment confirmation (never at order creation)

**Where:** Inside same database transaction that marks order `paid`

**Algorithm:**

```typescript
// 1. For each order item, perform conditional update
UPDATE products
SET stock = stock - :quantity
WHERE id = :productId AND stock >= :quantity

// 2. If update affects 0 rows → insufficient stock
//    Rollback entire transaction, mark payment as FAILED

// 3. If all updates succeed → commit transaction
//    Mark order as PAID, payment as SUCCESS
```

**Why This Works:**

- Prevents overselling from concurrent orders
- Row-level lock + conditional check ensures atomicity
- Transaction is all-or-nothing (no partial stock reduction)
- Only paid orders reduce stock (pending/canceled orders don't)

## API Endpoints

- `POST /orders` - Create order from cart (status: pending, no stock reduction)
- `GET /orders/:id` - Get order details (ownership check enforced)
- `GET /orders` - Get current user's orders (implicit ownership)
- `POST /orders/:id/checkout` - Initiate payment (create payment intent)
- `DELETE /orders/:id` - Cancel order (only if pending)

## Key Features

1. **Deterministic Totals**: Same cart always produces same total
2. **Safe Stock Reduction**: Conditional updates prevent overselling
3. **Price Snapshots**: Orders immune to product price changes
4. **Ownership Enforcement**: Users can only access their own orders
5. **Status Machine**: Strict state transitions, no invalid states
6. **Transaction Safety**: Payment confirmation is atomic

## Security & Validation

- All endpoints require JWT authentication
- Ownership checks in service layer (not just guards)
- Stock availability checked at order creation (read-only)
- Final stock reduction happens only after successful payment
- Validation ensures no negative quantities or prices

## Integration Points

- **PrismaService**: Database operations with transactions
- **@CurrentUser('id')**: Current user context from JWT
- **JwtGuard**: Protects all endpoints
- **TransformInterceptor**: Consistent API response format
- **Payment Module**: Handles webhook callbacks for payment confirmation

## File Structure

```
src/modules/orders/
├── dto/
│   ├── create-order.dto.ts           # Order creation input
│   ├── checkout-order.dto.ts         # Checkout provider selection
│   ├── order-response.dto.ts         # Order API response
│   ├── payment-response.dto.ts       # Payment API response
│   └── index.ts
├── entities/
│   ├── order.entity.ts               # Order domain class with state machine
│   ├── order-item.entity.ts          # OrderItem domain class with totals
│   └── index.ts
├── orders.controller.ts              # HTTP endpoints
├── orders.service.ts                 # Business logic + algorithms
└── orders.module.ts                  # Module definition
```

## Non-Negotiable Rules Compliance

✅ **Deterministic totals**: `subtotal = price * quantity` at order time
✅ **Integer minor units only**: No floating point for money
✅ **Stock reduction after payment**: Never at order creation
✅ **Conditional stock updates**: `WHERE stock >= quantity`
✅ **Status machine**: `pending → paid | canceled` only
✅ **Ownership enforcement**: Users can only read own orders
✅ **Transaction safety**: Payment confirmation is atomic

## Testing Strategy

- Unit tests for Order/OrderItem domain classes
- Integration tests for order creation flow
- Transaction rollback tests for failed payments
- Concurrency tests for stock reduction
- Ownership enforcement tests

## Known Gotchas

- Stock availability check at order creation is read-only (no reduction)
- Payment confirmation must be in transaction with stock updates
- Conditional stock update returns count; 0 means insufficient stock
- Cannot cancel paid orders (would require refund flow)
- Order totals are immutable once created (price snapshots)

## Confidence Level

**HIGH** — Production-ready, fully compliant with non-negotiable rules
