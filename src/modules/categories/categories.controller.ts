import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@ApiTags('Categories')
@ApiBearerAuth('JWT')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Get all categories as a nested tree structure
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get category tree (nested structure)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category tree retrieved successfully',
    type: [CategoryResponseDto],
  })
  async getTree(): Promise<CategoryResponseDto[]> {
    const categories = await this.categoriesService.getTree();
    return categories.map((cat) => cat.toJSON()) as CategoryResponseDto[];
  }

  /**
   * Get category by ID
   */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category retrieved successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string): Promise<CategoryResponseDto> {
    const category = await this.categoriesService.findOne(id);
    return category.toFlatJSON() as CategoryResponseDto;
  }

  /**
   * Get all products in a category and its descendants
   */
  @Get(':id/products')
  @Public()
  @ApiOperation({ summary: 'Get all products in category and subcategories' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Products retrieved successfully',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  @ApiParam({ name: 'id', type: String })
  async getProducts(@Param('id') id: string) {
    return this.categoriesService.getProducts(id);
  }

  /**
   * Create a new category (Admin only)
   */
  @Post()
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new category (Admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Category created successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Category name already exists',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Parent category not found',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoriesService.create(createCategoryDto);
    return category.toFlatJSON() as CategoryResponseDto;
  }

  /**
   * Update a category (Admin only)
   */
  @Patch(':id')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a category (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category updated successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or circular reference',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Category name already exists',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  @ApiParam({ name: 'id', type: String })
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoriesService.update(id, updateCategoryDto);
    return category.toFlatJSON() as CategoryResponseDto;
  }

  /**
   * Delete a category (Admin only)
   */
  @Delete(':id')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category (Admin only)' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Category deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Category has subcategories or products',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  @ApiParam({ name: 'id', type: String })
  async remove(@Param('id') id: string): Promise<void> {
    await this.categoriesService.remove(id);
  }

  /**
   * Upload category image (Admin only)
   */
  @Post(':id/image')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth('JWT')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  @ApiOperation({ summary: 'Upload category image (Admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category image uploaded successfully',
    schema: {
      example: {
        success: true,
        message: 'Category image uploaded successfully',
        data: { imageUrl: 'https://cdn.madrasah.dev/raco/category-image/uuid.jpg' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid file type or size' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  async uploadCategoryImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ imageUrl: string }> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    return this.categoriesService.uploadCategoryImage(id, file);
  }

  /**
   * Delete category image (Admin only)
   */
  @Delete(':id/image')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth('JWT')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete category image (Admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Category image deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category or image not found' })
  async deleteCategoryImage(@Param('id') id: string): Promise<void> {
    await this.categoriesService.deleteCategoryImage(id);
  }
}
