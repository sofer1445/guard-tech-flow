import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { z } from 'npm:zod@3.24.2';

const submitReportSchema = z.object({
  deviceType: z.string().trim().min(1, 'deviceType is required'),
  deviceId: z.string().min(1, 'deviceId is required'),
  incidentType: z.enum(['DAMAGE', 'LOSS']),
  incidentDate: z.string().date('Invalid date format'),
  description: z.string().min(1, 'description is required'),
  commanderId: z.string().min(1, 'commanderId is required'),
  commanderName: z.string().optional(),
  photoUrl: z.string().url('Invalid photo URL').optional().or(z.literal(null)),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  // Dev-mode override: admin can submit on behalf of another user
  _devSubmitterId: z.string().optional(),
  _devSubmitterName: z.string().optional(),
  _devSubmitterEmail: z.string().optional(),
  _devSubmitterRole: z.string().optional(),
});

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Validate input with Zod
    const validationResult = submitReportSchema.safeParse(body);
    if (!validationResult.success) {
      return Response.json({
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 });
    }

    const validated = validationResult.data;

    // Dev-mode: admin can impersonate another user for testing purposes
    const isAdminDevOverride = user.role?.toLowerCase() === 'admin' && validated._devSubmitterId;

    const submitterId = isAdminDevOverride ? validated._devSubmitterId : user.id;
    const submitterName = isAdminDevOverride ? (validated._devSubmitterName || user.full_name) : user.full_name;
    const submitterEmail = isAdminDevOverride ? (validated._devSubmitterEmail || user.email) : user.email;
    const effectiveRole = isAdminDevOverride ? (validated._devSubmitterRole || 'user') : (user.role || 'user');

    // If the submitter IS the commander, skip commander approval step
    const isSubmitterCommander = submitterId === validated.commanderId || effectiveRole.toLowerCase() === 'commander';
    const initialStatus = isSubmitterCommander ? 'PENDING_LOGISTICS' : 'PENDING_COMMANDER';

    // Create damage report
    const report = await base44.asServiceRole.entities.DamageReport.create({
      submitterId,
      submitterName,
      submitterEmail,
      deviceType: validated.deviceType,
      deviceId: validated.deviceId,
      incidentType: validated.incidentType,
      incidentDate: validated.incidentDate,
      description: validated.description,
      photoUrl: validated.photoUrl || null,
      commanderId: validated.commanderId,
      commanderName: validated.commanderName || 'Unknown',
      status: initialStatus,
      ...(isSubmitterCommander ? {
        commanderNotes: 'הדוח הוגש ישירות על ידי המפקד',
        commanderApprovedAt: new Date().toISOString()
      } : {}),
      priority: validated.priority || 'MEDIUM'
    });

    return Response.json({
      success: true,
      reportId: report.id,
      message: 'הדוח הוגש בהצלחה'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});