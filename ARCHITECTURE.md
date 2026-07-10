# 🏗️ Architecture Documentation

## Overview

This document explains the key architectural decisions and patterns used in the raco-backend e-commerce system, designed as a production-quality take-home assessment.

## Design Principles

### 1. Domain-Driven Design (DDD)

The system follows DDD principles with explicit domain classes that wrap Prisma operations:

```typescript
// ❌ Bad: Passing Prisma models directly
@Post()
async createOrder(createOrderDto: CreateOrderDto) {
  return await prisma.order.create({ data: createOrderDto });
}

// ✅ Good: Using domain classes
@Post()
async createOrder(createOrderDto: CreateOrderDto) {
  const order = this.orderDomain.create(createOrderDto);
  order.addItem(createOrderDto.items);
  order.calculateTotal();
  return await this.orderRepository.save(order);
}
```

### 2. Strategy Pattern for Payments

The payment system uses the Strategy pattern to avoid coupling to specific providers:

```typescript
// PaymentProviderStrategy interface
interface PaymentProviderStrategy {
  createPayment(order: Order): Promise<ProviderPaymentHandle>;
  confirmPayment(handle: ProviderPaymentHandle): Promise<PaymentResult>;
  queryPayment(transactionId: string): Promise<PaymentResult>;
  verifyWebhook(rawBody: Buffer, signature: string): WebhookEvent;
}

// Concrete implementations
class StripeStrategy implements PaymentProviderStrategy { }
class BkashStrategy implements PaymentProviderStrategy { }

// Adding a new provider = one class + registry entry
// No changes needed to OrderService!
```

### 3. Deterministic Business Logic

Order totals are computed deterministically, preventing inconsistencies:

```typescript
// Price snapshot at order time (minor units)
subtotal = price * quantity

// Order total = sum of item subtotals
order.total_amount = sum(item.subtotal)

// Never floating point, always deterministic
// Same inputs → same output, every time
```

### 4. Conditional Updates for Stock Safety

Stock reduction uses conditional updates to prevent overselling:

```sql
-- If stock is insufficient, update affects 0 rows → transaction rollback
UPDATE products 
SET stock = stock - :qty 
WHERE id = :id AND stock >= :qty
```

```typescript
// Only reduce stock after successful payment
await prisma.$transaction(async (tx) => {
  // Mark order as paid
  await tx.order.update({ 
    where: { id }, 
    data: { status: 'PAID' } 
  });
  
  // Conditional stock update
  const result = await tx.product.updateMany({
    where: {
      id: productId,
      stock: { gte: quantity }  // Only if sufficient stock
    },
    data: {
      stock: { decrement: quantity }
    }
  });
  
  // If update failed, rollback
  if (result.count === 0) {
    throw new Error('Insufficient stock');
  }
});
```

### 5. Redis Caching with DFS Traversal

Category recommendations use DFS traversal cached in Redis:

```typescript
// DFS to find all descendant categories
async getDescendants(categoryId: string): Promise<string[]> {
  // Check cache first
  const cached = await this.redis.get(`category:tree:${categoryId}`);
  if (cached) return cached;
  
  // DFS traversal
  const descendants = [];
  const stack = [categoryId];
  
  while (stack.length > 0) {
    const current = stack.pop();
    const children = await this.findChildren(current);
    descendants.push(...children.map(c => c.id));
    stack.push(...children.map(c => c.id));
  }
  
  // Cache for ~1 hour
  await this.redis.set(`category:tree:${categoryId}`, descendants, 3600);
  
  return descendants;
}
```

## Module Architecture

### Layered Architecture

Each module follows a clean layered architecture:

```
modules/
├── auth/
│   ├── dto/              # Data Transfer Objects (validation)
│   ├── entities/         # Domain entities (business logic)
│   ├── strategies/       # Provider-specific implementations
│   ├── guards/           # Authorization guards
│   ├── decorators/       # Custom decorators
│   ├── services/         # Business logic
│   ├── controllers/      # HTTP endpoints
│   └── modules/          # Module definition
```

### Separation of Concerns

- **Controllers**: Handle HTTP requests/responses only
- **Services**: Contain business logic and domain operations
- **Repositories**: Handle database operations (PrismaService)
- **DTOs**: Validate and transform incoming data
- **Entities**: Represent domain objects with business rules

## Security Architecture

### Authentication Flow

```
1. User registers → Password hashed with bcrypt
2. User logs in → Validate password → Generate JWT + Refresh token
3. Client includes JWT in Authorization header
4. JwtGuard validates token → Attaches user to request
5. @CurrentUser decorator extracts user from request
```

### Authorization

```typescript
// Role-based access control
@Roles('ADMIN')
@Post()
async createProduct(@Body() dto: CreateProductDto) {
  // Only admins can create products
}

// Resource-based access control
@Get('me/orders')
async getMyOrders(@CurrentUser() user: User) {
  // Users can only see their own orders
  return this.orderService.findAllByUser(user.id);
}
```

### Input Validation

```typescript
// Whitelist mode - strip non-whitelisted properties
ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,  // Auto-transform to DTO instances
})

// DTO example
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(0)
  price: number;  // In minor units (cents/poisha)
}
```

## Error Handling Strategy

### Consistent Error Format

All errors follow the same structure:

```typescript
{
  "success": false,
  "message": "Error description",
  "data": null,
  "error": "Additional error details",
  "path": "/api/v1/products",
  "timestamp": "2026-07-10T14:30:00.000Z"
}
```

