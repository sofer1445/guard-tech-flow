import type { FastifyInstance } from 'fastify';

import { minioClient, REPORTS_BUCKET } from '../lib/minio.js';
import { DamageReportModel } from '../models/DamageReport.js';

type StoredObject = {
  name: string;
  lastModified?: Date;
};

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isCleanupEnabled = () => (process.env.UPLOAD_CLEANUP_ENABLED ?? 'true').toLowerCase() !== 'false';

const extractFileNameFromPhotoUrl = (photoUrl: string): string | null => {
  if (!photoUrl) {
    return null;
  }

  if (!photoUrl.includes('/')) {
    return decodeURIComponent(photoUrl.trim());
  }

  if (photoUrl.startsWith('/api/upload/')) {
    return decodeURIComponent(photoUrl.replace('/api/upload/', '').trim());
  }

  if (photoUrl.includes('/reports/')) {
    return decodeURIComponent(photoUrl.slice(photoUrl.indexOf('/reports/') + '/reports/'.length).trim());
  }

  try {
    const parsed = new URL(photoUrl);
    const marker = '/api/upload/';
    const index = parsed.pathname.indexOf(marker);

    if (index !== -1) {
      return decodeURIComponent(parsed.pathname.slice(index + marker.length).trim());
    }

    const legacyMarker = '/reports/';
    const legacyIndex = parsed.pathname.indexOf(legacyMarker);

    if (legacyIndex !== -1) {
      return decodeURIComponent(parsed.pathname.slice(legacyIndex + legacyMarker.length).trim());
    }

    return null;
  } catch {
    return null;
  }
};

const listAllObjects = async (): Promise<StoredObject[]> => {
  const stream = minioClient.listObjectsV2(REPORTS_BUCKET, '', true, '');

  return new Promise((resolve, reject) => {
    const items: StoredObject[] = [];

    stream.on('data', (obj: { name?: string; lastModified?: Date }) => {
      if (obj.name) {
        items.push({ name: obj.name, lastModified: obj.lastModified });
      }
    });

    stream.on('error', reject);
    stream.on('end', () => resolve(items));
  });
};

const collectReferencedFiles = async (): Promise<Set<string>> => {
  const photoUrls = await DamageReportModel.distinct('photoUrl', {
    photoUrl: { $exists: true, $type: 'string', $ne: '' },
  });

  const names = photoUrls
    .map((value) => (typeof value === 'string' ? extractFileNameFromPhotoUrl(value) : null))
    .filter((value): value is string => Boolean(value));

  return new Set(names);
};

const cleanupUploadedFiles = async (fastify: FastifyInstance) => {
  const cleanupIntervalMinutes = parsePositiveInt(process.env.UPLOAD_CLEANUP_INTERVAL_MINUTES, 60);
  const orphanGraceHours = parsePositiveInt(process.env.UPLOAD_ORPHAN_GRACE_HOURS, 24);
  const maxUnreferencedAgeDays = parsePositiveInt(process.env.UPLOAD_MAX_UNREFERENCED_AGE_DAYS, 30);

  const now = Date.now();
  const orphanCutoff = now - orphanGraceHours * 60 * 60 * 1000;
  const maxUnreferencedAgeCutoff = now - maxUnreferencedAgeDays * 24 * 60 * 60 * 1000;

  const [allObjects, referencedFileNames] = await Promise.all([
    listAllObjects(),
    collectReferencedFiles(),
  ]);

  const filesToDelete = allObjects.filter((obj) => {
    if (referencedFileNames.has(obj.name)) {
      return false;
    }

    const modifiedAt = obj.lastModified?.getTime() ?? 0;
    return modifiedAt <= orphanCutoff || modifiedAt <= maxUnreferencedAgeCutoff;
  });

  if (filesToDelete.length === 0) {
    fastify.log.info(
      {
        scanned: allObjects.length,
        referenced: referencedFileNames.size,
        intervalMinutes: cleanupIntervalMinutes,
      },
      'Upload cleanup finished with no deletions',
    );
    return;
  }

  const results = await Promise.allSettled(
    filesToDelete.map(async (file) => {
      await minioClient.removeObject(REPORTS_BUCKET, file.name);
      return file.name;
    }),
  );

  const deleted = results.filter((result) => result.status === 'fulfilled').length;
  const failed = results.length - deleted;

  fastify.log.info(
    {
      scanned: allObjects.length,
      referenced: referencedFileNames.size,
      deleted,
      failed,
      orphanGraceHours,
      maxUnreferencedAgeDays,
    },
    'Upload cleanup finished',
  );
};

export const startUploadCleanupScheduler = (fastify: FastifyInstance): (() => void) => {
  if (!isCleanupEnabled()) {
    fastify.log.info('Automatic upload cleanup is disabled');
    return () => {};
  }

  const cleanupIntervalMinutes = parsePositiveInt(process.env.UPLOAD_CLEANUP_INTERVAL_MINUTES, 60);
  const intervalMs = cleanupIntervalMinutes * 60 * 1000;

  const runCleanup = async () => {
    try {
      await cleanupUploadedFiles(fastify);
    } catch (error) {
      fastify.log.error({ error }, 'Upload cleanup failed');
    }
  };

  setTimeout(() => {
    void runCleanup();
  }, 15_000);

  const timer = setInterval(() => {
    void runCleanup();
  }, intervalMs);

  fastify.log.info(
    { cleanupIntervalMinutes },
    'Automatic upload cleanup scheduler started',
  );

  return () => {
    clearInterval(timer);
    fastify.log.info('Automatic upload cleanup scheduler stopped');
  };
};