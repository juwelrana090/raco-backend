# Products Module

## Purpose

Product catalog management with CRUD operations, category-based recommendations using DFS traversal, and Redis caching.

## Architecture

- **Domain Entity**: `Product` class wraps Prisma operations
- **Service Layer**: Business logic with Redis cache integration
- **Controller**: RESTful endpoints with Swagger documentation
- **DTOs**: Validation and API contracts

## Key Features

### 1. Product CRUD

- Create product with unique SKU validation
- List products with pagination, filtering, and sorting
- Get product by ID
- Update product (admin only)
- Delete product (admin only, with order reference check)

### 2. Category-Based Recommendations (DFS Traversal)

- Endpoint: `GET /products/:id/recommendations`
- Uses DFS traversal to find products in descendant categories
- Caches category tree in Redis for performance
- Returns in-stock products sorted by availability

### 3. Cache Invalidation

- Invalidates category cache on product create/update/delete
- Recursively invalidates parent category caches
- Uses Redis pattern matching for bulk invalidation

## Authorization

- **Public**: GET endpoints (list, details, recommendations)
- **Admin only**: POST, PATCH, DELETE endpoints
- Uses `@Roles('ADMIN')` decorator with AdminGuard

## Dependencies

- `PrismaService`: Database operations
- `RedisService`: Caching layer
- `CategoriesService`: Category hierarchy traversal
- `S3Service`: Image upload/delete operations
- `ConfigService`: Environment configuration for file validation

## API Endpoints

### Public (Read)

- `GET /products` - List with pagination/filtering
- `GET /products/:id` - Get product details
- `GET /products/:id/recommendations` - Category-based recommendations

### Admin (Write)

- `POST /products` - Create product
- `PATCH /products/:id` - Update product
- `DELETE /products/:id` - Delete product
- `POST /products/:id/image` - Upload product image (multipart/form-data)
- `DELETE /products/:id/image` - Delete product image

## DFS Traversal Implementation

Uses `CategoriesService.getDescendants()` which implements DFS to traverse the category tree:

```typescript
async getDescendants(categoryId: string): Promise<string[]> {
  // Check Redis cache first
  const cached = await this.redis.getCategoryTree(categoryId);
  if (cached) return cached;

  // DFS traversal
  const descendants: string[] = [];
  const visited = new Set<string>();

  const dfs = async (id: string) => {
    visited.add(id);
    const children = await this.prisma.category.findMany({
      where: { parentId: id },
      select: { id: true },
    });
    for (const child of children) {
      descendants.push(child.id);
      await dfs(child.id);
    }
  };

  await dfs(categoryId);
  await this.redis.cacheCategoryTree(categoryId, descendants);
  return descendants;
}
```

## Cache Keys

- Category tree: `category:tree:{categoryId}`
- TTL: 3600 seconds (1 hour)

## Stock Management

- NOT responsible for stock reduction (handled by order-agent)
- Provides `updateStock()` for manual admin adjustments
- Stock validation on all operations

## Validation Rules

- SKU must be unique (DB constraint + service check)
- Category must exist before product creation
- Product cannot be deleted if referenced in orders
- Stock cannot be negative

## Image Management

- **Storage**: AWS S3 with public-read ACL
- **Max File Size**: 5MB (configurable via `AWS_S3_MAX_FILE_SIZE`)
- **Allowed MIME Types**: image/jpeg, image/png, image/webp, image/gif (configurable via `AWS_S3_ALLOWED_MIME_TYPES`)
- **S3 Key Pattern**: `products/{productId}/{uuid}.{ext}`
- **Delete on Replace**: Old image is automatically deleted when a new image is uploaded
- **Delete on Product Delete**: Image is deleted from S3 when product is deleted
- **Validation**: Double validation in controller (file pipe) and service (size + MIME type)

## Image Upload Process

1. Controller validates file size (max 5MB) and type (jpg, jpeg, png, webp, gif)
2. Service performs additional validation
3. Old image is deleted from S3 if it exists
4. New image is uploaded to S3 with UUID-based filename
5. Product's `imageUrl` field is updated with CDN URL (or S3 URL if no CDN)
6. Errors are logged and handled appropriately

## File Structure

```
src/modules/products/
├── dto/
│   ├── create-product.dto.ts
│   ├── update-product.dto.ts
│   ├── query-product.dto.ts
│   └── product-response.dto.ts
├── entities/
│   └── product.entity.ts
├── products.controller.ts
├── products.service.ts
└── products.module.ts
```

## Changelog

- 2025-07-10: Initial implementation with DFS traversal and Redis caching
- 2025-07-10: Added S3 image upload/delete functionality with admin-only endpoints
