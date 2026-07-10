import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}
