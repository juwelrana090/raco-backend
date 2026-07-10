100% complete API documentation update for raco-backend.
Every endpoint gets a typed @ApiResponse with real schema + example.
Read each file before editing it. Work module by module.

## STEP 1 — Create shared base DTOs

File: src/common/dto/api-response.dto.ts (CREATE NEW)

```typescript
import { ApiProperty } from '@nestjs/swagger';

/** Base wrapper used by every API response */
export class ApiSuccessDto<T = unknown> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;

  @ApiProperty()
  data: T;
}

/** Pagination metadata returned in every paginated list */
export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}
```

---

## STEP 2 — Update auth response DTOs

File: src/modules/auth/dto/auth-response.dto.ts (FULL REWRITE)

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class TokensDto {
  @ApiProperty({
    description: 'Short-lived JWT access token (expires in 15 minutes)',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1dWlkIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6IlVTRVIifQ.signature',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Long-lived JWT refresh token (expires in 7 days)',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1dWlkIn0.signature',
  })
  refreshToken: string;
}

export class AuthDataDto extends TokensDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}

export class AuthResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'User registered successfully' })
  message: string;

  @ApiProperty({ type: AuthDataDto })
  data: AuthDataDto;
}

export class LoginResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Login successful' })
  message: string;

  @ApiProperty({ type: AuthDataDto })
  data: AuthDataDto;
}

export class RefreshDataDto {
  @ApiProperty({
    description: 'New access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'New refresh token (old one is invalidated)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;
}

export class RefreshResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Token refreshed successfully' })
  message: string;

  @ApiProperty({ type: RefreshDataDto })
  data: RefreshDataDto;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Logout successful' })
  message: string;

  @ApiProperty({ example: null, nullable: true })
  data: null;
}

export class ValidateDataDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}

export class ValidateResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Token is valid' })
  message: string;

  @ApiProperty({ type: ValidateDataDto })
  data: ValidateDataDto;
}
```

---

## STEP 3 — Update product response DTOs

File: src/modules/products/dto/product-response.dto.ts (FULL REWRITE)

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CategorySummaryDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Electronics' })
  name: string;
}

export class ProductResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({
    example: 'TSHIRT-RED-L-001',
    description: 'Unique stock-keeping unit',
  })
  sku: string;

  @ApiProperty({ example: 'Red Cotton T-Shirt - Large' })
  name: string;

  @ApiProperty({
    example: 'Comfortable 100% cotton t-shirt',
    required: false,
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    example: 2500,
    description:
      'Price in poisha (minor units). Divide by 100 to get BDT. e.g. 2500 = BDT 25.00',
  })
  price: number;

  @ApiProperty({ example: 100 })
  stock: number;

  @ApiProperty({
    example: 'https://cdn.madrasah.dev/raco/product-image/uuid.jpg',
    required: false,
    nullable: true,
  })
  imageUrl: string | null;

  @ApiProperty({
    example: 1,
    required: false,
    nullable: true,
    description: 'FK to file_manager table',
  })
  fileManagerId: number | null;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  categoryId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class ProductWithCategoryDto extends ProductResponseDto {
  @ApiProperty({ type: CategorySummaryDto, required: false })
  category?: CategorySummaryDto;
}

export class ProductsPaginationDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class ProductsListDataDto {
  @ApiProperty({ type: [ProductWithCategoryDto] })
  products: ProductWithCategoryDto[];

  @ApiProperty({ type: ProductsPaginationDto })
  pagination: ProductsPaginationDto;
}

export class ProductsListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Products retrieved successfully' })
  message: string;

  @ApiProperty({ type: ProductsListDataDto })
  data: ProductsListDataDto;
}

export class RecommendationsDataDto {
  @ApiProperty({ type: [ProductWithCategoryDto] })
  recommendedProducts: ProductWithCategoryDto[];

  @ApiProperty({ example: 5 })
  total: number;
}

export class RecommendationsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Recommended products retrieved successfully' })
  message: string;

  @ApiProperty({ type: RecommendationsDataDto })
  data: RecommendationsDataDto;
}

export class ProductImageDataDto {
  @ApiProperty({
    example: 'https://cdn.madrasah.dev/raco/product-image/uuid.jpg',
  })
  imageUrl: string;
}

export class ProductImageResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Product image uploaded successfully' })
  message: string;

  @ApiProperty({ type: ProductImageDataDto })
  data: ProductImageDataDto;
}
```

