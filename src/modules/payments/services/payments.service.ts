import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { Payment } from '../entities/payment.entity';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { ProviderPaymentHandle, PaymentResult, WebhookEvent } from '../dto/provider-payment-handle.dto';
import { ProviderRegistry } from '../strategies/provider-registry';

/**
 * Payment Service
 *
 * Implements strategy pattern for payment providers:
 * - Depends on PaymentProviderStrategy interface (never concrete implementations)
 * - Adding new provider = one class + registry entry (zero changes to OrderService)
 * - Idempotent webhook handlers
 * - Raw response storage for audit
 * - Never trusts client-reported payment status
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private registry: ProviderRegistry,
  ) {}

  /**
   * Create a payment for an order
   *
   * @param dto - Create payment request
   * @param userId - User ID creating the payment
   * @returns Payment handle with client-facing data
   */
  async createPayment(dto: CreatePaymentDto, userId: string): Promise<Payment> {
    const { orderId, provider } = dto;

    // Verify order exists and belongs to user
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if payment already exists for this order and provider
    const existingPayment = await this.prisma.payment.findUnique({
      where: {
        orderId_provider: {
          orderId,
          provider,
        },
      },
    });

    if (existingPayment) {
      throw new ConflictException(`Payment already exists for this order with ${provider} provider`);
    }

    // Get strategy and create payment
    const strategy = this.registry.getStrategy(provider);
    const handle = await strategy.createPayment(order);

    // Store payment in database
    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        provider,
        providerTxnId: null, // Will be set after confirmation
        amount: order.totalAmount,
        status: PaymentStatus.PENDING,
        rawResponse: JSON.stringify(handle.providerData),
        metadata: JSON.stringify({ userId }),
      },
    });

    this.logger.log(`Created payment: ${payment.id} for order: ${orderId} with provider: ${provider}`);

    return Payment.fromPrisma(payment);
  }

  /**
   * Process webhook from payment provider
   *
   * CRITICAL: Idempotent implementation
   * - Provider retries must not double-apply status changes
   * - Database transactions ensure atomicity
   * - Raw webhook events stored for audit
   *
   * @param provider - Payment provider
   * @param rawBody - Raw request body
   * @param signature - Request signature
   */
  async processWebhook(provider: PaymentProvider, rawBody: Buffer, signature: string): Promise<void> {
    this.logger.log(`Processing webhook for provider: ${provider}`);

    // Verify webhook signature
    const strategy = this.registry.getStrategy(provider);
    const event = await strategy.verifyWebhook(rawBody, signature);

    // Extract provider transaction ID
    const { providerTxnId } = event;

    if (!providerTxnId) {
      this.logger.warn(`Webhook event missing providerTxnId: ${event.type}`);
      return;
    }

    // IDEMPOTENCY: Check if payment already processed
    const existingPayment = await this.prisma.payment.findUnique({
      where: { providerTxnId },
    });

    if (!existingPayment) {
      this.logger.warn(`Payment not found for providerTxnId: ${providerTxnId}`);
      return;
    }

    // IDEMPOTENCY: Skip if already in final state (success/failed)
    if (existingPayment.status === PaymentStatus.SUCCESS || existingPayment.status === PaymentStatus.FAILED) {
      this.logger.log(`Payment ${existingPayment.id} already in final state: ${existingPayment.status}. Skipping webhook processing.`);
      return;
    }

    // Query payment status from provider (NEVER trust webhook)
    const paymentResult = await strategy.queryPayment(providerTxnId);

    // Start database transaction
    await this.prisma.$transaction(async (tx) => {
      // Update payment status
      const newStatus = this.mapPaymentStatus(paymentResult.status);

      await tx.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: newStatus,
          rawResponse: JSON.stringify(paymentResult.rawResponse),
        },
      });

      // If payment successful, mark order as paid
      if (newStatus === PaymentStatus.SUCCESS) {
        await tx.order.update({
          where: { id: existingPayment.orderId },
          data: { status: 'PAID' }, // Prisma enum
        });

        this.logger.log(`Payment ${existingPayment.id} succeeded. Order ${existingPayment.orderId} marked as PAID.`);
      }

      // If payment failed, mark order as canceled
      if (newStatus === PaymentStatus.FAILED) {
        await tx.order.update({
          where: { id: existingPayment.orderId },
          data: { status: 'CANCELED' }, // Prisma enum
        });

        this.logger.log(`Payment ${existingPayment.id} failed. Order ${existingPayment.orderId} marked as CANCELED.`);
      }
    });

    this.logger.log(`Webhook processed successfully for payment: ${existingPayment.id}`);
  }

  /**
   * Get payment by ID
   *
   * @param paymentId - Payment ID
   * @returns Payment details
   */
  async getPayment(paymentId: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return Payment.fromPrisma(payment);
  }

  /**
   * Get payments for an order
   *
   * @param orderId - Order ID
   * @returns List of payments
   */
  async getPaymentsForOrder(orderId: string): Promise<Payment[]> {
    const payments = await this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((payment) => Payment.fromPrisma(payment));
  }

  /**
   * Map provider payment status to internal PaymentStatus
   */
  private mapPaymentStatus(status: 'pending' | 'success' | 'failed'): PaymentStatus {
    switch (status) {
      case 'success':
        return PaymentStatus.SUCCESS;
      case 'failed':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.PENDING;
    }
  }
}
