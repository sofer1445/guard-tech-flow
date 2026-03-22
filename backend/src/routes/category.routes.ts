import type { FastifyPluginAsync } from 'fastify';

import { DeviceCategoryModel } from '../models/DeviceCategory.js';
import { DamageReportModel } from '../models/DamageReport.js';
import { deviceCategorySchema } from '../schemas/category.schema.js';

type RedisCacheClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<string | null>;
  del(key: string): Promise<number>;
};

type CategoryRoutesOptions = {
  redisClient: RedisCacheClient;
};

const CATEGORIES_CACHE_KEY = 'categories';
const CATEGORIES_CACHE_TTL_SECONDS = 60 * 60 * 24;

const categoryRoutes: FastifyPluginAsync<CategoryRoutesOptions> = async (fastify, options) => {
  fastify.get('/api/categories', async (_request, reply) => {
    try {
      const cached = await options.redisClient.get(CATEGORIES_CACHE_KEY);
      if (cached) {
        return reply.send({ source: 'cache', data: JSON.parse(cached) });
      }

      const categories = await DeviceCategoryModel.find().sort({ name: 1 }).lean();

      await options.redisClient.set(
        CATEGORIES_CACHE_KEY,
        JSON.stringify(categories),
        { EX: CATEGORIES_CACHE_TTL_SECONDS },
      );

      return reply.send({ source: 'db', data: categories });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to fetch categories');
      return reply.status(500).send({ error: 'Failed to fetch categories' });
    }
  });

  fastify.post('/api/categories', async (request, reply) => {
    try {
      const validation = deviceCategorySchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const category = await DeviceCategoryModel.create(validation.data);

      await options.redisClient.del(CATEGORIES_CACHE_KEY);

      return reply.status(201).send({ success: true, data: category });
    } catch (error) {
      const maybeMongoError = error as { code?: number };
      if (maybeMongoError?.code === 11000) {
        return reply.status(409).send({
          error: 'סוג מכשיר זה כבר קיים במערכת',
        });
      }

      fastify.log.error({ error }, 'Failed to create category');
      return reply.status(500).send({ error: 'Failed to create category' });
    }
  });

  fastify.delete('/api/categories/:name', async (request, reply) => {
    try {
      const { name } = request.params as { name: string };

      const linkedReports = await DamageReportModel.countDocuments({ deviceType: name });

      if (linkedReports > 0) {
        return reply.status(409).send({
          error: 'לא ניתן למחוק סוג מכשיר שיש לו דוחות מקושרים',
        });
      }

      const result = await DeviceCategoryModel.deleteOne({ name });

      if (result.deletedCount === 0) {
        return reply.status(404).send({ error: 'Category not found' });
      }

      await options.redisClient.del(CATEGORIES_CACHE_KEY);

      return reply.send({
        success: true,
        message: 'קטגוריה נמחקה בהצלחה',
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to delete category');
      return reply.status(500).send({ error: 'Failed to delete category' });
    }
  });
};

export default categoryRoutes;