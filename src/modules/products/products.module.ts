import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';
import { CategoriesModule } from '../categories/categories.module';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    CategoriesModule,
    S3Module,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