---

## STEP 4 — Update category response DTOs

File: src/modules/categories/dto/category-response.dto.ts (FULL REWRITE)

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from '../../products/dto/product-response.dto';

export class CategoryResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Electronics' })
  name: string;

  @ApiProperty({
    example: 'All electronic devices and accessories',
    required: false,
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    example: null,
    required: false,
    nullable: true,
    description: 'Parent category ID. Null for root categories.',
  })
  parentId: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({
    required: false,
    description:
      'Nested subcategories (only present in tree response from GET /categories)',
    type: () => [CategoryResponseDto],
  })
  children?: CategoryResponseDto[];
}

export class CategoryProductsDataDto {
  @ApiProperty({ type: CategoryResponseDto })
  category: CategoryResponseDto;

  @ApiProperty({ type: [ProductResponseDto] })
  products: ProductResponseDto[];

  @ApiProperty({ example: 12 })
  total: number;
}

export class CategoryProductsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Products retrieved successfully' })
  message: string;

  @ApiProperty({ type: CategoryProductsDataDto })
  data: CategoryProductsDataDto;
}
```

---

## STEP 5 — Update order response DTOs

File: src/modules/orders/dto/order-response.dto.ts (FULL REWRITE)

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class OrderItemResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  orderId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  productId: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({
    example: 2500,
    description: 'Price snapshot at time of order in poisha (immutable)',
  })
  price: number;

  @ApiProperty({
    example: 5000,
    description: 'Subtotal = price × quantity in poisha',
  })
  subtotal: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class OrderResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  userId: string;

  @ApiProperty({
    example: 5000,
    description: 'Total amount in poisha. Divide by 100 for BDT display.',
  })
  totalAmount: number;

  @ApiProperty({
    example: 'PENDING',
    enum: ['PENDING', 'PAID', 'CANCELED'],
    description:
      'PENDING → awaiting payment | PAID → payment confirmed | CANCELED → cancelled',
  })
  status: OrderStatus;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items?: OrderItemResponseDto[];

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class OrderWrapperResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Order created successfully' })
  message: string;

  @ApiProperty({ type: OrderResponseDto })
  data: OrderResponseDto;
}

export class OrdersListDataDto {
  @ApiProperty({ type: [OrderResponseDto] })
  items: OrderResponseDto[];

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;
}

export class OrdersListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Orders retrieved successfully' })
  message: string;

  @ApiProperty({ type: OrdersListDataDto })
  data: OrdersListDataDto;
}
```

---

## STEP 6 — Update payment response DTOs

File: src/modules/payments/dto/payment-response.dto.ts (FULL REWRITE)

```typescript
import { PaymentStatus, PaymentProvider } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Payment ID',
  })
  id: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Order ID',
  })
  orderId: string;

  @ApiProperty({ enum: ['STRIPE', 'BKASH'], example: 'STRIPE' })
  provider: PaymentProvider;

  @ApiProperty({
    example: 'pi_3OabcdEFGH1234567',
    required: false,
    nullable: true,
    description:
      'Stripe Payment Intent ID or bKash trxID. Null until payment confirmed.',
  })
  providerTxnId: string | null;

  @ApiProperty({
    example: 5000,
    description: 'Payment amount in poisha (minor units).',
  })
  amount: number;

  @ApiProperty({
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
    example: 'PENDING',
    description:
      'PENDING → awaiting confirmation | SUCCESS → confirmed | FAILED → declined | REFUNDED',
  })
  status: PaymentStatus;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Stripe only. Pass to Stripe.js confirmCardPayment(). Null for bKash.',
    example: 'pi_3Oabcd_secret_XYZ123',
  })
  clientSecret?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'bKash only. Redirect user to this URL to complete payment. Null for Stripe.',
    example:
      'https://sandbox.bka.sh/v1.2.0-beta/checkout/payment/pay?paymentID=TR0011CW1680786038541',
  })
  bkashURL?: string;
}

export class CreatePaymentResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Payment created successfully' })
  message: string;

  @ApiProperty({ type: PaymentResponseDto })
  data: PaymentResponseDto;
}

export class PaymentWrapperResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Payment retrieved successfully' })
  message: string;

  @ApiProperty({ type: PaymentResponseDto })
  data: PaymentResponseDto;
}

export class PaymentsArrayWrapperDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Order payments retrieved successfully' })
  message: string;

  @ApiProperty({ type: [PaymentResponseDto] })
  data: PaymentResponseDto[];
}

export class PaymentsListDataDto {
  @ApiProperty({ type: [PaymentResponseDto] })
  items: PaymentResponseDto[];

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;
}

export class PaymentsListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Payments retrieved successfully' })
  message: string;

  @ApiProperty({ type: PaymentsListDataDto })
  data: PaymentsListDataDto;
}
```

