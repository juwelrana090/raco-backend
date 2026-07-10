import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface FileManagerRecord {
  id: number;
  fileUrl: string;
  fileCdnUrl: string;
  filePath: string;
  fileName: string;
  fileType: string;
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3Client: S3Client;
  private bucketName!: string;
  private cdnUrl!: string;
  private region!: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
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
      credentials: { accessKeyId, secretAccessKey },
      endpoint: endpoint || undefined,
      forcePathStyle: usePathStyle,
    });

    this.bucketName = this.configService.get<string>('AWS_BUCKET') ?? '';
    this.cdnUrl = this.configService.get<string>('AWS_CDN_URL') ?? '';

    this.logger.log(
      `S3Service initialized — bucket: ${this.bucketName}, region: ${region}`,
    );
  }

  /**
   * Upload a file to S3 and save a FileManager record.
   * Returns the full FileManager DB record.
   *
   * Key pattern: raco/{folder}/{uuid}.{ext}
   * Using 'raco/' prefix avoids conflicts with madrasa project
   * files in the same DigitalOcean Spaces bucket.
   */
  async uploadFile(
    file: Buffer,
    fileName: string,
    contentType: string,
    fileUse: string,
  ): Promise<FileManagerRecord> {
    const fileFormat = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
    const uniqueFileName = `${uuidv4()}.${fileFormat}`;
    const key = `raco/${fileUse}/${uniqueFileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
      ACL: 'public-read',
    });

    try {
      await this.s3Client.send(command);

      const baseUrl = this.cdnUrl
        ? this.cdnUrl
        : `https://${this.bucketName}.s3.${this.region}.amazonaws.com`;

      const fileUrl = `${baseUrl}/${key}`;

      // Save file record to database
      const record = await this.prisma.fileManager.create({
        data: {
          fileName: uniqueFileName,
          fileType: 'image',
          fileFormat,
          filePath: key, // S3 key — use this for deletion, not URL
          fileUse, // context e.g. 'product-image'
          fileBucket: this.bucketName,
          fileUrl,
          fileCdnUrl: fileUrl,
        },
      });

      this.logger.log(`File uploaded and recorded: ${key} (id=${record.id})`);

      return {
        id: record.id,
        fileUrl: record.fileUrl ?? fileUrl,
        fileCdnUrl: record.fileCdnUrl ?? fileUrl,
        filePath: record.filePath,
        fileName: record.fileName,
        fileType: record.fileType,
      };
    } catch (error: any) {
      this.logger.error('S3 upload error:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  /**
   * Delete a file from S3 using the stored S3 key (filePath).
   * Never extract the key from the URL — always use filePath from FileManager.
   */
  async deleteFile(filePath: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`File deleted from S3: ${filePath}`);
    } catch (error: any) {
      this.logger.error('S3 delete error:', error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  /**
   * Upload a product image.
   * fileUse = 'product-image' so it appears in the FileManager history
   * under that context.
   */
  async uploadProductImage(
    file: Buffer,
    fileName: string,
  ): Promise<FileManagerRecord> {
    const contentType = this.getContentType(fileName);
    return this.uploadFile(file, fileName, contentType, 'product-image');
  }

  /**
   * Delete a FileManager record and its S3 file.
   * This is the correct way to delete — always go through FileManager.
   */
  async deleteByFileManagerId(fileManagerId: number): Promise<void> {
    const record = await this.prisma.fileManager.findUnique({
      where: { id: fileManagerId },
    });

    if (!record) {
      this.logger.warn(`FileManager record not found: id=${fileManagerId}`);
      return;
    }

    // Delete from S3 using filePath (never from URL)
    await this.deleteFile(record.filePath);

    // Delete DB record
    await this.prisma.fileManager.delete({
      where: { id: fileManagerId },
    });

    this.logger.log(`FileManager record deleted: id=${fileManagerId}`);
  }

  private getContentType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
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
}
