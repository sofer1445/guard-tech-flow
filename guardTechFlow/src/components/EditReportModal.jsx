import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { X, Upload, AlertCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';

export default function EditReportModal({ report, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    deviceType: report?.deviceType || '',
    deviceId: report?.deviceId || '',
    incidentType: report?.incidentType || '',
    incidentDate: report?.incidentDate ? report.incidentDate.split('T')[0] : '',
    description: report?.description || '',
    photoUrl: report?.photoUrl || '',
  });
  const [deviceCategories, setDeviceCategories] = useState([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    base44.functions.invoke('getDeviceCategories', {})
      .then(res => setDeviceCategories(res.data.data || []))
      .catch(() => toast.error('שגיאה בטעינת סוגי המכשירים'));
  }, []);

  if (!report) return null;

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, photoUrl: response.file_url }));
      toast.success('התמונה הועלתה בהצלחה');
    } catch {
      toast.error('שגיאה בהעלאת התמונה');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!formData.deviceType) { toast.error('חובה לבחור סוג מכשיר'); return; }
    if (!formData.deviceId.trim()) { toast.error('חובה לספק מזהה מכשיר'); return; }
    if (!formData.incidentType) { toast.error('חובה לבחור סוג אירוע'); return; }
    if (!formData.incidentDate) { toast.error('חובה לבחור תאריך אירוע'); return; }
    if (formData.description.trim().length < 10) { toast.error('תיאור חייב להכיל לפחות 10 תווים'); return; }
    if (formData.incidentType === 'DAMAGE' && !formData.photoUrl) { toast.error('צילום נדרש עבור דוח נזק'); return; }

    setLoading(true);
    try {
      await base44.entities.DamageReport.update(report.id, {
        deviceType: formData.deviceType,
        deviceId: formData.deviceId,
        incidentType: formData.incidentType,
        incidentDate: formData.incidentDate,
        description: formData.description,
        photoUrl: formData.photoUrl || null,
      });
      toast.success('הדוח עודכן בהצלחה');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.message || 'שגיאה בעדכון הדוח');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto" dir="rtl">
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 w-full max-w-3xl rounded-xl shadow-2xl my-4">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-0">
            <div /> {/* spacer */}
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-200 transition text-slate-500 hover:text-slate-800"
              aria-label="סגור"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <Card className="m-6">
            <CardHeader>
              <CardTitle className="text-2xl mb-2">עריכת דוח נזק / אובדן</CardTitle>
              <div className="bg-slate-100 p-4 rounded-lg text-sm text-slate-700 space-y-1">
                <p><span className="font-semibold">שם מדווח:</span> {report.submitterName}</p>
                <p><span className="font-semibold">ת.ז מדווח:</span> {report.submitterId}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6" dir="rtl">

                {/* Device Type */}
                <div>
                  <Label className="block text-sm font-semibold text-slate-900 mb-2">סוג מכשיר *</Label>
                  <Select
                    value={formData.deviceType}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, deviceType: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר סוג מכשיר" />
                    </SelectTrigger>
                    <SelectContent>
                      {deviceCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Device ID */}
                <div>
                  <Label className="block text-sm font-semibold text-slate-900 mb-2">מזהה/מספר מכשיר *</Label>
                  <Input
                    value={formData.deviceId}
                    onChange={(e) => setFormData(prev => ({ ...prev, deviceId: e.target.value }))}
                    placeholder="לדוגמה: PC-12345"
                  />
                </div>

                {/* Incident Type */}
                <div>
                  <Label className="block text-sm font-semibold text-slate-900 mb-2">סוג אירוע *</Label>
                  <Select
                    value={formData.incidentType}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, incidentType: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר סוג אירוע" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOSS">אובדן</SelectItem>
                      <SelectItem value="DAMAGE">נזק</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Incident Date */}
                <div>
                  <Label className="block text-sm font-semibold text-slate-900 mb-2">תאריך האירוע *</Label>
                  <Input
                    type="date"
                    value={formData.incidentDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, incidentDate: e.target.value }))}
                  />
                </div>

                {/* Description */}
                <div>
                  <Label className="block text-sm font-semibold text-slate-900 mb-2">תיאור האירוע * (מינימום 10 תווים)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="תאר בפירוט מה קרה למכשיר..."
                    rows={5}
                  />
                </div>

                {/* Photo Upload - only for DAMAGE */}
                {formData.incidentType === 'DAMAGE' && (
                  <div>
                    <Label className="block text-sm font-semibold text-slate-900 mb-2">
                      צילום הנזק * (חובה לדוחות נזק)
                    </Label>
                    <div className={`border-2 border-dashed rounded-lg p-6 transition ${
                      formData.photoUrl ? 'border-green-400 bg-green-50' : 'border-slate-300 bg-slate-50'
                    }`}>
                      <label className="flex flex-col items-center gap-2 cursor-pointer">
                        <Upload className={`w-8 h-8 ${formData.photoUrl ? 'text-green-600' : 'text-slate-400'}`} />
                        <span className="text-sm font-medium text-slate-700">
                          {isUploadingPhoto ? 'מעלה תמונה...' : formData.photoUrl ? '✓ תמונה הועלתה' : 'לחץ להעלאת תמונה'}
                        </span>
                        <span className="text-xs text-slate-500">PNG, JPG עד 5MB</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={handlePhotoUpload}
                          disabled={isUploadingPhoto}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {formData.photoUrl && (
                      <img src={formData.photoUrl} alt="preview" className="mt-3 max-h-40 rounded-lg border border-slate-200" />
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-semibold"
                  >
                    {loading && <Loader className="w-4 h-4 animate-spin ml-2" />}
                    שמור שינויים
                  </Button>
                  <Button onClick={onClose} variant="outline" className="flex-1 h-11">
                    ביטול
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}