import type { FastifyPluginAsync } from 'fastify';
import type { Channel } from 'amqplib';
import { z } from 'zod';

import { DamageReportModel } from '../models/DamageReport.js';
import { damageReportSchema, TREATMENT_TYPES } from '../schemas/report.schema.js';

type ReportRoutesOptions = {
  amqpChannel: Channel;
};

const NOTIFICATIONS_QUEUE = 'report_notifications';

const approveReportSchema = z.object({
  reportId: z.string().min(1),
  approved: z.boolean(),
  notes: z.string().optional().default(''),
  treatmentType: z.enum(TREATMENT_TYPES).optional(),
});

const reportRoutes: FastifyPluginAsync<ReportRoutesOptions> = async (fastify, options) => {
  fastify.get('/api/reports', async (_request, reply) => {
    try {
      const reports = await DamageReportModel.find()
        .sort({ createdAt: -1 })
        .lean();

      return reply.send({ data: reports });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to fetch reports');
      return reply.status(500).send({ error: 'Failed to fetch reports' });
    }
  });

  fastify.post('/api/reports', async (request, reply) => {
    try {
      const validation = damageReportSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const savedReport = await DamageReportModel.create(validation.data);

      const message = {
        event: 'NEW_REPORT',
        reportId: String(savedReport._id),
      };

      options.amqpChannel.sendToQueue(
        NOTIFICATIONS_QUEUE,
        Buffer.from(JSON.stringify(message)),
        { persistent: true },
      );

      return reply.status(201).send({
        success: true,
        reportId: savedReport._id,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create report');
      return reply.status(500).send({ error: 'Failed to create report' });
    }
  });

  fastify.post('/api/reports/approve', async (request, reply) => {
    try {
      const validation = approveReportSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const { reportId, approved, notes, treatmentType } = validation.data;

      const report = await DamageReportModel.findById(reportId);
      if (!report) {
        return reply.status(404).send({ error: 'Report not found' });
      }

      if (report.status === 'PENDING_COMMANDER') {
        report.status = approved ? 'PENDING_LOGISTICS' : 'REJECTED';
        report.commanderNotes = notes;
        report.commanderApprovedAt = new Date().toISOString();
      } else if (report.status === 'PENDING_LOGISTICS') {
        if (approved && !treatmentType) {
          return reply.status(400).send({
            error: 'treatmentType is required when approving a PENDING_LOGISTICS report',
          });
        }

        report.status = approved ? 'APPROVED' : 'REJECTED';
        report.adminNotes = notes;
        report.adminApprovedAt = new Date().toISOString();

        if (approved && treatmentType) {
          report.treatmentType = treatmentType;
        }
      } else {
        return reply.status(400).send({ error: 'Report is not in a pending state' });
      }

      await report.save();

      return reply.send({
        success: true,
        data: report,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to approve report');
      return reply.status(500).send({ error: 'Failed to approve report' });
    }
  });
};

export default reportRoutes;