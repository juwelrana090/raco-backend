import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({
    example: true,
    description: 'Indicates if the upload was successful',
  })
  success: boolean;

  @ApiProperty({
    example: 'File uploaded successfully',
    description: 'Success message',
  })
  message: string;

  @ApiProperty({
    example: {
      url: 'https://cdn.example.com/products/uuid-123.jpg',
      key: 'products/uuid-123.jpg',
    },
    description: 'Uploaded file data',
  })
  data: {
    url: string;
    key: string;
  };
}
