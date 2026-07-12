import { Category as PrismaCategory } from '@prisma/client';

export class Category implements PrismaCategory {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  imageUrl: string | null;
  fileManagerId: number | null;
  createdAt: Date;
  updatedAt: Date;

  // Not in Prisma model but useful for tree structure
  children?: Category[];
  products?: any[];

  constructor(data: PrismaCategory) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.parentId = data.parentId;
    this.imageUrl = (data as any).imageUrl ?? null;
    this.fileManagerId = (data as any).fileManagerId ?? null;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Check if this is a root category (no parent)
   */
  isRoot(): boolean {
    return this.parentId === null;
  }

  /**
   * Check if this is a leaf category (no children)
   */
  isLeaf(): boolean {
    return !this.children || this.children.length === 0;
  }

  /**
   * Get the depth level in the tree
   */
  getLevel(): number {
    let level = 0;
    const current = this;
    while (current.parentId) {
      level++;
      // This would require fetching parent, simplified for now
      break;
    }
    return level;
  }

  /**
   * Create a Category instance from Prisma data
   */
  static fromPrisma(data: PrismaCategory): Category {
    return new Category(data);
  }

  /**
   * Convert to JSON (nested structure)
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      parentId: this.parentId,
      imageUrl: this.imageUrl,
      fileManagerId: this.fileManagerId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      ...(this.children && { children: this.children }),
      ...(this.products && { products: this.products }),
    };
  }

  /**
   * Convert to flat JSON (without nested children)
   */
  toFlatJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      parentId: this.parentId,
      imageUrl: this.imageUrl,
      fileManagerId: this.fileManagerId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
