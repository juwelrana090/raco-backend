import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  PaymentProvider,
  PaymentStatus,
  Order as PrismaOrder,
} from '@prisma/client';
import { PaymentProviderStrategy } from '../interfaces/payment-provider-strategy.interface';
import type {
  ProviderPaymentHandle,
  PaymentResult,
  WebhookEvent,
} from '../dto/provider-payment-handle.dto';

/**
 * Stripe Payment Strategy
 *
 * Implements Stripe Payment Intent API with:
 * - Idempotency using payment intent ID
 * - Raw response storage for audit
 * - Signature verification for webhooks
 * - Server-side payment status queries (never trust client)
 */
@Injectable()
export class StripeStrategy implements PaymentProviderStrategy {
  private readonly logger = new Logger(StripeStrategy.name);
  private stripe: Stripe;

  constructor(private config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }

    const apiVersion = this.config.get<string>(
      'STRIPE_API_VERSION',
      '2024-12-18.acacia',
    );
    this.stripe = new Stripe(secretKey, {
      apiVersion: apiVersion as Stripe.LatestApiVersion,
    });
  }

  getProvider(): PaymentProvider {
    return PaymentProvider.STRIPE;
  }

  /**
   * Create a Stripe Payment Intent
   *
   * Idempotent: Uses Stripe's built-in idempotency with order ID as key
   */
  async createPayment(order: PrismaOrder): Promise<ProviderPaymentHandle> {
    try {
      const currency = this.config.get<string>('STRIPE_CURRENCY', 'bdt');

      // Create payment intent with order ID as idempotency key
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: order.totalAmount,
          currency: currency.toLowerCase(),
          metadata: {
            orderId: order.id,
            userId: order.userId,
          },
        },
        {
          idempotencyKey: `payment-${order.id}`, // Ensure idempotency
        },
      );

      this.logger.log(
        `Created Stripe Payment Intent: ${paymentIntent.id} for order: ${order.id}`,
      );

      return {
        provider: PaymentProvider.STRIPE,
        providerPaymentId: paymentIntent.id,
        providerData: {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
        checkoutUrl: undefined, // Stripe uses clientSecret instead
        amount: order.totalAmount,
        status: 'pending',
      };
    } catch (error) {
      this.logger.error(
        `Failed to create Stripe Payment Intent: ${error.message}`,
      );
      throw new Error(`Stripe payment creation failed: ${error.message}`);
    }
  }

  /**
   * Confirm a Stripe Payment Intent
   *
   * Note: In most cases, client confirms payment using Elements.
   * This method is for server-side confirmation if needed.
   */
  async confirmPayment(handle: ProviderPaymentHandle): Promise<PaymentResult> {
    try {
      const { paymentIntentId } = handle.providerData;

      if (!paymentIntentId) {
        throw new BadRequestException('Missing paymentIntentId in handle');
      }

      const paymentIntent =
        await this.stripe.paymentIntents.confirm(paymentIntentId);

      return this.toPaymentResult(paymentIntent);
    } catch (error) {
      this.logger.error(
        `Failed to confirm Stripe Payment Intent: ${error.message}`,
      );
      throw new Error(`Stripe payment confirmation failed: ${error.message}`);
    }
  }

  /**
   * Query payment status from Stripe
   *
   * Used by webhook handlers to verify payment status.
   * NEVER trust client-reported payment status.
   */
  async queryPayment(transactionId: string): Promise<PaymentResult> {
    try {
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(transactionId);
      return this.toPaymentResult(paymentIntent);
    } catch (error) {
      this.logger.error(
        `Failed to query Stripe Payment Intent: ${error.message}`,
      );
      throw new Error(`Stripe payment query failed: ${error.message}`);
    }
  }

  /**
   * Verify and parse Stripe webhook signature
   *
   * Critical: Signature verification prevents fraudulent webhooks
   */
  async verifyWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<WebhookEvent> {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );

      this.logger.log(`Verified Stripe webhook: ${event.type} (${event.id})`);

      // Extract provider transaction ID from event
      let providerTxnId = '';
      if (event.type.startsWith('payment_intent.')) {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        providerTxnId = paymentIntent.id;
      }

      return {
        type: event.type,
        providerTxnId,
        data: event.data.object,
        rawEvent: event,
      };
    } catch (error) {
      this.logger.error(
        `Stripe webhook signature verification failed: ${error.message}`,
      );
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  /**
   * Convert Stripe Payment Intent to PaymentResult
   *
   * Maps Stripe statuses to our internal statuses
   */
  private toPaymentResult(paymentIntent: Stripe.PaymentIntent): PaymentResult {
    let status: 'pending' | 'success' | 'failed' = 'pending';

    if (paymentIntent.status === 'succeeded') {
      status = 'success';
    } else if (
      paymentIntent.status === 'requires_payment_method' ||
      paymentIntent.status === 'requires_confirmation' ||
      paymentIntent.status === 'requires_action' ||
      paymentIntent.status === 'processing' ||
      paymentIntent.status === 'requires_capture'
    ) {
      status = 'pending';
    } else if (paymentIntent.status === 'canceled') {
      status = 'failed';
    }

    return {
      success: status === 'success',
      providerTxnId: paymentIntent.id,
      rawResponse: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        createdAt: new Date(paymentIntent.created * 1000).toISOString(),
      },
      status,
    };
  }
}
