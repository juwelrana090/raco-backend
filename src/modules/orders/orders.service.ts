import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { CheckoutOrderDto } from './dto/checkout-order.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from '../payments/services/payments.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private paymentsService: PaymentsService,
  ) {}

  /**
   * Create a new order from cart items
   *
   * Algorithm:
   * 1. Validate all products exist and have sufficient stock (read-only check)
   * 2. Create order with PENDING status
   * 3. Create order items with price snapshots
   * 4. Calculate total amount deterministically: sum(price * quantity)
   *
   * IMPORTANT: No stock reduction at this stage - only after successful payment
   */
  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    const { items } = createOrderDto;

    // Step 1: Fetch all products and validate
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    // Step 2: Validate stock availability (read-only check - no reduction yet)
    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }
      if (product.stock < item.quantity) {
        throw new ConflictException(
          `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
        );
      }
    }

    // Step 3: Create order items with price snapshots
    const orderItemsData = items.map((item) => {
      const product = productMap.get(item.productId)!;
      return OrderItem.createForOrder(
        item.productId,
        item.quantity,
        product.price,
      );
    });

    // Step 4: Calculate total amount deterministically
    // subtotal = price * quantity (integer arithmetic)
    // total = sum(all subtotals)
    const totalAmount = orderItemsData.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);

    // Step 5: Create order with items in a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          totalAmount,
          status: OrderStatus.PENDING,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      return newOrder;
    });

    return {
      success: true,
      message: 'Order created successfully',
      data: Order.fromPrisma(order).toJSON(),
    };
  }

  /**
   * Get order by ID (only if belongs to current user)
   */
  async getOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Enforce ownership: users can only read their own orders
    if (order.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this order',
      );
    }

    return {
      success: true,
      message: 'Order retrieved successfully',
      data: Order.fromPrisma(order).toJSON(),
    };
  }

  /**
   * Get all orders for current user
   */
  async getUserOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Orders retrieved successfully',
      data: orders.map((order) => Order.fromPrisma(order).toJSON()),
    };
  }

  /**
   * Initiate checkout process for an order
   *
   * Flow:
   * 1. Validate order exists and belongs to user
   * 2. Check order is in PENDING status
   * 3. Delegate to PaymentsService which calls the provider strategy
   *    (creates Stripe PaymentIntent or bKash checkout URL)
   * 4. Return payment details for client to complete payment
   */
  async checkoutOrder(
    userId: string,
    orderId: string,
    checkoutDto: CheckoutOrderDto,
  ) {
    const { provider } = checkoutDto;

    // Fetch order and validate
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this order',
      );
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Order cannot be checked out. Current status: ${order.status}`,
      );
    }

    // Delegate to PaymentsService — this calls the provider strategy
    // (creates Stripe PaymentIntent or bKash checkout URL)
    return this.paymentsService.createPayment({ orderId, provider }, userId);
  }

  /**
   * Cancel an order (only if pending)
   *
   * Rules:
   * - Only PENDING orders can be cancelled
   * - PAID orders cannot be cancelled (would require refund flow)
   * - CANCELED orders cannot be cancelled again
   * - Stock is never reduced for canceled orders (already handled by no reduction at creation)
   */
  async cancelOrder(userId: string, orderId: string) {
    // Fetch order
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Enforce ownership
    if (order.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to cancel this order',
      );
    }

    // Create order entity to validate state transition
    const orderEntity = Order.fromPrisma(order);

    // Check if order can be cancelled
    if (!orderEntity.canBeCancelled()) {
      throw new BadRequestException(
        `Order cannot be cancelled. Current status: ${order.status}`,
      );
    }

    // Update order status to CANCELED
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELED },
      include: { items: true },
    });

    return {
      success: true,
      message: 'Order cancelled successfully',
      data: Order.fromPrisma(updatedOrder).toJSON(),
    };
  }

  /**
   * Process successful payment (called by payment webhook handler)
   *
   * CRITICAL: This is where stock reduction happens
   *
   * Algorithm:
   * 1. Verify payment exists and is PENDING
   * 2. Start database transaction
   * 3. Mark order as PAID
   * 4. For each order item, perform conditional stock update:
   *    UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :qty
   * 5. If any stock update fails (affects 0 rows), rollback entire transaction
   * 6. Mark payment as SUCCESS
   * 7. Commit transaction
   *
   * This ensures:
   * - Stock is only reduced after successful payment
   * - Concurrent orders cannot oversell (conditional update with row lock)
   * - Payment confirmation is atomic (all or nothing)
   */
  async processSuccessfulPayment(paymentId: string, providerTxnId?: string) {
    return await this.prisma.$transaction(async (tx) => {
      // Fetch payment with order and items
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          order: {
            include: {
              items: true,
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException(
          `Payment is not in PENDING status. Current status: ${payment.status}`,
        );
      }

      if (payment.order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          `Order is not in PENDING status. Current status: ${payment.order.status}`,
        );
      }

      // Perform conditional stock updates for each item
      // This prevents overselling by concurrent orders
      for (const item of payment.order.items) {
        const result = await tx.product.updateMany({
          where: {
            id: item.productId,
            stock: {
              gte: item.quantity, // Conditional: only update if stock >= quantity
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        // If no rows were affected, stock was insufficient
        if (result.count === 0) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          throw new ConflictException(
            `Insufficient stock for product ${product?.name}. ` +
              `Concurrent order may have purchased the last items. ` +
              `Payment has been rolled back.`,
          );
        }
      }

      // Mark order as PAID
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PAID },
      });

      // Mark payment as SUCCESS
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.SUCCESS,
          providerTxnId,
        },
      });

      return {
        success: true,
        message: 'Payment processed successfully',
        data: {
          paymentId: updatedPayment.id,
          orderId: payment.orderId,
          status: updatedPayment.status,
        },
      };
    });
  }

  /**
   * Process failed payment (called by payment webhook handler)
   */
  async processFailedPayment(paymentId: string, reason?: string) {
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        metadata: reason || 'Payment failed',
      },
      include: {
        order: true,
      },
    });

    return {
      success: true,
      message: 'Payment marked as failed',
      data: {
        paymentId: payment.id,
        orderId: payment.orderId,
        status: payment.status,
      },
    };
  }
}