---

## STEP 7 — Update user response DTOs

File: src/modules/users/dto/user-response.dto.ts (ADD at bottom of file)

After the existing UserResponseDto class, ADD:

```typescript
export class UsersListDataDto {
  @ApiProperty({ type: [UserResponseDto] })
  items: UserResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;
}

export class UsersListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Users retrieved successfully' })
  message: string;

  @ApiProperty({ type: UsersListDataDto })
  data: UsersListDataDto;
}

export class UserOrdersResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Orders retrieved successfully' })
  message: string;

  @ApiProperty({
    description: 'Array of orders with items and payments',
    type: [Object],
  })
  data: any[];
}

export class UserPaymentsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Payments retrieved successfully' })
  message: string;

  @ApiProperty({
    description: 'Array of payments with order data',
    type: [Object],
  })
  data: any[];
}
```

---

## STEP 8 — Update app.controller.ts (Health)

Full rewrite of @ApiResponse decorators:

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description:
      'Returns basic service health. Use this to confirm the API is running.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      example: {
        status: 'ok',
        message: 'Raco E-commerce API is running',
        timestamp: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  getHello(): object {
    return {
      status: 'ok',
      message: 'Raco E-commerce API is running',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Detailed health check',
    description: 'Returns service version, uptime and timestamp.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service health details',
    schema: {
      example: {
        status: 'ok',
        service: 'raco-backend',
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00.000Z',
        uptime: 3600.45,
      },
    },
  })
  getHealth(): object {
    return {
      status: 'ok',
      service: 'raco-backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
```

---

## STEP 9 — Update auth.controller.ts — complete ApiResponse overhaul

Add all imports at top, then update every @ApiResponse:

```typescript
import {
  AuthResponseDto,
  LoginResponseDto,
  RefreshResponseDto,
  LogoutResponseDto,
  ValidateResponseDto,
} from './dto/auth-response.dto';

// Register endpoint:
@ApiResponse({
  status: HttpStatus.CREATED,
  description: 'User registered successfully. Returns JWT tokens + user profile.',
  type: AuthResponseDto,
})
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: 'Validation failed — invalid email format, password too short.',
  schema: { example: { statusCode: 400, message: ['Password must be at least 8 characters long'], error: 'Bad Request' } },
})
@ApiResponse({
  status: HttpStatus.CONFLICT,
  description: 'Email is already registered.',
  schema: { example: { statusCode: 409, message: 'User with this email already exists', error: 'Conflict' } },
})

// Login endpoint:
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Login successful. Returns JWT tokens + user profile.',
  type: LoginResponseDto,
})
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: 'Invalid email or password.',
  schema: { example: { statusCode: 401, message: 'Invalid credentials', error: 'Unauthorized' } },
})

// Refresh endpoint:
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Token pair refreshed. Old refresh token is now invalid.',
  type: RefreshResponseDto,
})
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: 'Refresh token is invalid, expired, or already used.',
  schema: { example: { statusCode: 401, message: 'Invalid or expired refresh token', error: 'Unauthorized' } },
})

// Logout endpoint:
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Logout successful. Refresh token is invalidated.',
  type: LogoutResponseDto,
})

// Logout-all endpoint:
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Logged out from all devices. All refresh tokens for this user are invalidated.',
  type: LogoutResponseDto,
})

// Validate endpoint:
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Token is valid. Returns decoded user info.',
  type: ValidateResponseDto,
})
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: 'Token is missing, malformed, or expired.',
  schema: { example: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' } },
})
```

---

## STEP 10 — Update users.controller.ts

Add these imports:

```typescript
import {
  UsersListResponseDto,
  UserOrdersResponseDto,
  UserPaymentsResponseDto,
} from './dto/user-response.dto';
```

Replace every @ApiResponse:

```typescript
// GET /users/me
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Current authenticated user profile (no password field).',
  type: UserResponseDto,
})
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: 'Missing or expired JWT token.',
  schema: { example: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' } },
})

