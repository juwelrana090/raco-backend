# 🧪 Testing Guide

This guide covers the testing strategy for the raco-backend e-commerce system.

## Testing Philosophy

**We test behavior, not implementation.**

Focus on testing what the code does from the outside, not how it achieves it internally.

## Test Structure

```
test/
├── unit/              # Unit tests for domain classes
│   ├── users/
│   ├── products/
│   ├── orders/
│   └── payments/
├── e2e/               # End-to-end tests for complete flows
│   ├── auth.e2e-spec.ts
│   ├── orders.e2e-spec.ts
│   └── payments.e2e-spec.ts
└── jest.config.json
```

## Unit Tests

### What to Test

**Domain Classes:**
- Business logic and calculations
- State transitions
- Validation rules
- Edge cases and error conditions

### Example: Order Domain Tests

```typescript
import { OrderDomain } from '@modules/orders/entities/order.entity';

describe('OrderDomain', () => {
  describe('addItem', () => {
    it('should add item to order', () => {
      const order = new OrderDomain();
      order.addItem({
        productId: 'prod-1',
        quantity: 2,
        price: 1000, // 1000 cents = 10.00 BDT
      });
      
      expect(order.items).toHaveLength(1);
      expect(order.items[0].productId).toBe('prod-1');
      expect(order.items[0].quantity).toBe(2);
      expect(order.items[0].price).toBe(1000);
    });
  });

  describe('calculateTotal', () => {
    it('should calculate total deterministically', () => {
      const order = new OrderDomain();
      order.addItem({ productId: '1', quantity: 2, price: 1000 });
      order.addItem({ productId: '2', quantity: 1, price: 500 });
      
      const total = order.calculateTotal();
      
      // (2 * 1000) + (1 * 500) = 2500
      expect(total).toBe(2500);
    });
    
    it('should handle empty order', () => {
      const order = new OrderDomain();
      const total = order.calculateTotal();
      expect(total).toBe(0);
    });
  });

  describe('markPaid', () => {
    it('should transition from pending to paid', () => {
      const order = new OrderDomain();
      expect(order.status).toBe('PENDING');
      
      order.markPaid();
      
      expect(order.status).toBe('PAID');
    });
    
    it('should throw if already paid', () => {
      const order = new OrderDomain();
      order.markPaid();
      
      expect(() => order.markPaid()).toThrow('Order already paid');
    });
  });

  describe('cancel', () => {
    it('should cancel pending order', () => {
      const order = new OrderDomain();
      order.cancel();
      
      expect(order.status).toBe('CANCELED');
    });
    
    it('should not cancel paid order', () => {
      const order = new OrderDomain();
      order.markPaid();
      
      expect(() => order.cancel()).toThrow('Cannot cancel paid order');
    });
  });
});
```

### Example: Product Domain Tests

```typescript
import { ProductDomain } from '@modules/products/entities/product.entity';

describe('ProductDomain', () => {
  describe('reduceStock', () => {
    it('should reduce stock when sufficient', () => {
      const product = new ProductDomain({
        id: '1',
        name: 'Test Product',
        stock: 10,
        price: 1000,
      });
      
      product.reduceStock(3);
      expect(product.stock).toBe(7);
    });
    
    it('should throw when stock insufficient', () => {
      const product = new ProductDomain({
        id: '1',
        name: 'Test Product',
        stock: 2,
        price: 1000,
      });
      
      expect(() => product.reduceStock(5)).toThrow('Insufficient stock');
    });
  });
});
```

## E2E Tests

### What to Test

**Complete User Flows:**
- Authentication flows
- Order creation and checkout
- Payment processing
- Webhook handling

### Example: Auth Flow E2E Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Auth Flow (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  describe('Registration', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test@123',
          name: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.user.email).toBe('test@example.com');
          expect(res.body.data.accessToken).toBeDefined();
          expect(res.body.data.refreshToken).toBeDefined();
        });
    });

    it('should reject duplicate email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test@123',
          name: 'Test User',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toContain('already exists');
        });
    });

    it('should reject weak password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'weak@example.com',
          password: '123',
          name: 'Weak User',
        })
        .expect(400);
    });
  });

  describe('Login', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test@123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          accessToken = res.body.data.accessToken;
          refreshToken = res.body.data.refreshToken;
          expect(accessToken).toBeDefined();
          expect(refreshToken).toBeDefined();
        });
    });

    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Wrong@123',
        })
        .expect(401);
    });
  });

  describe('Protected Routes', () => {
    it('should access protected route with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.email).toBe('test@example.com');
        });
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);
    });

    it('should reject request with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.accessToken).toBeDefined();
          expect(res.body.data.refreshToken).toBeDefined();
        });
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### Example: Order Flow E2E Test

