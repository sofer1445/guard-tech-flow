import { model, type InferSchemaType, Schema } from 'mongoose';

const INCIDENT_TYPES = ['DAMAGE', 'LOSS'] as const;
const REPORT_STATUSES = ['PENDING_COMMANDER', 'PENDING_LOGISTICS', 'APPROVED', 'REJECTED'] as const;
const REPORT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
const TREATMENT_TYPES = [
  'הועבר לתיקון במעבדה',
  'הוזמן ציוד חלופי',
  'נגרע מהמלאי (השבתה)',
] as const;

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export interface IDamageReport {
  submitterId: string;
  submitterName: string;
  submitterEmail: string;
  deviceType: string;
  deviceId: string;
  incidentType: (typeof INCIDENT_TYPES)[number];
  incidentDate: string;
  description: string;
  photoUrl?: string;
  commanderId: string;
  commanderName: string;
  status: (typeof REPORT_STATUSES)[number];
  commanderNotes?: string;
  adminNotes?: string;
  treatmentType?: (typeof TREATMENT_TYPES)[number];
  commanderApprovedAt?: string;
  adminApprovedAt?: string;
  priority: (typeof REPORT_PRIORITIES)[number];
}

const damageReportSchema = new Schema<IDamageReport>(
  {
    submitterId: { type: String, required: true, trim: true },
    submitterName: { type: String, required: true, trim: true },
    submitterEmail: { type: String, required: true, trim: true },
    deviceType: { type: String, required: true, trim: true },
    deviceId: { type: String, required: true, trim: true },
    incidentType: { type: String, enum: INCIDENT_TYPES, required: true },
    incidentDate: {
      type: String,
      required: true,
      validate: {
        validator: (value: string) => isoDateRegex.test(value),
        message: 'incidentDate must be in YYYY-MM-DD format',
      },
    },
    description: { type: String, required: true, trim: true },
    photoUrl: { type: String, required: false, trim: true },
    commanderId: { type: String, required: true, trim: true },
    commanderName: { type: String, required: true, trim: true },
    status: { type: String, enum: REPORT_STATUSES, required: true, default: 'PENDING_COMMANDER' },
    commanderNotes: { type: String, required: false, trim: true },
    adminNotes: { type: String, required: false, trim: true },
    treatmentType: { type: String, enum: TREATMENT_TYPES, required: false },
    commanderApprovedAt: { type: String, required: false },
    adminApprovedAt: { type: String, required: false },
    priority: { type: String, enum: REPORT_PRIORITIES, required: true, default: 'MEDIUM' },
  },
  {
    strict: 'throw',
    versionKey: false,
  },
);

export type DamageReportDocument = InferSchemaType<typeof damageReportSchema>;

export const DamageReportModel = model<IDamageReport>('DamageReport', damageReportSchema);