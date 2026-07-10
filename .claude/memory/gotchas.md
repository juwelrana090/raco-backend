# Gotchas

> ⚠️ PROJECT SCOPED: This file lives in .claude/memory/ only.
> Run /r-memory-scan to auto-fill from codebase.

[Gotchas will be added here as they are discovered]

## Template

#### [Module] — [Title]

- **What Happens**:
- **Why**:
- **How to Avoid**:
- **Discovered**:

#### Orders — Stock Reduction Timing

- **What Happens**: If you reduce stock at order creation time, you'll have "phantom inventory" - orders that are created but never paid, yet still lock up stock
- **Why**: Users can create orders without completing payment, causing artificial stockouts
- **How to Avoid**: Only reduce stock inside the transaction that marks the order as `paid`. Never at order creation.
- **Discovered**: 2026-07-10

#### Orders — Overselling from Concurrent Orders

- **What Happens**: Without conditional updates (`WHERE stock >= quantity`), concurrent orders can both read available stock=1, then both try to reduce to 0, resulting in stock=-1 (overselling)
- **Why**: Race condition between stock check and stock update
- **How to Avoid**: Use conditional update: `UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :qty`. If affected rows = 0, rollback payment transaction.
- **Discovered**: 2026-07-10

#### Orders — Price Changes Affect Old Orders

- **What Happens**: If you calculate order totals from live product prices, changing a product's price retroactively changes historical order totals
- **Why**: Order totals become non-deterministic and accounting breaks
- **How to Avoid**: Always snapshot product price at order creation time in OrderItem entity. Calculate totals only from snapshots.
- **Discovered**: 2026-07-10

#### Orders — Floating Point Math for Money

- **What Happens**: Using floating point for money calculations (e.g., `19.99 * 3`) produces rounding errors like `59.97000000000001`
- **Why**: IEEE 754 floating point cannot represent some decimals exactly
- **How to Avoid**: Use integer minor units (cents/poisha) only: `1999 * 3 = 5997`. Never use floating point for money.
- **Discovered**: 2026-07-10

#### Orders — Payment Confirmation Not Atomic

- **What Happens**: If payment confirmation and stock reduction are not in the same transaction, you can have paid orders without stock reduction (overselling) or stock reduction without payment confirmation (inventory locked but no payment)
- **Why**: Partial failure scenarios where one operation succeeds but the other fails
- **How to Avoid**: Always wrap payment confirmation, order status update, and stock updates in a single database transaction. All must succeed or all must fail.
- **Discovered**: 2026-07-10

## Authentication & Security

#### Auth — JWT Library Type Compatibility

- **What Happens**: TypeScript errors with `expiresIn` type in JWT signAsync
- **Why**: JWT library expects specific types but NestJS JWT service uses string
- **How to Avoid**: Use type assertion `as any` for expiresIn values when passing to signAsync
- **Discovered**: 2026-07-10 during auth module implementation
- **Example**:

```typescript
return this.jwtService.signAsync(payload, {
  expiresIn: expiresIn as any, // Type assertion for JWT library compatibility
});
```

#### Auth — Prisma User Model Null vs Undefined

- **What Happens**: Type mismatch when converting Prisma User (null) to DTO (undefined)
- **Why**: Prisma uses `null` for optional fields, but DTOs expect `undefined`
- **How to Avoid**: Use nullish coalescing `??` instead of logical OR `||` when converting
- **Discovered**: 2026-07-10 during user service implementation
- **Example**:

```typescript
return {
  name: userJson.name ?? undefined, // NOT: name: userJson.name || undefined
};
```

#### Auth — User Entity Password Destructuring

- **What Happens**: Cannot destructure `password` from toJSON() return type
- **Why**: TypeScript excludes password from the return type definition
- **How to Avoid**: Manually construct DTO without password instead of destructuring
- **Discovered**: 2026-07-10 during user service implementation
- **Example**:

```typescript
// WRONG - TypeScript error
const { password, ...userDto } = user.toJSON();

// RIGHT - Manual construction
const userJson = user.toJSON();
return {
  id: userJson.id,
  email: userJson.email,
  // ... (no password field)
};
```

#### Auth — Refresh Token Secret Not Found

- **What Happens**: Application crashes if JWT_REFRESH_SECRET is not set
- **Why**: JWT strategies throw errors during initialization if secret is undefined
- **How to Avoid**: Always validate JWT secrets exist at module initialization
- **Discovered**: 2026-07-10 during auth module setup
- **Example**:

```typescript
const secret = config.get<string>('JWT_REFRESH_SECRET');
if (!secret) {
  throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
}
```

#### Auth — Password Never in API Responses

- **What Happens**: Password accidentally exposed in API responses
- **Why**: Forgetting to exclude password at DTO level
- **How to Avoid**: Always use dedicated response DTOs that don't include password field, not just by convention
- **Discovered**: 2026-07-10 during user response design
- **Security Impact**: Critical - password hashes must never be exposed

#### Auth — Email Uniqueness at DB Level

- **What Happens**: Duplicate emails in database if only DTO validation is used
- **Why**: Race conditions or direct database writes can bypass application validation
- **How to Avoid**: Always enforce email uniqueness at Prisma schema level with `@unique`
- **Discovered**: 2026-07-10 during user registration design
- **Security Impact**: Critical - prevents account takeover attacks

## File Storage (S3)

#### S3 — Path Style vs Virtual Host Style

