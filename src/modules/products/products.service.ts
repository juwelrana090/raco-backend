import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { CategoriesService } from '../categories/categories.service';
import { S3Service } from '../s3/s3.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private categoriesService: CategoriesService,
    private s3Service: S3Service,
    private config: ConfigService,
  ) {}

  /**
   * Create a new product
   */
  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { sku, name, description, price, stock, imageUrl, categoryId } =
      createProductDto;

    // Check if SKU already exists
    const existingProduct = await this.prisma.product.findUnique({
      where: { sku },
    });

    if (existingProduct) {
      throw new ConflictException('Product with this SKU already exists');
    }

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const product = await this.prisma.product.create({
      data: {
        sku,
        name,
        description,
        price,
        stock,
        imageUrl,
        categoryId,
      },
    });

    // Invalidate category cache
    await this.invalidateCategoryCache(categoryId);

    return Product.fromPrisma(product);
  }

  /**
   * Get all products with pagination and filtering
   */
  async findAll(query: QueryProductDto) {
    const {
      page = 1,
      limit = 10,
      categoryId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (categoryId) {
      // Get all descendant categories
      const descendantIds =
        await this.categoriesService.getDescendants(categoryId);
      const allCategoryIds = [categoryId, ...descendantIds];
      where.categoryId = { in: allCategoryIds };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await this.prisma.product.count({ where });

    // Get products
    const products = await this.prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products: products.map((p) => ({
          ...Product.fromPrisma(p).toJSON(),
          category: p.category,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    };
  }

  /**
   * Get product by ID
   */
  async findOne(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return Product.fromPrisma(product);
  }

  /**
   * Get recommended products using category tree traversal
   * Uses DFS to find related products in the same category hierarchy
   */
  async getRecommendations(productId: string, limit: number = 10) {
    const product = await this.findOne(productId);

    // Get all descendant categories of the product's category
    const descendantIds = await this.categoriesService.getDescendants(
      product.categoryId,
    );

    // Include the current category and all descendants
    const allCategoryIds = [product.categoryId, ...descendantIds];

    // Get products from these categories, excluding the current product
    const recommendedProducts = await this.prisma.product.findMany({
      where: {
        categoryId: { in: allCategoryIds },
        id: { not: productId },
        stock: { gt: 0 }, // Only show in-stock products
      },
      take: limit,
      orderBy: [
        { stock: 'desc' }, // Prefer products with more stock
        { name: 'asc' },
      ],
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Recommended products retrieved successfully',
      data: {
        recommendedProducts: recommendedProducts.map((p) => ({
          ...Product.fromPrisma(p).toJSON(),
          category: p.category,
        })),
        total: recommendedProducts.length,
      },
    };
  }

  /**
   * Update a product
   */
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const existing = await this.findOne(id);
    const { sku, categoryId, ...otherData } = updateProductDto;

    // Check if SKU is being updated and already exists
    if (sku && sku !== existing.sku) {
      const skuExists = await this.prisma.product.findUnique({
        where: { sku },
      });

      if (skuExists) {
        throw new ConflictException('Product with this SKU already exists');
      }
    }

    // Verify category if being updated
    if (categoryId && categoryId !== existing.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(sku && { sku }),
        ...otherData,
        ...(categoryId && { categoryId }),
      },
    });

    // Invalidate caches for both old and new categories
    await this.invalidateCategoryCache(existing.categoryId);
    if (categoryId && categoryId !== existing.categoryId) {
      await this.invalidateCategoryCache(categoryId);
    }

    return Product.fromPrisma(product);
  }

  /**
   * Delete a product
   */
  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);

    // Check if product is referenced in any orders
    const orderItems = await this.prisma.orderItem.findFirst({
      where: { productId: id },
    });

    if (orderItems) {
      throw new BadRequestException(
        'Cannot delete product that is referenced in orders. Consider archiving it instead.',
      );
    }

    // Delete product image from S3 if exists
    if (product.fileManagerId) {
      try {
        await this.s3Service.deleteByFileManagerId(product.fileManagerId);
      } catch (error) {
        this.logger.error(`Failed to delete product image from S3: ${error}`);
      }
    }

    await this.prisma.product.delete({
      where: { id },
    });

    // Invalidate category cache
    await this.invalidateCategoryCache(product.categoryId);
  }

  /**
   * Invalidate category cache (called when products change)
   */
  private async invalidateCategoryCache(categoryId: string): Promise<void> {
    await this.redis.invalidateCategoryCache(categoryId);

    // Also invalidate parent caches recursively
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { parentId: true },
    });

    if (category?.parentId) {
      await this.invalidateParentCategoryCache(category.parentId);
    }
  }

  /**
   * Recursively invalidate parent category caches
   */
  private async invalidateParentCategoryCache(
    categoryId: string,
  ): Promise<void> {
    await this.redis.invalidateCategoryCache(categoryId);

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { parentId: true },
    });

    if (category?.parentId) {
      await this.invalidateParentCategoryCache(category.parentId);
    }
  }

  /**
   * Update product stock (called by order module)
   * NOTE: This does NOT reduce stock, that's handled by order-agent
   * This is only for manual stock adjustments by admin
   */
  async updateStock(id: string, quantity: number): Promise<Product> {
    const product = await this.findOne(id);

    if (product.stock + quantity < 0) {
      throw new BadRequestException('Stock cannot be negative');
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        stock: {
          increment: quantity,
        },
      },
    });

    return Product.fromPrisma(updatedProduct);
  }

  /**
   * Upload product image to S3
   */
  async uploadProductImage(
    productId: string,
    file: Express.Multer.File,
  ): Promise<{ imageUrl: string }> {
    const product = await this.findOne(productId);

    // Validate file size
    const maxFileSize = this.config.get<number>(
      'AWS_S3_MAX_FILE_SIZE',
      5242880,
    ); // 5MB default
    if (file.size > maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Validate file type
    const allowedMimeTypes = this.config
      .get<string>('AWS_S3_ALLOWED_MIME_TYPES', '')
      .split(',');
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }

    // Delete old image if exists (using FileManager id — not URL)
    if (product.fileManagerId) {
      try {
        await this.s3Service.deleteByFileManagerId(product.fileManagerId);
      } catch (err) {
        this.logger.error(`Failed to delete old image: ${err}`);
      }
    }

    // Upload new image — returns FileManager record
    const fileRecord = await this.s3Service.uploadProductImage(
      file.buffer,
      file.originalname,
    );

    // Update product: store CDN URL for display + FileManager ID for future deletion
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        imageUrl: fileRecord.fileCdnUrl,
        fileManagerId: fileRecord.id,
      },
    });

    this.logger.log(
      `Product ${productId} image uploaded — FileManager id=${fileRecord.id}`,
    );

    return { imageUrl: fileRecord.fileCdnUrl };
  }

  /**
   * Delete product image from S3 and database
   */
  async deleteProductImage(productId: string): Promise<void> {
    const product = await this.findOne(productId);

    if (!product.imageUrl) {
      throw new NotFoundException('Product has no image to delete');
    }

    // Use FileManager id for deletion — never extract key from URL
    if (product.fileManagerId) {
      await this.s3Service.deleteByFileManagerId(product.fileManagerId);
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        imageUrl: null,
        fileManagerId: null,
      },
    });

    this.logger.log(`Product ${productId} image deleted`);
  }
}
