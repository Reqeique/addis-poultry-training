import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

function assertR2Config() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    throw new Error('Missing Cloudflare R2 configuration.');
  }
}

function getR2Client() {
  assertR2Config();

  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
}

export function getR2BucketName() {
  assertR2Config();
  return R2_BUCKET_NAME!;
}

export function buildCanonicalVideoUrl(objectKey: string) {
  return `r2://${getR2BucketName()}/${objectKey}`;
}

export async function createSignedUploadUrl({
  objectKey,
  contentType,
  expiresIn = 300,
}: {
  objectKey: string;
  contentType: string;
  expiresIn?: number;
}) {
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: objectKey,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function uploadR2Object({
  objectKey,
  contentType,
  body,
}: {
  objectKey: string;
  contentType: string;
  body: Buffer | Uint8Array;
}) {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: objectKey,
      ContentType: contentType,
      Body: body,
    })
  );
}

export async function createSignedDownloadUrl({
  objectKey,
  expiresIn = 300,
}: {
  objectKey: string;
  expiresIn?: number;
}) {
  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: getR2BucketName(),
    Key: objectKey,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function deleteR2Object(objectKey: string) {
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getR2BucketName(),
      Key: objectKey,
    })
  );
}
