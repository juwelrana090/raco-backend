import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class OrderItemResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Order item unique identifier',
  })
  id: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Product ID',
  })
  productId: string;

  @ApiProperty({
    example: 2,
    description: 'Quantity ordered',
  })
  quantity: number;

  @ApiProperty({
    example: 1000,
    description: 'Price at order time in minor units (cents/poisha)',
  })
  price: number;

  @ApiProperty({
    example: 2000,
    description: 'Subtotal in minor units (price * quantity)',
  })
  subtotal: number;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Order item creation date',
  })
  createdAt: Date;
}

export class OrderResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Order unique identifier',
  })
  id: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID who owns this order',
  })
  userId: string;

  @ApiProperty({
    example: 5000,
    description: 'Total amount in minor units (cents/poisha)',
  })
  totalAmount: number;

  @ApiProperty({
    example: 'PENDING',
    description: 'Order status',
    enum: ['PENDING', 'PAID', 'CANCELED'],
  })
  status: OrderStatus;

  @ApiProperty({
    example: [OrderItemResponseDto],
    description: 'Items in this order',
    type: [OrderItemResponseDto],
  })
  items?: OrderItemResponseDto[];

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Order creation date',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Last update date',
  })
  updatedAt: Date;
}
