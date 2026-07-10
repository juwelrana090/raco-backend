import { OrderItem as PrismaOrderItem } from '@prisma/client';

export class OrderItem implements PrismaOrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number; // Snapshot of price at order time (minor units)
  createdAt: Date;

  constructor(data: PrismaOrderItem) {
    this.id = data.id;
    this.orderId = data.orderId;
    this.productId = data.productId;
    this.quantity = data.quantity;
    this.price = data.price;
    this.createdAt = data.createdAt;
  }

  /**
   * Calculate subtotal for this order item
   * Deterministic: subtotal = price * quantity (integer arithmetic)
   *
   * @returns subtotal in minor units (cents/poisha)
   */
  calculateSubtotal(): number {
    // Integer arithmetic only - no floating point
    return this.price * this.quantity;
  }

  /**
   * Create an OrderItem instance from Prisma data
   */
  static fromPrisma(data: PrismaOrderItem): OrderItem {
    return new OrderItem(data);
  }

  /**
   * Create OrderItem data for Prisma create operation
   * This captures the price snapshot at order creation time
   */
  static createForOrder(productId: string, quantity: number, price: number): Omit<PrismaOrderItem, 'id' | 'orderId' | 'createdAt'> {
    return {
      productId,
      quantity,
      price, // Price snapshot at order time
    };
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      id: this.id,
      orderId: this.orderId,
      productId: this.productId,
      quantity: this.quantity,
      price: this.price,
      subtotal: this.calculateSubtotal(),
      createdAt: this.createdAt,
    };
  }
}
