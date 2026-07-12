import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Category image CDN URL',
    example: 'https://cdn.madrasah.dev/raco/category-image/uuid.jpg',
  })
  imageUrl?: string | null;

  @ApiProperty({ required: false })
  parentId?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false, type: [CategoryResponseDto] })
  children?: CategoryResponseDto[];

  @ApiProperty({ required: false, type: Object })
  products?: any[];
}
