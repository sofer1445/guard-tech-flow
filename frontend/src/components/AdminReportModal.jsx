import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { approveReport } from '@/api/client';

const statusLabels = {
  PENDING_COMMANDER: 'ממתין לאישור מפקד',
  PENDING_LOGISTICS: 'ממתין לאישור רע"ן',
  APPROVED: 'אושר',
  REJECTED: 'נדחה'
};

const TREATMENT_OPTIONS = [
  { value: '', label: 'בחר אופן טיפול' },
  { value: 'הועבר לתיקון במעבדה', label: 'הועבר לתיקון במעבדה' },
  { value: 'הוזמן ציוד חלופי', label: 'הוזמן ציוד חלופי' },
  { value: 'נגרע מהמלאי (השבתה)', label: 'נגרע מהמלאי (השבתה)' },
];

const getApiErrorMessage = (error, fallbackMessage) => {
  return error?.response?.data?.error || error?.response?.data?.message || error?.message || fallbackMessage;
};

export default function AdminReportModal({ report, onClose, onSuccess }) {
  const [adminNotes, setAdminNotes] = useState('');
  const [treatmentType, setTreatmentType] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  if (!report) return null;

  const handleApprove = async () => {
    if (!treatmentType) {
      toast.error('יש לבחור אופן טיפול לפני אישור הדוח');
      return;
    }
    setActionLoading(true);
    try {
      await approveReport({
        reportId: report.id,
        approved: true,
        adminNotes,
        treatmentType,
      });
      toast.success('הדוח אושר בהצלחה');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'שגיאה בעדכון הדוח'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectNotes.trim()) {
      toast.error('חובה לספק נימוק לדחייה');
      return;
    }
    setActionLoading(true);
    try {
      await approveReport({
        reportId: report.id,
        approved: false,
        adminNotes: rejectNotes,
      });
      toast.success('הדוח נדחה');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'שגיאה בעדכון הדוח'));
    } finally {
      setActionLoading(false);
    }
  };

  const isActionable = report.status === 'PENDING_LOGISTICS';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" dir="rtl">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="text-right flex-1">
            <h2 className="text-lg font-semibold text-slate-900">פרטי הדוח</h2>
            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
              סטטוס:
              <Badge className="mr-1">{statusLabels[report.status]}</Badge>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 transition text-slate-500 hover:text-slate-800 mr-3"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">

          {/* Report Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600">מגיש הדוח</p>
              <p className="font-semibold">{report.submitterName}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">אימייל</p>
              <p className="font-semibold text-sm">{report.submitterEmail}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">תעודת זהות מדווח</p>
              <p className="font-semibold text-sm">{report.submitterId}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">סוג מכשיר</p>
              <p className="font-semibold">{report.deviceType}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">מזהה מכשיר</p>
              <p className="font-semibold">{report.deviceId}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">סוג אירוע</p>
              <p className="font-semibold">
                {report.incidentType === 'DAMAGE' ? 'נזק' : 'אובדן'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">תאריך האירוע</p>
              <p className="font-semibold">
                {new Date(report.incidentDate).toLocaleDateString('he-IL')}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">מפקד אחראי</p>
              <p className="font-semibold">{report.commanderName}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-sm text-slate-600 mb-2">תיאור</p>
            <p className="text-slate-900 bg-slate-50 p-3 rounded">
              {report.description}
            </p>
          </div>

          {/* Photo */}
          {report.photoUrl && (
            <div>
              <p className="text-sm text-slate-600 mb-2">תמונה</p>
              <img
                src={report.photoUrl}
                alt="damage"
                className="max-w-sm rounded-lg border border-slate-200"
              />
            </div>
          )}

          {/* Commander Notes */}
          {report.commanderNotes && (
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p className="text-sm text-slate-600 mb-1">הערות המפקד</p>
              <p className="text-slate-900">{report.commanderNotes}</p>
            </div>
          )}

          {/* Action Section - Only for PENDING_LOGISTICS */}
          {isActionable && (
            <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="font-semibold text-blue-900">החלטה על הדוח</p>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  אופן טיפול <span className="text-red-500">*</span>
                </label>
                <select
                  value={treatmentType}
                  onChange={(e) => setTreatmentType(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {TREATMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">הערות רע"ן (אופציונלי)</label>
                <Textarea
                  placeholder="הוראות, הבהרות או הערות נוספות..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {rejectMode && (
                <div className="space-y-1 bg-red-50 p-3 rounded-lg border border-red-200">
                  <label className="text-sm font-medium text-red-700">
                    נימוק דחייה <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    placeholder="חובה לציין סיבת הדחייה..."
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    rows={3}
                    autoFocus
                  />
                </div>
              )}

              <div className="flex gap-3">
                {!rejectMode ? (
                  <>
                    <Button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                    >
                      {actionLoading && <Loader className="w-4 h-4 animate-spin" />}
                      <Check className="w-4 h-4" />
                      אשר דוח סופית
                    </Button>
                    <Button
                      onClick={() => setRejectMode(true)}
                      disabled={actionLoading}
                      variant="destructive"
                      className="flex-1 gap-2"
                    >
                      <X className="w-4 h-4" />
                      דחה דוח
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleConfirmReject}
                      disabled={actionLoading || !rejectNotes.trim()}
                      variant="destructive"
                      className="flex-1 gap-2"
                    >
                      {actionLoading && <Loader className="w-4 h-4 animate-spin" />}
                      <X className="w-4 h-4" />
                      אשר דחייה
                    </Button>
                    <Button
                      onClick={() => { setRejectMode(false); setRejectNotes(''); }}
                      disabled={actionLoading}
                      variant="outline"
                      className="flex-1"
                    >
                      ביטול
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Read-only history for finalized reports */}
          {(report.status === 'APPROVED' || report.status === 'REJECTED') && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
              <p className="font-semibold text-slate-700">החלטת רע"ן</p>
              {report.treatmentType && (
                <div>
                  <p className="text-sm text-slate-500">אופן טיפול</p>
                  <p className="font-medium text-slate-900">{report.treatmentType}</p>
                </div>
              )}
              {report.adminNotes && (
                <div>
                  <p className="text-sm text-slate-500">הערות רע"ן</p>
                  <p className="text-slate-900">{report.adminNotes}</p>
                </div>
              )}
              {!report.treatmentType && !report.adminNotes && (
                <p className="text-sm text-slate-500">לא הוזנו הערות או אופן טיפול.</p>
              )}
            </div>
          )}

          {/* Read-only message for PENDING_COMMANDER */}
          {report.status === 'PENDING_COMMANDER' && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-700">
                דוח זה ממתין לאישור מפקד ואינו ניתן לטיפול עדיין.
              </p>
            </div>
          )}

          <Button variant="outline" onClick={onClose} className="w-full">
            סגור
          </Button>
        </div>
      </div>
    </div>
  );
}