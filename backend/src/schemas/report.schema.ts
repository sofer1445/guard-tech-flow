import { z } from 'zod';

export const INCIDENT_TYPES = ['DAMAGE', 'LOSS'] as const;
export const REPORT_STATUSES = ['PENDING_COMMANDER', 'PENDING_LOGISTICS', 'APPROVED', 'REJECTED'] as const;
export const REPORT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const TREATMENT_TYPES = [
  'הועבר לתיקון במעבדה',
  'הוזמן ציוד חלופי',
  'נגרע מהמלאי (השבתה)',
] as const;

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const relativeUploadPathRegex = /^\/api\/upload\/[A-Za-z0-9._%-]+$/;

export const damageReportSchema = z.object({
  submitterId: z.string().min(1),
  submitterName: z.string().min(1),
  submitterEmail: z.string().email(),
  deviceType: z.string().min(1),
  deviceId: z.string().min(1),
  incidentType: z.enum(INCIDENT_TYPES),
  incidentDate: z.string().regex(isoDateRegex, 'incidentDate must be in YYYY-MM-DD format'),
  description: z.string().min(1),
  photoUrl: z.union([
    z.string().url(),
    z.string().regex(relativeUploadPathRegex, 'כתובת תמונה לא תקינה'),
  ]).nullable().optional(),
  commanderId: z.string().min(1),
  commanderName: z.string().min(1),
  status: z.enum(REPORT_STATUSES).default('PENDING_COMMANDER'),
  commanderNotes: z.string().optional(),
  adminNotes: z.string().optional(),
  treatmentType: z.enum(TREATMENT_TYPES).optional(),
  commanderApprovedAt: z.string().datetime().optional(),
  adminApprovedAt: z.string().datetime().optional(),
  priority: z.enum(REPORT_PRIORITIES).default('MEDIUM'),
});

export type DamageReportPayload = z.infer<typeof damageReportSchema>;