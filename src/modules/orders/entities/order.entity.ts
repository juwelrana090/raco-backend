import {
  Order as PrismaOrder,
  OrderStatus,
  OrderItem as PrismaOrderItem,
} from '@prisma/client';
import { OrderItem } from './order-item.entity';

export class Order implements PrismaOrder {
  id: string;
  userId: string;
  totalAmount: number; // Sum of all item subtotals (minor units)
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;

  // Not in Prisma model but needed for domain logic
  items?: OrderItem[];

  constructor(data: PrismaOrder & { items?: PrismaOrderItem[] }) {
    this.id = data.id;
    this.userId = data.userId;
    this.totalAmount = data.totalAmount;
    this.status = data.status;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;

    // Convert items to OrderItem entities
    this.items = data.items?.map((item) => OrderItem.fromPrisma(item));
  }

  /**
   * Calculate total amount from items
   * Deterministic: total = sum(item.subtotal) where subtotal = price * quantity
   *
   * @returns total amount in minor units (cents/poisha)
   */
  calculateTotal(): number {
    if (!this.items || this.items.length === 0) {
      return 0;
    }

    // Sum all item subtotals using integer arithmetic
    return this.items.reduce((total, item) => {
      return total + item.calculateSubtotal();
    }, 0);
  }

  /**
   * Check if order can be paid
   */
  canBePaid(): boolean {
    return this.status === OrderStatus.PENDING;
  }

  /**
   * Check if order can be cancelled
   */
  canBeCancelled(): boolean {
    return this.status === OrderStatus.PENDING;
  }

  /**
   * Check if order is paid
   */
  isPaid(): boolean {
    return this.status === OrderStatus.PAID;
  }

  /**
   * Check if order is canceled
   */
  isCanceled(): boolean {
    return this.status === OrderStatus.CANCELED;
  }

  /**
   * Mark order as paid (only allowed if currently pending)
   */
  markAsPaid(): OrderStatus {
    if (!this.canBePaid()) {
      throw new Error(
        `Cannot mark order as ${OrderStatus.PAID}. Current status: ${this.status}`,
      );
    }
    return OrderStatus.PAID;
  }

  /**
   * Mark order as canceled (only allowed if currently pending)
   */
  markAsCanceled(): OrderStatus {
    if (!this.canBeCancelled()) {
      throw new Error(
        `Cannot mark order as ${OrderStatus.CANCELED}. Current status: ${this.status}`,
      );
    }
    return OrderStatus.CANCELED;
  }

  /**
   * Create an Order instance from Prisma data
   */
  static fromPrisma(data: PrismaOrder & { items?: PrismaOrderItem[] }): Order {
    return new Order(data);
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      totalAmount: this.totalAmount,
      status: this.status,
      items: this.items?.map((item) => item.toJSON()),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
