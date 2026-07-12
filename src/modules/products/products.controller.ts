import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipeBuilder,
  FileTypeValidator,
  MaxFileSizeValidator,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductImageResponseDto } from './dto/product-image-response.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ConfigService } from '@nestjs/config';

@ApiTags('Products')
@ApiBearerAuth('JWT')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Get all products with pagination and filtering
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all products with pagination and filtering',
    description:
      'Returns a paginated list of products. Supports filtering by category, search by name, and sorting.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Products retrieved successfully',
    type: Object,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Filter by category UUID',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by product name',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    enum: ['name', 'price', 'createdAt', 'stock'],
    description: 'Sort field (default: createdAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: desc)',
  })
  async findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  /**
   * Get product by ID
   */
  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get product by ID',
    description:
      'Returns a single product with all details including category.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product retrieved successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiParam({ name: 'id', type: String, description: 'Product UUID' })
  async findOne(@Param('id') id: string): Promise<ProductResponseDto> {
    const product = await this.productsService.findOne(id);
    return product.toJSON() as ProductResponseDto;
  }

  /**
   * Get recommended products based on category hierarchy
   */
  @Get(':id/recommendations')
  @Public()
  @ApiOperation({
    summary: 'Get recommended products using category tree traversal',
    description:
      'Returns products from the same category and its descendant categories. Uses DFS traversal cached in Redis.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recommended products retrieved successfully',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiParam({ name: 'id', type: String, description: 'Product UUID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Max recommendations to return',
  })
  async getRecommendations(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.getRecommendations(id, limit);
  }

  /**
   * Create a new product (Admin only)
   */
  @Post()
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Create a new product (Admin only)',
    description:
      'Create a new product with SKU, name, price (in poisha), stock, and category. SKU must be unique.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product created successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input (validation errors)',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'SKU already exists',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  async create(
    @Body() createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.create(createProductDto);
    return product.toJSON() as ProductResponseDto;
  }

  /**
   * Update a product (Admin only)
   */
  @Patch(':id')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Update a product (Admin only)',
    description:
      'Update product fields. Only provided fields will be updated. SKU uniqueness is enforced.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product updated successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'SKU already exists',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  @ApiParam({ name: 'id', type: String, description: 'Product UUID' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.update(id, updateProductDto);
    return product.toJSON() as ProductResponseDto;
  }

  /**
   * Delete a product (Admin only)
   */
  @Delete(':id')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a product (Admin only)',
    description:
      'Permanently delete a product. Fails if product is referenced in existing orders.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Product deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Product referenced in orders',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  @ApiParam({ name: 'id', type: String, description: 'Product UUID' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.productsService.remove(id);
  }

  /**
   * Upload product image (Admin only)
   */
  @Post(':id/image')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  @ApiOperation({
    summary: 'Upload product image (Admin only)',
    description:
      'Upload an image for a product. Accepted formats: JPEG, PNG, WebP, GIF. Max size: 5MB. Old image is automatically deleted.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product image uploaded successfully',
    type: ProductImageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file type or size',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', type: String, description: 'Product UUID' })
  async uploadProductImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpeg|jpg|png|webp|gif)$/i,
        })
        .addMaxSizeValidator({
          maxSize: 5242880, // 5MB in bytes
          message: 'File size exceeds maximum allowed size of 5MB',
        })
        .build({
          errorHttpStatusCode: HttpStatus.BAD_REQUEST,
          exceptionFactory: (error) => new BadRequestException(error),
        }),
    )
    file: Express.Multer.File,
  ): Promise<{ imageUrl: string }> {
    return this.productsService.uploadProductImage(id, file);
  }

  /**
   * Delete product image (Admin only)
   */
  @Delete(':id/image')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete product image (Admin only)',
    description: 'Remove the image associated with a product from S3 storage.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Product image deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product or image not found',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  @ApiParam({ name: 'id', type: String, description: 'Product UUID' })
  async deleteProductImage(@Param('id') id: string): Promise<void> {
    await this.productsService.deleteProductImage(id);
  }
}
