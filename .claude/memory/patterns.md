# Established Patterns — raco-backend

## Domain Entity Pattern

### When to use

- All database models should have corresponding domain entities
- Wrap Prisma operations in OOP classes

### Example

```typescript
// src/modules/products/entities/product.entity.ts
export class Product implements PrismaProduct {
  id: string;
  sku: string;
  name: string;
  // ... other fields

  constructor(data: PrismaProduct) {
    this.id = data.id;
    this.sku = data.sku;
    // ... map all fields
  }

  static fromPrisma(data: PrismaProduct): Product {
    return new Product(data);
  }

  toJSON() {
    return {/* ... */};
  }

  // Domain logic methods
  isInStock(): boolean {
    return this.stock > 0;
  }
}
```

### Anti-pattern

- Direct Prisma model usage in controllers
- Business logic in controllers

---

## DFS Traversal Pattern

### When to use

- Category tree operations (per assessment requirement §2.2.5)
- Finding all descendants in hierarchical data

### Example

```typescript
async getDescendants(categoryId: string): Promise<string[]> {
  const cached = await this.redis.getCategoryTree(categoryId);
  if (cached) return cached;

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
      await dfs(child.id);
    }
  };

  await dfs(categoryId);
  await this.redis.cacheCategoryTree(categoryId, descendants);
  return descendants;
}
```

### Anti-pattern

- BFS traversal (not compliant with assessment requirements)
- Missing cache invalidation

---

## Cache Invalidation Pattern

### When to use

- Any data change that affects cached queries
- Category/product create/update/delete operations

### Example

```typescript
async invalidateParentCache(categoryId: string): Promise<void> {
  await this.redis.invalidateCategoryCache(categoryId);

  const category = await this.prisma.category.findUnique({
    where: { id: categoryId },
    select: { parentId: true },
  });

  if (category?.parentId) {
    await this.invalidateParentCache(category.parentId);
  }
}
```

### Anti-pattern

- Forgetting to invalidate parent caches
- Missing pattern-based invalidation for bulk operations

---

## Controller Response Pattern

### When to use

- All service methods returning data to controllers

### Example

```typescript
return {
  success: true,
  message: 'Products retrieved successfully',
  data: {
    products: products.map((p) => p.toJSON()),
    pagination: { page, limit, total, totalPages },
  },
};
```

### Anti-pattern

- Inconsistent response formats
- Returning raw Prisma results without transformation

---

## Authorization Pattern

### When to use

- Securing endpoints based on user roles
- Public access for read-only operations

### Example

```typescript
// Public read endpoint
@Get()
@Public()
async findAll() { /* ... */ }

// Admin-only write endpoint
@Post()
@UseGuards(JwtGuard, AdminGuard)
@Roles('ADMIN')
async create(@Body() dto: CreateDto) { /* ... */ }
```

### Anti-pattern

- Forgetting `@Public()` on public endpoints
- Missing role guards on admin operations

---

## Validation Pattern

### When to use

- All DTOs for API endpoints

### Example

```typescript
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsInt()
  @Min(0)
  price: number;

  @IsUUID('4')
  categoryId: string;
}
```

### Anti-pattern

- Missing validation decorators
- Not checking for duplicate resources (SKU, names)

---

## Error Handling Pattern

### When to use

- Service layer validation and business logic errors

### Example

```typescript
// Conflict for duplicate
if (existingProduct) {
  throw new ConflictException('Product with this SKU already exists');
}

// Not found for missing resources
if (!category) {
  throw new NotFoundException('Category not found');
}

// Bad request for business rule violations
if (hasChildren) {
  throw new BadRequestException('Cannot delete category with subcategories');
}
```

### Anti-pattern

- Returning null instead of throwing NotFoundException
- Generic error messages without specific details

---

## Module Import Pattern

### When to use

- Organizing module dependencies

### Example

```typescript
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    CategoriesModule, // Dependency
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
```

### Anti-pattern

- Circular dependencies
- Missing required module imports

---

## Authentication Pattern

### When to use

- User registration and login operations
- JWT token generation and validation
- Password hashing and verification

### Example

```typescript
// User entity with password management
export class User implements PrismaUser {
  password: string;

  static async hashPassword(password: string, saltRounds: number = 12): Promise<string> {
    return bcrypt.hash(password, saltRounds);
  }

  async comparePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.password);
  }
}

// Token generation
async generateTokenPair(user: User): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    this.generateAccessToken(user),
    this.generateRefreshToken(user),
  ]);

  return { accessToken, refreshToken };
}
```

### Anti-pattern

- Storing passwords in plain text
- Returning passwords in API responses
- Using weak hashing algorithms (md5, sha1)

---

## Refresh Token Pattern

### When to use

- Long-lived authentication sessions
- Token rotation for security
- Logout functionality

### Example

```typescript
// Generate and store refresh token
async generateRefreshToken(user: User): Promise<string> {
  const token = await this.jwtService.signAsync(payload, { secret: refreshSecret });

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Store in database for revocation
  await this.prisma.refreshToken.create({
    data: { token, userId: user.id, expiresAt },
  });

  return token;
}

// Verify and cleanup
async verifyRefreshToken(token: string): Promise<User | null> {
  const refreshToken = await this.prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!refreshToken || refreshToken.expiresAt < new Date()) {
    await this.prisma.refreshToken.delete({ where: { token } });
    return null;
  }

  return User.fromPrisma(refreshToken.user);
}
```

### Anti-pattern

- Storing refresh tokens only in JWT without database reference
- Not implementing token revocation
- Missing expiration cleanup

---

## Guard Pattern

### When to use

- Protecting authenticated routes
- Role-based authorization
- Public route exceptions

### Example

```typescript
// JWT Guard with public route support
@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;
    return super.canActivate(context);
  }
}

// Admin Guard for role checking
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>(
      'roles',
      context.getHandler(),
    );
    const user = context.switchToHttp().getRequest().user;

    return requiredRoles.includes(user.role);
  }
}
```

### Anti-pattern

- Forgetting @Public() decorator on public endpoints
- Not checking roles in service layer as second line of defense
- Guards that only check authentication but not authorization

---

## Decorator Pattern

### When to use

- Injecting current user in controllers
- Specifying required roles
- Marking public routes

### Example

```typescript
// Current user decorator
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.user?.[data] : request.user;
  },
);

// Roles decorator
export const Roles = (...roles: Role[]) =>
  SetMetadata('roles', roles);

// Public decorator
export const Public = () =>
  SetMetadata('isPublic', true);

// Usage
@Get('me')
@UseGuards(JwtGuard)
async getProfile(@CurrentUser() user: User) {
  return this.usersService.getProfile(user.id);
}

@Post()
@UseGuards(JwtGuard, AdminGuard)
@Roles(Role.ADMIN)
async createProduct(@Body() dto: CreateProductDto) {
  return this.productsService.create(dto);
}
```

### Anti-pattern

- Hardcoding user IDs instead of using @CurrentUser()
- Missing role decorators on admin endpoints
- Inconsistent guard application
