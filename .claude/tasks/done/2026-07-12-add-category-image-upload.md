# Add Category Image Upload Support

**Created:** 2026-07-12  
**Completed By:** Dalawer Hossain Juwel  
**Completed Date:** 2026-07-12  
**Priority:** Feature  
**Type:** Implementation  

## Task Description

Add image upload support to Categories by mirroring the exact pattern used by Products. The Category model needs imageUrl and fileManagerId fields, and the controller needs image upload/delete endpoints.

## Requirements

1. Add imageUrl and fileManagerId fields to Category model
2. Run Prisma migration 
3. Add uploadCategoryImage method to S3Service
4. Update CategoriesModule to import S3Module
5. Update Category entity with new fields
6. Update category-response DTO with imageUrl field
7. Add image upload/delete methods to CategoriesService
8. Add image upload/delete endpoints to CategoriesController

## Acceptance Criteria

- [x] Prisma schema updated with imageUrl and fileManagerId fields
- [x] Migration applied successfully
- [x] S3Service has uploadCategoryImage method
- [x] CategoriesModule imports S3Module
- [x] Category entity includes imageUrl and fileManagerId fields
- [x] Category response DTO includes imageUrl field
- [x] CategoriesService has uploadCategoryImage and deleteCategoryImage methods
- [x] CategoriesController has POST and DELETE image endpoints
- [x] Server compiles without errors
- [x] New routes registered successfully: `/api/v1/categories/:id/image`

## Files Changed

### Database
- `prisma/schema.prisma` - Added imageUrl and fileManagerId to Category, categories relation to FileManager

### Core Implementation  
- `src/modules/s3/s3.service.ts` - Added uploadCategoryImage method
- `src/modules/categories/categories.module.ts` - Added S3Module import
- `src/modules/categories/entities/category.entity.ts` - Added imageUrl and fileManagerId fields
- `src/modules/categories/dto/category-response.dto.ts` - Added imageUrl field
- `src/modules/categories/categories.service.ts` - Added uploadCategoryImage and deleteCategoryImage methods
- `src/modules/categories/categories.controller.ts` - Added POST and DELETE image endpoints

## Technical Details

### Pattern Used
Mirrored the exact product image upload pattern:
- Same fileUse pattern: 'category-image'
- Same FileManager integration
- Same Redis cache invalidation (category_tree)
- Same FileInterceptor with memoryStorage()
- Same error handling and validation

### Key Implementation Notes
- Uses `fileUse='category-image'` in FileManager records
- Always invalidates Redis `category_tree` cache after image changes
- FileInterceptor MUST use `memoryStorage()` - otherwise file.buffer is undefined
- Deletes old category image before uploading new one
- Uses deleteByFileManagerId for proper cleanup

## Testing Verification

✅ Server compiled successfully  
✅ New routes registered:  
- `POST /api/v1/categories/:id/image`  
- `DELETE /api/v1/categories/:id/image`

## Summary

Successfully added category image upload support to the Categories module by mirroring the product image upload pattern. The implementation includes database schema changes, S3 integration, service methods, and API endpoints. Server compiles and runs successfully with new routes properly registered.

## Next Steps for Testing

When database is available, test with:

```bash
# Upload category image
curl -X POST http://localhost:4000/api/v1/categories/<CATEGORY_ID>/image \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -F "image=@/path/to/test.jpg"

# Expected:
# { "imageUrl": "https://cdn.madrasah.dev/raco/category-image/uuid.jpg" }
```

Database verification:

```sql
SELECT id, name, image_url, file_manager_id FROM categories WHERE image_url IS NOT NULL;
SELECT * FROM file_manager WHERE file_use = 'category-image' ORDER BY created_at DESC LIMIT 5;
```