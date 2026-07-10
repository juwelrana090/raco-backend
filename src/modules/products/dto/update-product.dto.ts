import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiProperty({
    example: 'TSHIRT-RED-L-001',
    description: 'Unique SKU identifier',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'SKU must be a string' })
  @IsNotEmpty({ message: 'SKU cannot be empty' })
  sku?: string;

  @ApiProperty({
    example: 'Red Cotton T-Shirt - Large',
    description: 'Product name',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name cannot be empty' })
  name?: string;

  @ApiProperty({
    example: 'Comfortable 100% cotton t-shirt in red color, large size',
    description: 'Product description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 2500,
    description: 'Price in minor units (cents/poisha)',
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'Price must be an integer' })
  @Min(0, { message: 'Price cannot be negative' })
  price?: number;

  @ApiProperty({
    example: 100,
    description: 'Current stock quantity',
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'Stock must be an integer' })
  @Min(0, { message: 'Stock cannot be negative' })
  stock?: number;

  @ApiProperty({
    example: 'https://example.com/images/tshirt-red-l.jpg',
    description: 'Product image URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    example: 'uuid-of-category',
    description: 'Category ID',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  categoryId?: string;
}
