import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class CloudStorageService {
  private readonly s3Client: S3Client;
  private readonly AWS_BUCKET: string;
  private readonly AWS_REGION: string;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    this.AWS_BUCKET = this.configService.get<string>('AWS_BUCKET_NAME')!;
    this.AWS_REGION = this.configService.get<string>('AWS_REGION')!;

    if (
      !accessKeyId ||
      !secretAccessKey ||
      !this.AWS_BUCKET ||
      !this.AWS_REGION
    ) {
      throw new Error('Missing AWS S3 credentials or config');
    }

    this.s3Client = new S3Client({
      region: this.AWS_REGION,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadBlob(
    key: string,
    file: Express.Multer.File,
    bucket: string = this.AWS_BUCKET,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3Client.send(command);
    return `https://${bucket}.s3.${this.AWS_REGION}.amazonaws.com/${key}`;
  }

  async generateBlobSasUrl(
    key: string,
    expiresInMinutes = 60,
    bucket: string = this.AWS_BUCKET,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const signedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInMinutes * 60,
    });

    return signedUrl;
  }

  async deleteBlob(urlOrBucket: string, key?: string): Promise<void> {
    let bucket = this.AWS_BUCKET;
    let objectKey = '';

    if (key === undefined) {
      // Delete using full URL
      const url = new URL(urlOrBucket);
      bucket = url.host.split('.')[0]; // e.g. "my-bucket.s3.amazonaws.com"
      objectKey = decodeURIComponent(url.pathname.slice(1));
    } else {
      bucket = urlOrBucket.trim() === '' ? this.AWS_BUCKET : urlOrBucket;
      objectKey = key;
    }

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    });

    await this.s3Client.send(command);
  }
}