// PUT /users/me
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Profile updated. Returns updated user object.',
  type: UserResponseDto,
})
@ApiResponse({
  status: HttpStatus.CONFLICT,
  description: 'Email is already in use by another account.',
  schema: { example: { statusCode: 409, message: 'Email already in use', error: 'Conflict' } },
})

// GET /users/me/orders
@ApiResponse({
  status: HttpStatus.OK,
  description: "All orders placed by the current user, newest first. Includes items and payments.",
  type: UserOrdersResponseDto,
})

// GET /users/me/payments
@ApiResponse({
  status: HttpStatus.OK,
  description: "All payments made by the current user, newest first. Includes order data.",
  type: UserPaymentsResponseDto,
})

// GET /users (admin)
@ApiResponse({
  status: 200,
  description: 'Paginated list of all users. Admin only.',
  type: UsersListResponseDto,
})
@ApiResponse({
  status: 403,
  description: 'Forbidden — ADMIN role required.',
  schema: { example: { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' } },
})

// GET /users/:id (admin)
@ApiResponse({
  status: 200,
  description: 'User profile by ID. Admin only.',
  type: UserResponseDto,
})
@ApiResponse({
  status: 404,
  description: 'User not found.',
  schema: { example: { statusCode: 404, message: 'User not found', error: 'Not Found' } },
})
```

---

## STEP 11 — Update products.controller.ts

Add these imports:

```typescript
import {
  ProductResponseDto,
  ProductsListResponseDto,
  RecommendationsResponseDto,
  ProductImageResponseDto,
} from './dto/product-response.dto';
```

Replace every @ApiResponse:

```typescript
// GET /products (public)
@ApiOperation({
  summary: 'Get all products with pagination and filtering',
  description: 'Public endpoint. Supports pagination, search by name/SKU/description, filter by category (includes subcategories), and sorting.',
})
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Paginated product list. Category filter uses DFS to include all subcategory products.',
  type: ProductsListResponseDto,
})

// GET /products/:id (public)
@ApiOperation({
  summary: 'Get product by ID',
  description: 'Returns a single product. Public endpoint.',
})
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Product details.',
  type: ProductResponseDto,
})
@ApiResponse({
  status: HttpStatus.NOT_FOUND,
  description: 'No product found with this ID.',
  schema: { example: { statusCode: 404, message: 'Product not found', error: 'Not Found' } },
})

// GET /products/:id/recommendations (public)
@ApiOperation({
  summary: 'Get recommended products',
  description: 'Uses DFS on the category tree to find related in-stock products from the same category hierarchy. Excludes the source product.',
})
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Recommended products sorted by stock (desc), name (asc).',
  type: RecommendationsResponseDto,
})
@ApiResponse({
  status: HttpStatus.NOT_FOUND,
  description: 'Source product not found.',
  schema: { example: { statusCode: 404, message: 'Product not found', error: 'Not Found' } },
})

// POST /products (admin)
@ApiOperation({ summary: 'Create a new product', description: 'Admin only. SKU must be unique.' })
@ApiResponse({
  status: HttpStatus.CREATED,
  description: 'Product created successfully.',
  type: ProductResponseDto,
})
@ApiResponse({
  status: HttpStatus.CONFLICT,
  description: 'A product with this SKU already exists.',
  schema: { example: { statusCode: 409, message: 'Product with this SKU already exists', error: 'Conflict' } },
})
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: 'Validation failed.',
  schema: { example: { statusCode: 400, message: ['Price must be an integer'], error: 'Bad Request' } },
})

// PATCH /products/:id (admin)
@ApiOperation({ summary: 'Update a product', description: 'Admin only. All fields are optional.' })
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Product updated successfully.',
  type: ProductResponseDto,
})
@ApiResponse({
  status: HttpStatus.NOT_FOUND,
  description: 'Product not found.',
  schema: { example: { statusCode: 404, message: 'Product not found', error: 'Not Found' } },
})
@ApiResponse({
  status: HttpStatus.CONFLICT,
  description: 'New SKU conflicts with an existing product.',
  schema: { example: { statusCode: 409, message: 'Product with this SKU already exists', error: 'Conflict' } },
})

