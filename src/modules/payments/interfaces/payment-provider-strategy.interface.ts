import { PaymentProvider, Order as PrismaOrder } from '@prisma/client';
import type {
  ProviderPaymentHandle,
  PaymentResult,
  WebhookEvent,
} from '../dto/provider-payment-handle.dto';

/**
 * Payment Provider Strategy Interface
 *
 * All payment providers must implement this interface.
 * PaymentService depends on this interface, never concrete implementations.
 *
 * Adding a new provider = one new class + one registry entry (zero changes to OrderService).
 */
export interface PaymentProviderStrategy {
  /**
   * Get the provider identifier
   */
  getProvider(): PaymentProvider;

  /**
   * Create a payment with the provider
   *
   * @param order - Order to create payment for
   * @returns ProviderPaymentHandle with client-facing data (checkout URL, client secret, etc.)
   * @throws Error if payment creation fails
   */
  createPayment(order: PrismaOrder): Promise<ProviderPaymentHandle>;

  /**
   * Confirm a payment with the provider
   *
   * @param handle - Provider payment handle from createPayment
   * @returns Payment result with status and provider transaction ID
   * @throws Error if payment confirmation fails
   */
  confirmPayment(handle: ProviderPaymentHandle): Promise<PaymentResult>;

  /**
   * Query payment status from provider
   *
   * Used by webhook handlers to verify payment status (don't trust client-reported status).
   *
   * @param transactionId - Provider transaction ID
   * @returns Payment result with current status from provider
   * @throws Error if query fails
   */
  queryPayment(transactionId: string): Promise<PaymentResult>;

  /**
   * Verify and parse webhook/callback signature
   *
   * @param rawBody - Raw request body (Buffer)
   * @param signature - Request signature from provider
   * @returns Parsed webhook event
   * @throws Error if signature verification fails
   */
  verifyWebhook(rawBody: Buffer, signature: string): Promise<WebhookEvent>;
}