```typescript
describe('Order Flow (e2e)', () => {
  let app: INestApplication;
  let userToken: string;
  let productId: string;

  beforeAll(async () => {
    // Setup app and create test product
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    // Login and get token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@racocommerce.com', password: 'Admin@123' });
    userToken = loginRes.body.data.accessToken;

    // Create test product
    const productRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        sku: 'TEST-001',
        name: 'Test Product',
        price: 1000,
        stock: 10,
        categoryId: 'test-category-id',
      });
    productId = productRes.body.data.id;
  });

  it('should create order from cart', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        items: [
          { productId, quantity: 2 }
        ]
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('PENDING');
    expect(response.body.data.totalAmount).toBe(2000); // 2 * 1000
  });

  it('should reject order with insufficient stock', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        items: [
          { productId, quantity: 100 } // More than available
        ]
      });

    expect(response.status).toBe(400);
  });
});
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:cov

# Run specific test file
pnpm run test -- orders.service.spec.ts
```

### E2E Tests

```bash
# Run all e2e tests
pnpm run test:e2e

# Run specific e2e test
pnpm run test:e2e -- auth.e2e-spec.ts
```

### Coverage Reports

```bash
# Generate coverage report
pnpm run test:cov

# View report
open coverage/index.html
```

Target coverage:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Testing Best Practices

### 1. Test Isolation

Each test should be independent:

```typescript
beforeEach(async () => {
  // Reset database state before each test
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();
});
```

### 2. Use Test Fixtures

Create reusable test data:

```typescript
// test/fixtures/users.ts
export const createTestUser = async (overrides = {}) => {
  return await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: await bcrypt.hash('Test@123', 12),
      name: 'Test User',
      ...overrides,
    },
  });
};
```

### 3. Mock External Services

Don't call real payment gateways in tests:

```typescript
// Mock Stripe
jest.mock('stripe', () => ({
  __esModule: true,
  default: class Stripe {
    paymentIntents = {
      create: jest.fn().mockResolvedValue({ id: 'pi_test' }),
      confirm: jest.fn().mockResolvedValue({ status: 'succeeded' }),
    },
  },
}));
```

### 4. Test Edge Cases

Don't just test happy path:

```typescript
it('should handle empty cart');
it('should handle invalid product ID');
it('should handle negative quantity');
it('should handle concurrent order creation');
it('should handle payment timeout');
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: pnpm install
      - run: pnpm run prisma:generate
      - run: pnpm run test:cov
      - uses: codecov/codecov-action@v3
```

## Test Data Management

### Seed Database for Tests

```typescript
// test/setup.ts
beforeAll(async () => {
  // Run migrations
  await execSync('pnpm run prisma:migrate deploy');
  
  // Seed test data
  await execSync('pnpm run prisma:seed');
});

afterAll(async () => {
  // Clean up test database
  await execSync('pnpm run prisma:migrate reset --force');
});
```

### Use Test Database

```bash
# .env.test
DATABASE_URL="postgresql://test:test@localhost:5432/raco_backend_test"
```

## Debugging Tests

### Run Tests in Debug Mode

```bash
# Unit tests
pnpm run test:debug

# E2E tests
node --inspect-brk -r tsconfig-paths/register -r ts-node/register \
  node_modules/.bin/jest --runInBand --config test/jest-e2e.json
```

### Console Output in Tests

```typescript
it('should show debug info', () => {
  console.log('Current order state:', order);
  // This will show up in test output
});
```

## Performance Testing

### Load Testing with Artillery

```yaml
# load-test.yml
config:
  target: 'http://localhost:4000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: 'Browse Products'
    requests:
      - get:
          url: '/api/v1/products'
```

## Summary

Testing Philosophy:

1. **Test behavior, not implementation**
2. **One test, one assertion** when possible
3. **Test edge cases** and error conditions
4. **Keep tests fast** - use mocks for external services
5. **Keep tests independent** - no shared state
6. **Use descriptive names** - test names should tell you what they test

Good tests give you confidence to refactor. Bad tests just slow you down.
