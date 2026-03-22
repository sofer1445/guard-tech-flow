import type { FastifyPluginAsync } from 'fastify';

import { UserModel } from '../models/User.js';

const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/users/commanders', async (_request, reply) => {
    try {
      const commanders = await UserModel.find({ role: 'commander' }).lean();

      if (commanders.length === 0) {
        const mockCommander = {
          userId: 'cmd-1',
          name: 'ישראל ישראלי - מפקד',
          role: 'commander',
        };

        await UserModel.create(mockCommander);
        return reply.send({ data: [mockCommander] });
      }

      return reply.send({ data: commanders });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to fetch commanders');
      return reply.status(500).send({ error: 'Failed to fetch commanders' });
    }
  });
};

export default userRoutes;