// DELETE /products/:id (admin)
@ApiOperation({
  summary: 'Delete a product',
  description: 'Admin only. Fails if the product is referenced in any order items. Delete the S3 image too.',
})
@ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Product deleted. No response body.' })
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: 'Product cannot be deleted — it is referenced in existing orders.',
  schema: { example: { statusCode: 400, message: 'Cannot delete product that is referenced in orders. Consider archiving it instead.', error: 'Bad Request' } },
})

// POST /products/:id/image (admin, multipart)
@ApiOperation({
  summary: 'Upload product image',
  description: 'Admin only. Accepts JPG, JPEG, PNG, WEBP, GIF. Max 5MB. File key must be "image". Replaces existing image if present.',
})
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Image uploaded to DigitalOcean Spaces. CDN URL returned.',
  type: ProductImageResponseDto,
})
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: 'File missing, wrong type, or exceeds 5MB.',
  schema: { example: { statusCode: 400, message: 'File size exceeds maximum allowed size of 5MB', error: 'Bad Request' } },
})

// DELETE /products/:id/image (admin)
@ApiOperation({ summary: 'Delete product image', description: 'Admin only. Removes image from S3 and clears imageUrl on product.' })
@ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Image deleted. No response body.' })
@ApiResponse({
  status: HttpStatus.NOT_FOUND,
  description: 'Product has no image to delete.',
  schema: { example: { statusCode: 404, message: 'Product has no image', error: 'Not Found' } },
})
```

---

## STEP 12 — Update categories.controller.ts

Add imports:

```typescript
import {
  CategoryResponseDto,
  CategoryProductsResponseDto,
} from './dto/category-response.dto';
```

Replace every @ApiResponse:

```typescript
// GET /categories (public)
@ApiOperation({
  summary: 'Get category tree',
  description: 'Public endpoint. Returns all root categories with nested children. Result is cached in Redis (TTL: 1 hour). Use this for navigation menus.',
})
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Nested category tree. Root categories have parentId: null. Children are nested recursively.',
  type: [CategoryResponseDto],
})

// GET /categories/:id (public)
@ApiOperation({ summary: 'Get category by ID', description: 'Public. Returns flat category (no children array).' })
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Flat category details without children.',
  type: CategoryResponseDto,
})
@ApiResponse({
  status: HttpStatus.NOT_FOUND,
  description: 'Category not found.',
  schema: { example: { statusCode: 404, message: 'Category not found', error: 'Not Found' } },
})

// GET /categories/:id/products (public)
@ApiOperation({
  summary: 'Get products in category and all subcategories',
  description: 'Public. Uses DFS traversal to include products from all descendant categories.',
})
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Category info + all products from this category and subcategories.',
  type: CategoryProductsResponseDto,
})
@ApiResponse({
  status: HttpStatus.NOT_FOUND,
  description: 'Category not found.',
  schema: { example: { statusCode: 404, message: 'Category not found', error: 'Not Found' } },
})

// POST /categories (admin)
@ApiOperation({ summary: 'Create a new category', description: 'Admin only. Set parentId to create a subcategory.' })
@ApiResponse({
  status: HttpStatus.CREATED,
  description: 'Category created successfully.',
  type: CategoryResponseDto,
})
@ApiResponse({
  status: HttpStatus.NOT_FOUND,
  description: 'Parent category not found.',
  schema: { example: { statusCode: 404, message: 'Parent category not found', error: 'Not Found' } },
})

// PATCH /categories/:id (admin)
@ApiOperation({ summary: 'Update a category', description: 'Admin only. Cannot set parentId to create a circular reference.' })
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Category updated.',
  type: CategoryResponseDto,
})
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: 'Circular reference detected — cannot make a category its own ancestor.',
  schema: { example: { statusCode: 400, message: 'Circular category reference detected', error: 'Bad Request' } },
})

