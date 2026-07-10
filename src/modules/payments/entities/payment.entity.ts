import { Payment as PrismaPayment, PaymentStatus, PaymentProvider } from '@prisma/client';

export class Payment implements PrismaPayment {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  providerTxnId: string | null;
  amount: number;
  status: PaymentStatus;
  rawResponse: string | null;
  metadata: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: PrismaPayment) {
    this.id = data.id;
    this.orderId = data.orderId;
    this.provider = data.provider;
    this.providerTxnId = data.providerTxnId;
    this.amount = data.amount;
    this.status = data.status;
    this.rawResponse = data.rawResponse;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Create a Payment instance from Prisma data
   */
  static fromPrisma(data: PrismaPayment): Payment {
    return new Payment(data);
  }

  /**
   * Check if payment is pending
   */
  isPending(): boolean {
    return this.status === PaymentStatus.PENDING;
  }

  /**
   * Check if payment was successful
   */
  isSuccessful(): boolean {
    return this.status === PaymentStatus.SUCCESS;
  }

  /**
   * Check if payment failed
   */
  isFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }

  /**
   * Check if payment is refunded
   */
  isRefunded(): boolean {
    return this.status === PaymentStatus.REFUNDED;
  }

  /**
   * Get parsed raw response
   */
  getParsedRawResponse(): Record<string, any> | null {
    if (!this.rawResponse) return null;
    try {
      return JSON.parse(this.rawResponse);
    } catch {
      return null;
    }
  }

  /**
   * Get parsed metadata
   */
  getParsedMetadata(): Record<string, any> | null {
    if (!this.metadata) return null;
    try {
      return JSON.parse(this.metadata);
    } catch {
      return null;
    }
  }

  /**
   * Convert to JSON (sensitive data handling)
   */
  toJSON() {
    return {
      id: this.id,
      orderId: this.orderId,
      provider: this.provider,
      providerTxnId: this.providerTxnId,
      amount: this.amount,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