- **What Happens**: S3 API calls fail with 403 or 404 errors when using wrong addressing style
- **Why**: Some S3 providers (MinIO, LocalStack) require path-style URLs, AWS uses virtual-host style
- **How to Avoid**: Set `AWS_USE_PATH_STYLE_ENDPOINT=true` for MinIO/LocalStack, `false` for AWS S3
- **Discovered**: 2025-07-10 during S3 module implementation

**Example**:

```bash
# AWS S3 (virtual-host style)
AWS_USE_PATH_STYLE_ENDPOINT=false  # https://bucket.s3.region.amazonaws.com/key

# MinIO/LocalStack (path style)
AWS_USE_PATH_STYLE_ENDPOINT=true   # https://endpoint/bucket/key
```

#### S3 — Public ACL Not Working

- **What Happens**: Uploaded files return 403 Forbidden when accessed via URL
- **Why**: Some S3 providers (DigitalOcean Spaces) require explicit ACL configuration
- **How to Avoid**: Always set `ACL: 'public-read'` in PutObjectCommand
- **Discovered**: 2025-07-10 during S3 service design
- **Note**: Some providers may ignore ACL if bucket has default policies

#### S3 — Orphaned Files on Failed Upload

- **What Happens**: S3 storage fills with unused files if upload fails after S3 upload but before DB update
- **Why**: S3 upload succeeds but product update fails (race condition or DB error)
- **How to Avoid**: Never leave orphaned files - delete old image in same service method after successful new upload, before DB update
- **Discovered**: 2025-07-10 during product image upload design

**Pattern**:

```typescript
// 1. Delete old image first
if (product.imageUrl) await deleteProductImage(productId);
// 2. Upload new image
const { url } = await s3Service.uploadProductImage(...);
// 3. Update DB (last - can rollback S3 by deleting new URL if this fails)
await prisma.product.update({ imageUrl: url });
```

#### S3 — Client-Spoofed MIME Types

- **What Happens**: Malicious files uploaded with fake `Content-Type` header bypass validation
- **Why**: Browser `file.mimetype` comes from client, can be spoofed
- **How to Avoid**: Validate MIME type in controller AND verify file magic bytes (not implemented yet - use `file-type` package)
- **Discovered**: 2025-07-10 during file upload security review
- **Security Impact**: High - allows executable file upload

**TODO**: Add magic byte validation using `file-type` package:

```typescript
import { fileTypeFromBuffer } from 'file-type';
const type = await fileTypeFromBuffer(file.buffer);
if (!ALLOWED_MIME_TYPES.includes(type.mime)) throw new BadRequestException();
```

#### S3 — File Size Validation in Two Places

- **What Happens**: Large files uploaded if validation only in controller or only in service
- **Why**: Controller validation can be bypassed, service validation may not have file size limit
- **How to Avoid**: Always validate file size in BOTH controller (ParseFilePipeBuilder) and service (ConfigService check)
- **Discovered**: 2025-07-10 during defense-in-depth implementation

**Example**:

```typescript
// Controller (first line of defense)
.addMaxSizeValidator({ maxSize: 5242880 })

// Service (second line of defense)
const maxFileSize = config.get('AWS_S3_MAX_FILE_SIZE');
if (file.size > maxFileSize) throw new BadRequestException();
```

#### S3 — CDN URL Construction

- **What Happens**: Image URLs break or point to wrong location if CDN URL not configured
- **Why**: Fallback to S3 URL format may not match CDN setup
- **How to Avoid**: Test CDN URL format in dev environment before production
- **Discovered**: 2025-07-10 during URL construction design

**Example**:

```typescript
// Correct CDN format
AWS_CDN_URL=https://cdn.example.com  // Results in https://cdn.example.com/products/123/image.jpg

// Missing CDN (falls back to S3)
// https://bucket.s3.region.amazonaws.com/products/123/image.jpg
```

#### S3 — Delete Fails Silently

- **What Happens**: Old images not deleted from S3 when product is deleted
- **Why**: S3 delete fails but product deletion continues (error swallowed)
- **How to Avoid**: Log delete errors but don't block product deletion - manual cleanup may be needed
- **Discovered**: 2025-07-10 during product delete implementation

**Pattern**:

```typescript
try {
  await s3Service.deleteFile(key);
} catch (error) {
  this.logger.error(`Failed to delete from S3: ${error}`);
  // Continue with product deletion - S3 cleanup can be manual
}
```

## Prisma v7 — Requires Driver Adapter (not datasourceUrl)

Prisma v7 removed `datasourceUrl` from `PrismaClientOptions`. PrismaClient now requires either an `adapter` (Driver Adapter) or an `accelerateUrl`. For PostgreSQL, install and use `@prisma/adapter-pg`:

```bash
pnpm add @prisma/adapter-pg pg
pnpm add -D @types/pg
```

```typescript
import { PrismaPg } from '@prisma/adapter-pg';

constructor() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  super({ adapter });
}
```

Empty `super()` and `super({ datasourceUrl: ... })` both throw `PrismaClientInitializationError` at startup.

**Discovered**: 2026-07-10 during Prisma v7 upgrade

## NestJS DI — `any` typed constructor params break resolution

NestJS cannot resolve `any` typed constructor dependencies. Always use concrete class types (e.g., `ConfigService`) as constructor parameters in injectable classes.

**Discovered**: 2026-07-10 during auth strategy fix