// DELETE /categories/:id (admin)
@ApiOperation({ summary: 'Delete a category', description: 'Admin only. Fails if category has subcategories or products.' })
@ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Category deleted. No response body.' })
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: 'Category has subcategories or products. Remove them first.',
  schema: { example: { statusCode: 400, message: 'Cannot delete category with subcategories or products', error: 'Bad Request' } },
})
```

---

## STEP 13 — Update orders.controller.ts

Add imports:

```typescript
import {
  OrderWrapperResponseDto,
  OrdersListResponseDto,
} from './dto/order-response.dto';
import { CreatePaymentResponseDto } from '../payments/dto/payment-response.dto';
```

Replace every @ApiResponse:

```typescript
// POST /orders
@ApiOperation({
  summary: 'Create a new order from cart items',
  description: 'Creates a PENDING order with price snapshots. Stock is NOT reduced at this stage — only after successful payment. Call POST /orders/:id/checkout next.',
})
@ApiResponse({
  status: HttpStatus.CREATED,
  description: 'Order created with PENDING status and price-locked items.',
  type: OrderWrapperResponseDto,
})
@ApiResponse({
  status: HttpStatus.NOT_FOUND,
  description: 'One or more product IDs do not exist.',
  schema: { example: { statusCode: 404, message: 'One or more products not found', error: 'Not Found' } },
})
@ApiResponse({
  status: HttpStatus.CONFLICT,
  description: 'Insufficient stock for one or more items.',
  schema: { example: { statusCode: 409, message: 'Insufficient stock for product Red T-Shirt. Available: 2, Requested: 5', error: 'Conflict' } },
})

// GET /orders/:id
@ApiOperation({ summary: 'Get order by ID', description: 'Users can only fetch their own orders. Admins can fetch any order.' })
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Order with items array and payments array.',
  type: OrderWrapperResponseDto,
})
@ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description: 'Order belongs to a different user.',
  schema: { example: { statusCode: 403, message: 'You do not have permission to access this order', error: 'Forbidden' } },
})
@ApiResponse({
  status: HttpStatus.NOT_FOUND,
  description: 'Order not found.',
  schema: { example: { statusCode: 404, message: 'Order not found', error: 'Not Found' } },
})

// GET /orders
@ApiOperation({ summary: "Get current user's orders", description: 'Returns all orders for the authenticated user, newest first.' })
@ApiResponse({
  status: HttpStatus.OK,
  description: "List of current user's orders with items and payments.",
  type: OrdersListResponseDto,
})

// POST /orders/:id/checkout
@ApiOperation({
  summary: 'Initiate payment checkout',
  description: `Creates a payment intent with the chosen provider.
- **STRIPE**: Returns \`clientSecret\`. Pass to \`Stripe.js confirmCardPayment()\` on the frontend.
- **bKash**: Returns \`bkashURL\`. Redirect the user to this URL to complete payment.

After payment, provider calls the webhook/callback endpoint to confirm. Stock is reduced only then.`,
})
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Payment initiated. Provider-specific field returned (clientSecret or bkashURL).',
  type: CreatePaymentResponseDto,
})
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: 'Order is not in PENDING status (already paid or canceled).',
  schema: { example: { statusCode: 400, message: 'Order cannot be checked out. Current status: PAID', error: 'Bad Request' } },
})

// DELETE /orders/:id
@ApiOperation({
  summary: 'Cancel an order',
  description: 'Only PENDING orders can be cancelled. PAID orders require a refund flow (not implemented). No stock is restored (stock was never reduced).',
})
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Order cancelled. Status is now CANCELED.',
  type: OrderWrapperResponseDto,
})
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: 'Order is already PAID or CANCELED.',
  schema: { example: { statusCode: 400, message: 'Order cannot be cancelled. Current status: PAID', error: 'Bad Request' } },
})

// GET /orders/admin/all
@ApiOperation({ summary: 'Get all orders (Admin)', description: 'Admin only. Paginated list of all orders across all users.' })
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Paginated orders list with user info included.',
  type: OrdersListResponseDto,
})
```

---

## STEP 14 — Update payments.controller.ts

Add imports:

```typescript
import {
  CreatePaymentResponseDto,
  PaymentWrapperResponseDto,
  PaymentsArrayWrapperDto,
  PaymentsListResponseDto,
} from '../dto/payment-response.dto';
```

Replace every @ApiResponse:

```typescript
// POST /payments
@ApiOperation({
  summary: 'Create a payment for an order',
  description: `Calls the payment provider strategy to initialize payment.

**STRIPE flow:**
1. Call this endpoint → receive \`clientSecret\`
2. Frontend calls \`stripe.confirmCardPayment(clientSecret)\`
3. Stripe calls \`POST /payments/stripe/webhook\` → stock reduced + order marked PAID

**bKash flow:**
1. Call this endpoint → receive \`bkashURL\`
2. Redirect user to \`bkashURL\`
3. bKash calls \`POST /payments/bkash/callback\` → stock reduced + order marked PAID`,
})
@ApiResponse({
  status: 201,
  description: 'Payment initialized. Use clientSecret (Stripe) or bkashURL (bKash) to complete.',
  type: CreatePaymentResponseDto,
})
@ApiResponse({
  status: 409,
  description: 'A payment for this order+provider combination already exists.',
  schema: { example: { statusCode: 409, message: 'Payment already exists for this order with STRIPE provider', error: 'Conflict' } },
})
@ApiResponse({
  status: 404,
  description: 'Order not found or does not belong to the current user.',
  schema: { example: { statusCode: 404, message: 'Order not found', error: 'Not Found' } },
})

