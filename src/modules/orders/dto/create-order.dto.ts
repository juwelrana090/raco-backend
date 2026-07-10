import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID, Min, ArrayNotEmpty } from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Product ID to order',
  })
  @IsUUID('4', { message: 'Product ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;

  @ApiProperty({
    example: 2,
    description: 'Quantity to order',
    minimum: 1,
  })
  @IsNotEmpty({ message: 'Quantity is required' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({
    example: [CreateOrderItemDto],
    description: 'Array of items to order',
    type: [CreateOrderItemDto],
  })
  @IsArray({ message: 'Items must be an array' })
  @ArrayNotEmpty({ message: 'At least one item is required' })
  items: CreateOrderItemDto[];
}
