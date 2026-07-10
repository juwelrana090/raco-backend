import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus, PaymentProvider } from '@prisma/client';

export class PaymentResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Payment unique identifier',
  })
  id: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Order ID',
  })
  orderId: string;

  @ApiProperty({
    example: 'STRIPE',
    description: 'Payment provider used',
    enum: ['STRIPE', 'BKASH'],
  })
  provider: PaymentProvider;

  @ApiProperty({
    example: 'pi_1234567890',
    description: 'Provider transaction ID',
    required: false,
  })
  providerTxnId?: string;

  @ApiProperty({
    example: 5000,
    description: 'Payment amount in minor units (cents/poisha)',
  })
  amount: number;

  @ApiProperty({
    example: 'PENDING',
    description: 'Payment status',
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
  })
  status: PaymentStatus;

  @ApiProperty({
    example: '{"client_secret": "pi_123..."}',
    description: 'Raw response from payment provider',
    required: false,
  })
  rawResponse?: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Payment creation date',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Last update date',
  })
  updatedAt: Date;
}
