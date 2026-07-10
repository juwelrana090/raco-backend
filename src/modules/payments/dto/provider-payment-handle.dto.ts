import { ApiProperty } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';

export interface ProviderPaymentHandle {
  provider: PaymentProvider;
  providerPaymentId: string;
  providerData: Record<string, any>;
  checkoutUrl?: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
}

export interface PaymentResult {
  success: boolean;
  providerTxnId: string | null;
  rawResponse: Record<string, any>;
  status: 'pending' | 'success' | 'failed';
  errorMessage?: string;
}

export interface WebhookEvent {
  type: string;
  providerTxnId: string;
  data: Record<string, any>;
  rawEvent: Record<string, any>;
}
