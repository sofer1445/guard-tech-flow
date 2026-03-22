import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { z } from 'npm:zod@3.24.2';

const approveReportSchema = z.object({
  reportId: z.string().min(1, 'reportId is required'),
  approved: z.boolean('approved must be a boolean'),
  notes: z.string().optional().default(''),
  treatmentType: z.string().optional(),
  adminNotes: z.string().optional().default('')
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
    const validationResult = approveReportSchema.safeParse(body);
    if (!validationResult.success) {
      return Response.json({
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 });
    }

    const { reportId, approved, notes, treatmentType, adminNotes } = validationResult.data;

    // Get the report
    const report = await base44.asServiceRole.entities.DamageReport.get(reportId);
    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }

    // Normalize role to lowercase for consistency
    const userRole = user.role?.toLowerCase();

    // Commander approval flow
    if (userRole === 'commander') {
      // Verify the requesting user is the assigned commander (prevent IDOR)
      if (report.commanderId !== user.id) {
        return Response.json({ error: 'Forbidden: You are not the assigned commander for this report' }, { status: 403 });
      }

      // Verify report is in correct status for commander approval
      if (report.status !== 'PENDING_COMMANDER') {
        return Response.json({ error: 'Report is not pending commander approval' }, { status: 400 });
      }

      const newStatus = approved ? 'PENDING_LOGISTICS' : 'REJECTED';
      await base44.asServiceRole.entities.DamageReport.update(reportId, {
        status: newStatus,
        commanderNotes: notes,
        commanderApprovedAt: new Date().toISOString()
      });

      return Response.json({
        success: true,
        message: `הדוח ${approved ? 'אושר והועבר ללוגיסטיקה' : 'נדחה'} על ידי המפקד`
      });
    } 
    // Admin approval flow
    else if (userRole === 'admin') {
      if (report.status !== 'PENDING_LOGISTICS' && report.status !== 'PENDING_COMMANDER') {
        return Response.json({ error: 'Report is not in a pending state' }, { status: 400 });
      }

      let updateData;

      if (report.status === 'PENDING_COMMANDER') {
        // Admin acts as commander: approve → PENDING_LOGISTICS, reject → REJECTED
        const newStatus = approved ? 'PENDING_LOGISTICS' : 'REJECTED';
        updateData = {
          status: newStatus,
          commanderNotes: notes,
          commanderApprovedAt: new Date().toISOString()
        };
      } else {
        // report.status === 'PENDING_LOGISTICS': final admin decision
        if (approved && !treatmentType) {
          return Response.json({ error: 'treatmentType is required when approving a report' }, { status: 400 });
        }
        const newStatus = approved ? 'APPROVED' : 'REJECTED';
        updateData = {
          status: newStatus,
          adminNotes: adminNotes || notes,
          adminApprovedAt: new Date().toISOString(),
          ...(approved && treatmentType ? { treatmentType } : {})
        };
      }

      await base44.asServiceRole.entities.DamageReport.update(reportId, updateData);

      return Response.json({
        success: true,
        message: approved
          ? (report.status === 'PENDING_COMMANDER' ? 'הדוח הועבר לאישור רע"ן' : 'הדוח אושר סופית')
          : 'הדוח נדחה'
      });
    } 
    // Reject unauthorized roles
    else {
      return Response.json({ error: 'Unauthorized: Only commanders and admins can approve reports' }, { status: 403 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});