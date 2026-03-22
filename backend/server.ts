import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import amqplib from 'amqplib';

const app = Fastify({ logger: true });

// ── Environment variables with localhost fallbacks ──────────────────────────
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/guard-tech-flow';
const REDIS_URI = process.env.REDIS_URI ?? 'redis://localhost:6379';
const RABBITMQ_URI = process.env.RABBITMQ_URI ?? 'amqp://localhost:5672';
const PORT = parseInt(process.env.PORT ?? '3000', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

// ── Connection state ────────────────────────────────────────────────────────
let redisClient: ReturnType<typeof createClient>;
let amqpConnection: Awaited<ReturnType<typeof amqplib.connect>> | undefined;

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

  await app.close();

  await Promise.allSettled([
    mongoose.disconnect(),
    redisClient?.quit(),
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
    // Register plugins
    await app.register(cors, { origin: true });

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
    app.log.info('RabbitMQ connected');

    // Start server
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
