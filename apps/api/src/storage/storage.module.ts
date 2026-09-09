import { Global, Inject, Injectable, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const STORAGE_CLIENT = 'STORAGE_CLIENT';
export const STORAGE_SERVICE = 'STORAGE_SERVICE';

/**
 * S3-compatible storage abstraction (ADR-010 / TASK 03 §22).
 * Dev target: MinIO. Production target: S3-compatible object storage.
 * Modules never touch raw paths — they use this service.
 * Buckets are never exposed publicly; downloads use signed/authenticated URLs.
 */
@Injectable()
export class StorageService {
  constructor(@Inject(STORAGE_CLIENT) private readonly s3: S3Client) {}

  async ensureBucket(bucket: string): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: bucket }));
    }
  }

  async upload(
    bucket: string,
    key: string,
    body: Buffer | Uint8Array,
    contentType?: string,
  ) {
    return this.s3.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async download(bucket: string, key: string) {
    return this.s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  }

  async delete(bucket: string, key: string) {
    return this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async list(bucket: string, prefix?: string) {
    return this.s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
  }

  async presignedGet(bucket: string, key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn,
    });
  }
}

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const endpoint = config.get<string>('S3_ENDPOINT') ?? 'http://localhost:9000';
        const region = config.get<string>('S3_REGION') ?? 'us-east-1';
        const accessKey = config.get<string>('S3_ACCESS_KEY');
        const secretKey = config.get<string>('S3_SECRET_KEY');
        return new S3Client({
          region,
          endpoint,
          forcePathStyle: true,
          credentials: accessKey && secretKey ? { accessKeyId: accessKey, secretAccessKey: secretKey } : undefined,
        });
      },
    },
    StorageService,
  ],
  exports: [STORAGE_CLIENT, StorageService],
})
export class StorageModule {}
