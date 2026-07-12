# Fix Product Image Upload Bug

**Created:** 2026-07-12  
**Completed By:** Dalawer Hossain Juwel  
**Completed Date:** 2026-07-12  
**Priority:** Critical  
**Type:** Bug Fix  

## Problem

Product image upload was failing because `file.buffer` was `undefined` when uploading to S3. This was caused by `FileInterceptor` not being configured with `memoryStorage()`, causing multer to use disk storage instead.

## Root Cause

`FileInterceptor('image')` without a storage option uses multer's default disk storage. Multer writes the file to a temp folder on disk and sets `file.path` — but `file.buffer` is `undefined`. The S3Service calls `this.s3Client.send(command)` with `Body: file.buffer` which is `undefined`, so S3 receives an empty upload.

## Solution

1. Add `import { memoryStorage } from 'multer';` to products.controller.ts
2. Update `@UseInterceptors(FileInterceptor('image'))` to `@UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))`

## Acceptance Criteria

- [x] Import `memoryStorage` from multer package
- [x] Configure FileInterceptor with memoryStorage option
- [x] Log gotcha to `.claude/memory/gotchas.md`
- [x] Server compiles without errors
- [ ] Test image upload via curl (requires database)
- [ ] Verify image upload in database (requires database)

## Files Changed

- `src/modules/products/products.controller.ts` - Added memoryStorage configuration
- `.claude/memory/gotchas.md` - Added gotcha about FileInterceptor configuration

## Summary

Successfully fixed the critical image upload bug by configuring FileInterceptor with memoryStorage(). The fix ensures that `file.buffer` contains the raw file bytes needed for S3 upload, preventing silent upload failures. The server compiles and runs without errors, and the gotcha has been documented for future reference.

## Testing Instructions

Once database is available:

```bash
curl -X POST http://localhost:4000/api/v1/products/<PRODUCT_ID>/image \
  -H "Authorization: Bearer <TOKEN>" \
  -F "image=@/path/to/test.jpg"
```

Expected response:

```json
{
  "success": true,
  "message": "Product image uploaded successfully",
  "data": {
    "imageUrl": "https://cdn.madrasah.dev/raco/product-image/uuid.jpg"
  }
}
```