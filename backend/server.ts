import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import amqplib from 'amqplib';
import type { Channel } from 'amqplib';

import categoryRoutes from './src/routes/category.routes.js';
import reportRoutes from './src/routes/report.routes.js';
import uploadRoutes from './src/routes/upload.routes.js';
import userRoutes from './src/routes/user.routes.js';
import { setupMinio } from './src/lib/minio.js';
import { startUploadCleanupScheduler } from './src/jobs/uploadCleanup.js';

const app = Fastify({ logger: true });

// ── Environment variables with localhost fallbacks ──────────────────────────
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/guard-tech-flow';
const REDIS_URI = process.env.REDIS_URI ?? 'redis://localhost:6379';
const RABBITMQ_URI = process.env.RABBITMQ_URI ?? 'amqp://localhost:5672';
const PORT = parseInt(process.env.PORT ?? '3000', 10);
const HOST = process.env.HOST ?? '0.0.0.0';
const REPORT_NOTIFICATIONS_QUEUE = 'report_notifications';

app.get('/', async (_request, reply) => {
  return reply.status(200).send({
    name: 'guard-tech-flow-backend',
    status: 'ok',
    routes: {
      health: '/api/health',
      docs: '/docs',
      openApiJson: '/docs/json',
      categories: '/api/categories',
      reports: '/api/reports',
      upload: '/api/upload',
      commanders: '/api/users/commanders',
    },
  });
});

// ── Connection state ────────────────────────────────────────────────────────
let redisClient: ReturnType<typeof createClient>;
let amqpConnection: Awaited<ReturnType<typeof amqplib.connect>> | undefined;
let amqpChannel: Channel | undefined;
let uploadCleanupStop: (() => void) | undefined;

// ── Health route ────────────────────────────────────────────────────────────
app.get('/api/health', async (_request, reply) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const redisStatus = redisClient?.isReady ? 'connected' : 'disconnected';
  const amqpStatus = amqpConnection ? 'connected' : 'disconnected';

  const healthy = mongoStatus === 'connected' && redisStatus === 'connected' && amqpStatus === 'connected';

  return reply.status(healthy ? 200 : 503).send({
    status: healthy ? 'ok' : 'degraded',
    services: {
      mongodb: mongoStatus,
      redis: redisStatus,
      rabbitmq: amqpStatus,
    },
  });
});

// ── Graceful shutdown ───────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  app.log.info(`Received ${signal}. Shutting down gracefully...`);

  uploadCleanupStop?.();

  await app.close();

  await Promise.allSettled([
    mongoose.disconnect(),
    redisClient?.quit(),
    amqpChannel?.close(),
    amqpConnection?.close(),
  ]);

  app.log.info('All connections closed. Exiting.');
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT').catch((err) => { console.error(err); process.exit(1); }));
process.on('SIGTERM', () => shutdown('SIGTERM').catch((err) => { console.error(err); process.exit(1); }));

// ── Bootstrap ───────────────────────────────────────────────────────────────
const start = async () => {
  try {
    const maxUploadSizeMb = parseInt(process.env.UPLOAD_MAX_FILE_SIZE_MB ?? '5', 10);
    const maxUploadSizeBytes = Math.max(1, maxUploadSizeMb) * 1024 * 1024;

    // Register plugins
    await app.register(cors, { origin: true });
    await app.register(multipart, {
      limits: {
        fileSize: maxUploadSizeBytes,
        files: 1,
      },
    });
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'Guard Tech Flow API',
          description: 'API documentation for Guard Tech Flow backend',
          version: '1.0.0',
        },
      },
    });
    await app.register(swaggerUI, {
      routePrefix: '/docs',
      staticCSP: true,
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
      uiHooks: {
        onRequest: (_request, _reply, next) => {
          next();
        },
        preHandler: (_request, _reply, next) => {
          next();
        },
      },
    });

    // MongoDB
    await mongoose.connect(MONGO_URI);
    app.log.info('MongoDB connected');

    // Redis
    redisClient = createClient({ url: REDIS_URI });
    redisClient.on('error', (err) => app.log.error({ err }, 'Redis error'));
    await redisClient.connect();
    app.log.info('Redis connected');

    // RabbitMQ
    amqpConnection = await amqplib.connect(RABBITMQ_URI);
    amqpChannel = await amqpConnection.createChannel();
    await amqpChannel.assertQueue(REPORT_NOTIFICATIONS_QUEUE, { durable: true });
    app.log.info('RabbitMQ connected');

    // MinIO
    await setupMinio();
    app.log.info('MinIO ready');

    // Register routes
    await app.register(categoryRoutes, { redisClient });
    await app.register(reportRoutes, { amqpChannel });
    await app.register(uploadRoutes);
    await app.register(userRoutes);

    uploadCleanupStop = startUploadCleanupScheduler(app);

    // Start server
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
