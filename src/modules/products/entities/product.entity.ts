import { Product as PrismaProduct } from '@prisma/client';

export class Product implements PrismaProduct {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  fileManagerId: number | null;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: PrismaProduct) {
    this.id = data.id;
    this.sku = data.sku;
    this.name = data.name;
    this.description = data.description;
    this.price = data.price;
    this.stock = data.stock;
    this.imageUrl = data.imageUrl;
    this.fileManagerId = data.fileManagerId;
    this.categoryId = data.categoryId;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Check if product is in stock
   */
  isInStock(): boolean {
    return this.stock > 0;
  }

  /**
   * Check if quantity can be fulfilled
   */
  hasSufficientStock(quantity: number): boolean {
    return this.stock >= quantity;
  }

  /**
   * Get price in major units (e.g., dollars instead of cents)
   */
  getPriceInMajorUnits(): number {
    return this.price / 100;
  }

  /**
   * Create a Product instance from Prisma data
   */
  static fromPrisma(data: PrismaProduct): Product {
    return new Product(data);
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      sku: this.sku,
      name: this.name,
      description: this.description,
      price: this.price,
      stock: this.stock,
      imageUrl: this.imageUrl,
      fileManagerId: this.fileManagerId,
      categoryId: this.categoryId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
