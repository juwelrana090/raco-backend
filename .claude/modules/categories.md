# Categories Module

## Purpose

Category hierarchy management with DFS traversal for product recommendations and Redis caching.

## Architecture

- **Domain Entity**: `Category` class wraps Prisma operations
- **Service Layer**: Business logic with DFS traversal implementation
- **Controller**: RESTful endpoints with tree structure support
- **DTOs**: Validation and API contracts

## Key Features

### 1. Category CRUD

- Create category with optional parent (tree structure)
- Get category tree (nested structure)
- Get category by ID
- Update category (with circular reference prevention)
- Delete category (with children/products validation)

### 2. DFS Traversal

- Implements DFS (not BFS) per assessment requirement §2.2.5
- Caches descendant category IDs in Redis
- Used for product recommendations and category product queries
- Recursive invalidation on hierarchy changes

### 3. Cache Invalidation

- Invalidates cache on category create/update/delete
- Recursively invalidates parent caches
- Pattern-based invalidation for bulk operations

## Authorization

- **Public**: GET endpoints (tree, details, products)
- **Admin only**: POST, PATCH, DELETE endpoints
- Uses `@Roles('ADMIN')` decorator with AdminGuard

## Dependencies

- `PrismaService`: Database operations
- `RedisService`: Caching layer

## API Endpoints

### Public (Read)

- `GET /categories` - Get category tree (nested structure)
- `GET /categories/:id` - Get category details
- `GET /categories/:id/products` - Get products in category + descendants

### Admin (Write)

- `POST /categories` - Create category
- `PATCH /categories/:id` - Update category
- `DELETE /categories/:id` - Delete category

## DFS Traversal Implementation

Core DFS implementation for category tree traversal:

```typescript
async getDescendants(categoryId: string): Promise<string[]> {
  // Check Redis cache first
  const cached = await this.redis.getCategoryTree(categoryId);
  if (cached) return cached;

  // DFS traversal (not BFS per assessment requirement)
  const descendants: string[] = [];
  const visited = new Set<string>();

  const dfs = async (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);

    const children = await this.prisma.category.findMany({
      where: { parentId: id },
      select: { id: true },
    });

    for (const child of children) {
      descendants.push(child.id);
      await dfs(child.id);  // Recursive DFS
    }
  };

  await dfs(categoryId);
  await this.redis.cacheCategoryTree(categoryId, descendants);
  return descendants;
}
```

## Self-Relation Implementation

Uses `parentId` foreign key for tree structure (not closure table):

```prisma
model Category {
  id       String    @id @default(uuid())
  name     String
  parentId String?
  parent   Category? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children Category[] @relation("CategoryHierarchy")
}
```

## Tree Building

Converts flat Prisma results to nested structure:

```typescript
async getTree(): Promise<Category[]> {
  const categories = await this.prisma.category.findMany();
  const categoryMap = new Map<string, Category>();
  const rootCategories: Category[] = [];

  categories.forEach((cat) => {
    categoryMap.set(cat.id, Category.fromPrisma(cat));
  });

  categories.forEach((cat) => {
    const category = categoryMap.get(cat.id)!;
    if (cat.parentId === null) {
      rootCategories.push(category);
    } else {
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(category);
      }
    }
  });

  return rootCategories;
}
```

## Cache Keys

- Category tree: `category:tree:{categoryId}`
- TTL: 3600 seconds (1 hour)

## Validation Rules

- Category name must be unique at same level (siblings)
- Cannot create circular references in hierarchy
- Cannot delete category with subcategories
- Cannot delete category with products
- Cannot set self as parent

## File Structure

```
src/modules/categories/
├── dto/
│   ├── create-category.dto.ts
│   ├── update-category.dto.ts
│   └── category-response.dto.ts
├── entities/
│   └── category.entity.ts
├── categories.controller.ts
├── categories.service.ts
└── categories.module.ts
```

## Changelog

- 2025-07-10: Initial implementation with DFS traversal and Redis caching