// POST /payments/stripe/webhook
@ApiOperation({
  summary: 'Stripe webhook receiver',
  description: `**Internal — called by Stripe servers only.**

Verifies the \`stripe-signature\` header using HMAC-SHA256. Run:
\`\`\`
stripe listen --forward-to localhost:4000/api/v1/payments/stripe/webhook
\`\`\`

On \`payment_intent.succeeded\`: reduces stock + marks order PAID.
Always returns 200 to prevent Stripe retries.`,
})
@ApiResponse({
  status: 200,
  description: 'Webhook acknowledged. Check server logs for processing result.',
  schema: { example: {} },
})

// POST /payments/bkash/callback
@ApiOperation({
  summary: 'bKash callback receiver',
  description: `**Internal — called by bKash servers only.**

URL must be publicly reachable. Set \`BKASH_CALLBACK_URL\` in .env.
Use ngrok for local testing: \`ngrok http 4000\`

Always returns 200 to prevent bKash retries.`,
})
@ApiResponse({
  status: 200,
  description: 'Callback acknowledged.',
  schema: { example: {} },
})

// GET /payments/:paymentId
@ApiOperation({ summary: 'Get payment by ID', description: 'Returns payment details including status. Poll this to check Stripe payment confirmation.' })
@ApiResponse({
  status: 200,
  description: 'Payment details.',
  type: PaymentWrapperResponseDto,
})
@ApiResponse({
  status: 404,
  description: 'Payment not found.',
  schema: { example: { statusCode: 404, message: 'Payment not found', error: 'Not Found' } },
})

// GET /payments/order/:orderId
@ApiOperation({ summary: 'Get all payments for an order', description: 'Returns all payment attempts for an order. Normally one entry per provider.' })
@ApiResponse({
  status: 200,
  description: 'Array of payment records for the order.',
  type: PaymentsArrayWrapperDto,
})

// GET /payments/admin/all
@ApiOperation({ summary: 'Get all payments (Admin)', description: 'Admin only. Paginated list of all payments with optional provider and status filters.' })
@ApiResponse({
  status: 200,
  description: 'Paginated payment list.',
  type: PaymentsListResponseDto,
})
@ApiResponse({
  status: 403,
  description: 'ADMIN role required.',
  schema: { example: { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' } },
})
```

---

## STEP 15 — Verify

```bash
pnpm dev:watch
```

Open http://localhost:4000/api-docs

Check every section:

- Auth → 6 endpoints, all show request body + typed 200/201/400/401/409 responses
- Users → 6 endpoints, locked icon on all, typed responses
- Products → 8 endpoints, public ones show no lock, all have typed responses
- Categories → 6 endpoints, tree endpoint shows nested CategoryResponseDto
- Orders → 6 endpoints, checkout shows clientSecret/bkashURL in response
- Payments → 6 endpoints, webhook/callback show description of internal use
- Health → 2 endpoints, inline JSON examples

```bash
# TypeScript compile check — must be 0 errors
npx tsc --noEmit
```

After completing: run /r-done
Log to .claude/memory/gotchas.md:

- Every response DTO needs @ApiProperty with example — empty @ApiProperty() breaks Scalar
- Wrapper DTOs { success, message, data } needed per endpoint for typed docs
- @ApiResponse type: accepts a class — Scalar renders it as a schema with example values
- schema: { example: {...} } is for inline responses (errors, health checks, no DTO)
- Circular DTO references need type: () => [CategoryResponseDto] arrow function
