import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Create a new category
   */
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const { name, description, parentId } = createCategoryDto;

    // Check if category with same name exists at same level
    if (parentId) {
      const parentExists = await this.prisma.category.findUnique({
        where: { id: parentId },
      });

      if (!parentExists) {
        throw new NotFoundException('Parent category not found');
      }

      // Check for duplicate name among siblings
      const existingSibling = await this.prisma.category.findFirst({
        where: {
          name,
          parentId,
        },
      });

      if (existingSibling) {
        throw new ConflictException(
          'Category with this name already exists in this parent',
        );
      }
    } else {
      // Check for duplicate root category
      const existingRoot = await this.prisma.category.findFirst({
        where: {
          name,
          parentId: null,
        },
      });

      if (existingRoot) {
        throw new ConflictException('Root category with this name already exists');
      }
    }

    const category = await this.prisma.category.create({
      data: {
        name,
        description,
        parentId,
      },
    });

    // Invalidate parent cache if this is a subcategory
    if (parentId) {
      await this.invalidateParentCache(parentId);
    }

    return Category.fromPrisma(category);
  }

  /**
   * Get all categories as a nested tree structure
   */
  async getTree(): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    // Build tree structure
    const categoryMap = new Map<string, Category>();
    categories.forEach((cat) => {
      categoryMap.set(cat.id, Category.fromPrisma(cat));
    });

    const rootCategories: Category[] = [];

    categories.forEach((cat) => {
      const category = categoryMap.get(cat.id)!;

      if (cat.parentId === null) {
        rootCategories.push(category);
      } else {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(category);
        }
      }
    });

    return rootCategories;
  }

  /**
   * Get category by ID
   */
  async findOne(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return Category.fromPrisma(category);
  }

  /**
   * Get all descendant category IDs using DFS traversal
   * This is cached in Redis for performance
   */
  async getDescendants(categoryId: string): Promise<string[]> {
    // Check cache first
    const cached = await this.redis.getCategoryTree(categoryId);
    if (cached) {
      return cached;
    }

    // DFS traversal to get all descendant IDs
    const descendants: string[] = [];
    const visited = new Set<string>();

    const dfs = async (id: string) => {
      if (visited.has(id)) {
        return;
      }

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

    // Cache the result
    await this.redis.cacheCategoryTree(categoryId, descendants);

    return descendants;
  }

  /**
   * Get all products in a category and its descendants
   */
  async getProducts(categoryId: string) {
    const category = await this.findOne(categoryId);

    // Get all descendant category IDs
    const descendantIds = await this.getDescendants(categoryId);

    // Include the current category
    const allCategoryIds = [categoryId, ...descendantIds];

    // Get products from all categories
    const products = await this.prisma.product.findMany({
      where: {
        categoryId: { in: allCategoryIds },
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      message: 'Products retrieved successfully',
      data: {
        category: Category.fromPrisma(category).toFlatJSON(),
        products: products.map((p) => Product.fromPrisma(p).toJSON()),
        total: products.length,
      },
    };
  }

  /**
   * Update a category
   */
  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const { name, description, parentId } = updateCategoryDto;

    // Check if category exists
    const existing = await this.findOne(id);

    // Validate parent change
    if (parentId !== undefined && parentId !== null) {
      // Prevent setting self as parent
      if (parentId === id) {
        throw new BadRequestException('Cannot set category as its own parent');
      }

      // Check if new parent exists
      const parentExists = await this.prisma.category.findUnique({
        where: { id: parentId },
      });

      if (!parentExists) {
        throw new NotFoundException('Parent category not found');
      }

      // Prevent creating circular reference
      const descendantIds = await this.getDescendants(id);
      if (descendantIds.includes(parentId)) {
        throw new BadRequestException(
          'Cannot set a descendant as the parent',
        );
      }
    }

    // Check for duplicate name at same level
    if (name) {
      const newParentId = parentId !== undefined ? parentId : existing.parentId;

      const duplicate = await this.prisma.category.findFirst({
        where: {
          name,
          parentId: newParentId,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'Category with this name already exists at this level',
        );
      }
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(parentId !== undefined && { parentId }),
      },
    });

    // Invalidate caches
    await this.invalidateCategoryCache(id);
    if (existing.parentId) {
      await this.invalidateParentCache(existing.parentId);
    }
    if (parentId && parentId !== existing.parentId) {
      await this.invalidateParentCache(parentId);
    }

    return Category.fromPrisma(category);
  }

  /**
   * Delete a category
   */
  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    // Check if category has children
    const hasChildren = await this.prisma.category.findFirst({
      where: { parentId: id },
    });

    if (hasChildren) {
      throw new BadRequestException(
        'Cannot delete category with subcategories. Delete subcategories first.',
      );
    }

    // Check if category has products
    const hasProducts = await this.prisma.product.findFirst({
      where: { categoryId: id },
    });

    if (hasProducts) {
      throw new BadRequestException(
        'Cannot delete category with products. Move or delete products first.',
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    // Invalidate caches
    if (category.parentId) {
      await this.invalidateParentCache(category.parentId);
    }
  }

  /**
   * Invalidate cache for a specific category
   */
  private async invalidateCategoryCache(categoryId: string): Promise<void> {
    await this.redis.invalidateCategoryCache(categoryId);
  }

  /**
   * Invalidate cache for parent categories (recursively up the tree)
   */
  private async invalidateParentCache(categoryId: string): Promise<void> {
    await this.redis.invalidateCategoryCache(categoryId);

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { parentId: true },
    });

    if (category?.parentId) {
      await this.invalidateParentCache(category.parentId);
    }
  }

  /**
   * Invalidate all category caches (called when products change)
   */
  async invalidateAllCategoryCaches(): Promise<void> {
    // This would require pattern matching, for now we'll handle it
    // by invalidating specific caches when products change
    await this.redis.delPattern('category:tree:*');
  }
}
