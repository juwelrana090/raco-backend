import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3Client: S3Client;
  private bucketName!: string;
  private cdnUrl!: string;
  private region!: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_DEFAULT_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const endpoint = this.configService.get<string>('AWS_ENDPOINT');
    const usePathStyle =
      this.configService.get<string>('AWS_USE_PATH_STYLE_ENDPOINT') === 'true';

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Missing required AWS credentials in environment variables',
      );
    }

    this.region = region;

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      endpoint: endpoint || undefined,
      forcePathStyle: usePathStyle,
    });

    this.bucketName = this.configService.get<string>('AWS_BUCKET') ?? '';
    this.cdnUrl = this.configService.get<string>('AWS_CDN_URL') ?? '';

    this.logger.log(
      `S3 Service initialized with bucket: ${this.bucketName}, region: ${region}`,
    );
  }

  async uploadFile(
    file: Buffer,
    fileName: string,
    contentType: string,
    folder = 'uploads',
  ): Promise<{ url: string; key: string }> {
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const key = `products/${folder}/${uniqueFileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
      ACL: 'public-read',
    });

    try {
      await this.s3Client.send(command);

      // Return CDN URL if available, otherwise construct S3 URL
      const baseUrl = this.cdnUrl
        ? this.cdnUrl
        : `https://${this.bucketName}.s3.${this.region}.amazonaws.com`;
      const url = `${baseUrl}/${key}`;

      this.logger.log(`File uploaded successfully: ${key}`);
      return { url, key };
    } catch (error: any) {
      this.logger.error('S3 upload error:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error: any) {
      this.logger.error('S3 delete error:', error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  async uploadProductImage(
    file: Buffer,
    fileName: string,
    productId: string,
  ): Promise<{ url: string; key: string }> {
    const contentType = this.getContentType(fileName);
    return this.uploadFile(file, fileName, contentType, productId);
  }

  private getContentType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Extract S3 key from a full URL
   */
  extractKeyFromUrl(url: string): string {
    if (!url) return '';

    // Remove CDN URL or S3 URL to get the key
    if (this.cdnUrl && url.startsWith(this.cdnUrl)) {
      return url.replace(`${this.cdnUrl}/`, '');
    }

    // Try to extract from S3 URL format
    const match = url.match(
      /https?:\/\/[^\/]+\.amazonaws\.com\/(.+)/,
    );
    return match ? match[1] : '';
  }
}
