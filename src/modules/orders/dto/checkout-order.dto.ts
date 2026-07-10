import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { PaymentProvider } from '@prisma/client';

export class CheckoutOrderDto {
  @ApiProperty({
    example: 'STRIPE',
    description: 'Payment provider to use',
    enum: ['STRIPE', 'BKASH'],
  })
  @IsEnum(PaymentProvider, { message: 'Invalid payment provider' })
  @IsNotEmpty({ message: 'Payment provider is required' })
  provider: PaymentProvider;
}
