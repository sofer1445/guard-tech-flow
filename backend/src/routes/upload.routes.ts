import type { FastifyPluginAsync } from 'fastify';

import { minioClient, REPORTS_BUCKET } from '../lib/minio.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/upload', async (request, reply) => {
    try {
      const part = await request.file();

      if (!part) {
        return reply.status(400).send({ error: 'לא נשלח קובץ' });
      }

      if (!allowedMimeTypes.has(part.mimetype)) {
        return reply.status(400).send({ error: 'פורמט קובץ לא נתמך. יש להעלות JPG, PNG או WEBP' });
      }

      const safeName = sanitizeFileName(part.filename);
      const objectName = `${Date.now()}-${safeName}`;
      const buffer = await part.toBuffer();

      await minioClient.putObject(
        REPORTS_BUCKET,
        objectName,
        buffer,
        buffer.length,
        { 'Content-Type': part.mimetype },
      );

      return reply.send({
        url: `/api/upload/${objectName}`,
      });
    } catch (error) {
      const uploadError = error as { code?: string; message?: string };

      if (uploadError.code === 'FST_REQ_FILE_TOO_LARGE') {
        return reply.status(413).send({ error: 'הקובץ גדול מדי' });
      }

      fastify.log.error({ error }, 'Failed to upload file');
      return reply.status(500).send({ error: 'שגיאה בהעלאת הקובץ' });
    }
  });

  fastify.get('/api/upload/:filename', async (request, reply) => {
    try {
      const { filename } = request.params as { filename?: string };

      if (!filename) {
        return reply.status(400).send({ error: 'שם קובץ חסר' });
      }

      const stat = await minioClient.statObject(REPORTS_BUCKET, filename);
      const objectStream = await minioClient.getObject(REPORTS_BUCKET, filename);

      reply.header('Content-Type', stat.metaData['content-type'] || 'application/octet-stream');
      reply.header('Cache-Control', 'public, max-age=31536000, immutable');
      return reply.send(objectStream);
    } catch (error) {
      const minioError = error as { code?: string };

      if (minioError.code === 'NoSuchKey' || minioError.code === 'NotFound') {
        return reply.status(404).send({ error: 'קובץ לא נמצא' });
      }

      fastify.log.error({ error }, 'Failed to read file');
      return reply.status(500).send({ error: 'שגיאה בקריאת הקובץ' });
    }
  });

  fastify.delete('/api/upload/:filename', async (request, reply) => {
    try {
      const { filename } = request.params as { filename?: string };

      if (!filename) {
        return reply.status(400).send({ error: 'שם קובץ חסר' });
      }

      await minioClient.removeObject(REPORTS_BUCKET, filename);

      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to delete file');
      return reply.status(500).send({ error: 'שגיאה במחיקת הקובץ' });
    }
  });
};

export default uploadRoutes;
