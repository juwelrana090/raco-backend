# raco-backend — S3 + Schema Fix

Three bugs found. Fix in order. Read each file before editing.

---

## Bug 1 — CRITICAL: prisma/schema.prisma missing DATABASE_URL

The datasource block has no url field.
Prisma cannot connect to any database without it.

Find:

```prisma
datasource db {
  provider = "postgresql"
}
```

Replace with:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then run:

```bash
npx prisma generate
```

---

## Bug 2 — S3 service hardcoded fallback URL

File: src/modules/s3/s3.service.ts

The uploadFile method has a hardcoded fallback URL:

```typescript
const baseUrl = this.cdnUrl
  ? this.cdnUrl
  : `https://sgp1.digitaloceanspaces.com`; // ← WRONG: hardcoded
```

This ignores the AWS_ENDPOINT and AWS_BUCKET env vars entirely when
CDN URL is not set. It also builds the wrong file URL.

Fix — store endpoint as a class field and use it in the URL builder.

Replace the full file with this corrected version:

```typescript
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { S3Client } from '@aws-sdk/client-s3';

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
  private bucketName: string;
  private cdnUrl: string;
  private endpoint: string;
  private region: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // Read all env vars — strip surrounding quotes if present (Plesk .env quirk)
    const stripQuotes = (val: string | undefined) =>
      val?.replace(/^["']|["']$/g, '') ?? '';

    this.region =
      stripQuotes(this.configService.get<string>('AWS_DEFAULT_REGION')) ||
      'sgp1';
    this.endpoint =
      stripQuotes(this.configService.get<string>('AWS_ENDPOINT')) ||
      'https://sgp1.digitaloceanspaces.com';
    this.bucketName =
      stripQuotes(this.configService.get<string>('AWS_BUCKET')) || '';
    this.cdnUrl =
      stripQuotes(this.configService.get<string>('AWS_CDN_URL')) || '';

    const accessKeyId = stripQuotes(
      this.configService.get<string>('AWS_ACCESS_KEY_ID'),
    );
    const secretAccessKey = stripQuotes(
      this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
    );
    const usePathStyle =
      stripQuotes(
        this.configService.get<string>('AWS_USE_PATH_STYLE_ENDPOINT'),
      ) === 'true';

    if (!this.region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Missing required AWS credentials in environment variables',
      );
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: { accessKeyId, secretAccessKey },
      endpoint: this.endpoint || undefined,
      forcePathStyle: usePathStyle,
    });

    this.logger.log(
      `S3Service initialized — bucket: ${this.bucketName}, region: ${this.region}, endpoint: ${this.endpoint}`,
    );
  }

  /**
   * Upload a file to S3 and save a FileManager record.
   *
   * Key pattern: raco/{fileUse}/{uuid}.{ext}
   * 'raco/' prefix avoids conflict with madrasa files in the same bucket.
   *
   * URL resolution:
   *   If AWS_CDN_URL is set  → use CDN URL (preferred, faster)
   *   Otherwise              → construct from endpoint + bucket
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

      // Build public URL — CDN preferred, falls back to endpoint + bucket path
      const baseUrl = this.cdnUrl
        ? this.cdnUrl
        : `${this.endpoint}/${this.bucketName}`;

      const fileUrl = `${baseUrl}/${key}`;

      const record = await this.prisma.fileManager.create({
        data: {
          fileName: uniqueFileName,
          fileType: 'image',
          fileFormat,
          filePath: key, // S3 key — always use this for deletion
          fileUse,
          fileBucket: this.bucketName,
          fileUrl,
          fileCdnUrl: fileUrl,
        },
      });

      this.logger.log(`File uploaded: ${key} (FileManager id=${record.id})`);

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
   * Delete a file from S3 by its S3 key (filePath).
   * Never extract the key from a URL — always use the stored filePath.
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

  /** Upload product image. fileUse = 'product-image' */
  async uploadProductImage(
    file: Buffer,
    fileName: string,
  ): Promise<FileManagerRecord> {
    return this.uploadFile(
      file,
      fileName,
      this.getContentType(fileName),
      'product-image',
    );
  }

  /** Upload category image. fileUse = 'category-image' */
  async uploadCategoryImage(
    file: Buffer,
    fileName: string,
  ): Promise<FileManagerRecord> {
    return this.uploadFile(
      file,
      fileName,
      this.getContentType(fileName),
      'category-image',
    );
  }

  /**
   * Delete a FileManager record + its S3 file.
   * This is the ONLY correct deletion path — never extract key from URL.
   */
  async deleteByFileManagerId(fileManagerId: number): Promise<void> {
    const record = await this.prisma.fileManager.findUnique({
      where: { id: fileManagerId },
    });

    if (!record) {
      this.logger.warn(`FileManager record not found: id=${fileManagerId}`);
      return;
    }

    await this.deleteFile(record.filePath);
    await this.prisma.fileManager.delete({ where: { id: fileManagerId } });

    this.logger.log(`FileManager record deleted: id=${fileManagerId}`);
  }

  private getContentType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return map[ext ?? ''] ?? 'application/octet-stream';
  }
}
```

---

## Bug 3 — .env AWS values have quotes (breaks ConfigService)

Open .env on the server and remove ALL quotes from these values:

```
# WRONG (ConfigService reads the quotes as part of the value):
AWS_BUCKET="madrasah.dev"
AWS_DEFAULT_REGION="sgp1"
AWS_ENDPOINT="https://sgp1.digitaloceanspaces.com"
AWS_CDN_URL="https://cdn.madrasah.dev"
AWS_USE_PATH_STYLE_ENDPOINT="false"
BKASH_VERSION="v1.2.0-beta"

# CORRECT (no quotes):
AWS_BUCKET=madrasah.dev
AWS_DEFAULT_REGION=sgp1
AWS_ENDPOINT=https://sgp1.digitaloceanspaces.com
AWS_CDN_URL=https://cdn.madrasah.dev
AWS_USE_PATH_STYLE_ENDPOINT=false
BKASH_VERSION=v1.2.0-beta
```

Note: The S3Service.ts fix above also strips quotes via stripQuotes() as
a defensive fallback — but always fix the .env source too.

---

## Verify

```bash
pnpm dev:watch
```

Expected startup log:

```
[S3Service] S3Service initialized — bucket: madrasah.dev, region: sgp1, endpoint: https://sgp1.digitaloceanspaces.com
```

Test image upload:

```bash
curl -X POST http://localhost:4000/api/v1/products/<ID>/image \
  -H "Authorization: Bearer <TOKEN>" \
  -F "image=@test.jpg"
```

Expected response:

```json
{
  "success": true,
  "data": {
    "imageUrl": "https://cdn.madrasah.dev/raco/product-image/uuid.jpg"
  }
}
```

Verify FileManager record:

```sql
SELECT * FROM file_manager ORDER BY created_at DESC LIMIT 3;
```

After completing: run /r-done
Log to .claude/memory/gotchas.md:

- S3 fallback URL: use `${endpoint}/${bucket}` NOT hardcoded domain
- Store endpoint as class field in S3Service constructor
- .env values must NOT have surrounding quotes — they break ConfigService
- stripQuotes() in S3Service is a defensive fallback, always fix .env too
