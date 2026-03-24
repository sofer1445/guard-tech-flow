import { Client } from 'minio';

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT ?? '9000', 10);
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY ?? 'admin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY ?? 'password123';

export const REPORTS_BUCKET = 'reports';

export const minioClient = new Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: false,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

const publicReadPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: { AWS: ['*'] },
      Action: ['s3:GetObject'],
      Resource: [`arn:aws:s3:::${REPORTS_BUCKET}/*`],
    },
  ],
};

export const setupMinio = async () => {
  const exists = await minioClient.bucketExists(REPORTS_BUCKET);

  if (!exists) {
    await minioClient.makeBucket(REPORTS_BUCKET);
  }

  await minioClient.setBucketPolicy(REPORTS_BUCKET, JSON.stringify(publicReadPolicy));
};
