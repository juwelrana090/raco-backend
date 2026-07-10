import { ApiProperty } from '@nestjs/swagger';

export class ProductImageResponseDto {
  @ApiProperty({
    example: true,
    description: 'Indicates if the operation was successful',
  })
  success: boolean;

  @ApiProperty({
    example: 'Product image uploaded successfully',
    description: 'Success message',
  })
  message: string;

  @ApiProperty({
    example: {
      imageUrl: 'https://cdn.example.com/products/uuid-123/image-uuid.jpg',
    },
    description: 'Product image data',
  })
  data: {
    imageUrl: string;
  };
}
