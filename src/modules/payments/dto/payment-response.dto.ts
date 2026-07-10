import { PaymentStatus, PaymentProvider } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({ description: 'Payment ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Order ID', example: 'uuid' })
  orderId: string;

  @ApiProperty({
    description: 'Payment provider',
    enum: PaymentProvider,
    example: PaymentProvider.STRIPE,
  })
  provider: PaymentProvider;

  @ApiProperty({
    description: 'Provider transaction ID',
    example: 'pi_1234567890',
    required: false,
  })
  providerTxnId?: string;

  @ApiProperty({
    description: 'Amount in minor units (cents/poisha)',
    example: 10000,
  })
  amount: number;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.SUCCESS,
  })
  status: PaymentStatus;

  @ApiProperty({ description: 'Raw provider response (JSON)', required: false })
  rawResponse?: any;

  @ApiProperty({
    description: 'Payment creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Payment update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Client secret for Stripe payment confirmation',
    required: false,
  })
  clientSecret?: string;

  @ApiProperty({ description: 'bKash checkout URL', required: false })
  bkashURL?: string;
}

export class CreatePaymentResponseDto {
  @ApiProperty({ description: 'Success flag', example: true })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Payment created successfully',
  })
  message: string;

  @ApiProperty({ description: 'Payment details', type: PaymentResponseDto })
  data: PaymentResponseDto;
}