### Global Exception Filter

```typescript
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Transform all errors into consistent format
    // Log errors appropriately
    // Return proper HTTP status codes
  }
}
```

## Database Design

### Schema Principles

1. **Minor Units for Money**: All monetary values stored as integers (cents/poisha)
2. **Price Snapshots**: OrderItem stores product price at order time
3. **Status Enums**: Limited, controlled state transitions
4. **Unique Constraints**: Email, SKU, transaction IDs enforced at DB level
5. **Indexes**: Strategic indexes on foreign keys and frequently queried fields
6. **Cascade Deletes**: Proper referential integrity (with restrictions where needed)

### Key Relationships

```prisma
User → Order (one-to-many)
Order → OrderItem (one-to-many)
OrderItem → Product (many-to-one)
Order → Payment (one-to-many)
Category → Category (self-relation for hierarchy)
Category → Product (one-to-many)
```

## Caching Strategy

### Cache Invalidation

```typescript
// Invalidate on category changes
async updateCategory(id: string, dto: UpdateCategoryDto) {
  await this.prisma.category.update({ where: { id }, data: dto });
  await this.redis.del(`category:tree:${id}`);
  // Also invalidate parent caches
}

// Invalidate on product changes
async updateProduct(id: string, dto: UpdateProductDto) {
  const product = await this.prisma.product.update({ 
    where: { id }, 
    data: dto 
  });
  await this.redis.delPattern(`category:tree:*`);
}
```

### Cache Keys

- `category:tree:{id}` - Category descendants
- Future: `product:{id}` - Product details
- Future: `user:{id}:orders` - User's orders

## Testing Strategy

### Unit Tests

Test domain classes in isolation:

```typescript
describe('OrderDomain', () => {
  it('should calculate total deterministically', () => {
    const order = new OrderDomain();
    order.addItem({ productId: '1', quantity: 2, price: 1000 });
    order.addItem({ productId: '2', quantity: 1, price: 500 });
    expect(order.totalAmount).toBe(2500);  // (2 * 1000) + (1 * 500)
  });
});
```

### E2E Tests

Test complete flows:

```typescript
describe('Checkout Flow', () => {
  it('should complete full checkout process', async () => {
    // Register → Login → Create Order → Checkout → Webhook
  });
});
```

## Deployment Architecture

### Docker Strategy

```dockerfile
# Multi-stage build
Stage 1 (builder): Install dependencies + build
Stage 2 (production): Copy built artifacts + runtime deps only

# Non-root user for security
USER nestjs

# Health check
HEALTHCHECK --interval=30s
```

### Docker Compose

- **postgres**: Official PostgreSQL 16 Alpine
- **redis**: Official Redis 7 Alpine  
- **api**: Built from Dockerfile, depends on db + redis
- **Networks**: Isolated bridge network
- **Volumes**: Named volumes for data persistence

## Performance Considerations

### Database Optimization

1. **Indexes**: On foreign keys, unique fields, frequently queried columns
2. **Connection Pooling**: Prisma manages connection pool
3. **N+1 Prevention**: Use `include` for eager loading

### Caching Strategy

1. **Redis**: For category trees and frequently accessed data
2. **TTL**: 1 hour for category trees (balanced consistency/performance)
3. **Invalidation**: On data mutations

### API Performance

1. **Compression**: Gzip compression enabled
2. **Pagination**: On list endpoints (products, orders)
3. **Validation**: Early rejection with DTOs

## Scalability Considerations

### Horizontal Scaling

- **Stateless API**: Can scale horizontally
- **Redis**: Shared cache instance
- **PostgreSQL**: Can be read-replica scaled
- **S3**: Distributed object storage

### Future Enhancements

1. **Message Queue**: For async webhook processing
2. **Read Replicas**: For read-heavy operations
3. **CDN**: For static assets and API responses
4. **Rate Limiting**: Per-IP or per-user limits

## Monitoring & Observability

### Logging Strategy

```typescript
// Structured logging with context
this.logger.log(`User ${user.id} created order ${order.id}`);
this.logger.error(`Payment failed: ${error.message}`, error.stack);

// Request ID correlation
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const requestId = request.headers['x-request-id'] || uuid();
    request.requestId = requestId;
    return next.handle();
  }
}
```

### Health Checks

```typescript
@Get('health')
getHealth() {
  return {
    status: 'ok',
    service: 'raco-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}
```

## Development vs Production

### Development

- **Hot reload**: `pnpm run start:dev`
- **Debug mode**: `pnpm run start:debug`
- **Local database**: Docker Compose
- **Verbose logging**: Debug level

### Production

- **Optimized build**: `pnpm run build`
- **Process manager**: PM2 or Docker
- **Environment variables**: Proper secrets management
- **Logging**: Error/warn level only
- **HTTPS**: Behind reverse proxy (nginx)

## Summary

This architecture prioritizes:

1. **Clean Code**: DDD, SOLID principles, explicit patterns
2. **Type Safety**: TypeScript, Prisma, DTOs
3. **Security**: JWT, bcrypt, input validation, authorization
4. **Performance**: Caching, indexing, compression
5. **Maintainability**: Layered architecture, separation of concerns
6. **Testability**: Dependency injection, domain isolation
7. **Scalability**: Stateless design, horizontal scaling ready

The system is designed to be production-quality while demonstrating advanced backend engineering concepts suitable for a senior-level assessment.
