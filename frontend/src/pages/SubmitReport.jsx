import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fetchCategories, submitReport, fetchCommanders } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { useMockUser } from '@/components/MockUserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowRight, Upload, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// Zod Schema
const damageReportSchema = z.object({
  deviceType: z
    .string({ required_error: 'חובה לבחור סוג מכשיר' })
    .trim()
    .min(1, 'חובה לבחור סוג מכשיר'),
  
  deviceId: z
    .string({ required_error: 'חובה לספק מזהה מכשיר' })
    .min(1, 'חובה לספק מזהה מכשיר')
    .max(100, 'מזהה מכשיר ארוך מדי'),
  
  incidentType: z
    .enum(['DAMAGE', 'LOSS'], { 
      required_error: 'חובה לבחור סוג אירוע'
    }),
  
  incidentDate: z
    .string({ required_error: 'חובה לבחור תאריך אירוע' })
    .refine((date) => !isNaN(Date.parse(date)), 'תאריך לא תקין'),
  
  description: z
    .string({ required_error: 'חובה לספק תיאור' })
    .min(10, 'תיאור חייב להכיל לפחות 10 תווים')
    .max(1000, 'תיאור ארוך מדי'),
  
  photoUrl: z.string().optional(),
  
  commanderId: z
    .string({ required_error: 'חובה לבחור מפקד לאישור' })
    .min(1, 'חובה לבחור מפקד לאישור'),
  
}).refine(
  (data) => {
    if (data.incidentType === 'DAMAGE' && !data.photoUrl) {
      return false;
    }
    return true;
  },
  {
    message: 'צילום נדרוש עבור דוח נזק',
    path: ['photoUrl'],
  }
);

export default function SubmitReport() {
  const { user: authUser } = useAuth();
  const { activeMockUser } = useMockUser();
  const user = activeMockUser || authUser;
  const navigate = useNavigate();
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [commanders, setCommanders] = useState([]);
  const [deviceCategories, setDeviceCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    fetchCommanders()
      .then(setCommanders)
      .catch(() => toast.error('שגיאה בטעינת רשימת המפקדים'));
    
    // Load device categories with caching
    const CACHE_KEY = 'deviceCategories';
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    
    const getCachedCategories = () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            return data;
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
      return null;
    };

    const cacheCategories = (data) => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      } catch (e) {
        // Ignore storage errors
      }
    };

    // Show cached data immediately if available
    const cached = getCachedCategories();
    if (cached) {
      setDeviceCategories(cached);
      setLoadingCategories(false);
    }

    // Fetch fresh data in background
    fetchCategories()
      .then((fresh) => {
        setDeviceCategories(fresh);
        cacheCategories(fresh);
      })
      .catch(() => {
        if (!cached) {
          toast.error('שגיאה בטעינת סוגי המכשירים');
        }
      })
      .finally(() => {
        if (!cached) {
          setLoadingCategories(false);
        }
      });
  }, []);
  
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm({
    resolver: zodResolver(damageReportSchema),
    defaultValues: {
      deviceType: '',
      deviceId: '',
      incidentType: '',
      incidentDate: '',
      description: '',
      photoUrl: '',
      commanderId: '',
    },
  });

  const incidentType = watch('incidentType');

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File upload not yet implemented in standalone mode
    toast.error('העלאת קבצים עדיין לא זמינה - ניתן להוסיף תמונה בשלב מאוחר יותר');
  };

  const onSubmit = async (validatedData) => {
    const selectedCommander = commanders.find(c => c.id === validatedData.commanderId);
    try {
      const submitterName = user?.full_name || user?.name || '';
      const submitterId = user?.id || '';
      const submitterEmail = user?.email || 'no-reply@guardtech.local';

      const payload = {
        submitterId,
        submitterName,
        submitterEmail,
        deviceType: validatedData.deviceType,
        deviceId: validatedData.deviceId,
        incidentType: validatedData.incidentType,
        incidentDate: validatedData.incidentDate,
        description: validatedData.description,
        photoUrl: validatedData.photoUrl || null,
        commanderId: validatedData.commanderId,
        commanderName: selectedCommander?.full_name || selectedCommander?.name || '',
      };

      if (!payload.submitterId || !payload.submitterName || !payload.commanderName) {
        toast.error('חסרים פרטי משתמש/מפקד. יש לרענן את הדף ולנסות שוב');
        return;
      }

      await submitReport(payload);

      toast.success('הדוח נשלח בהצלחה והועבר לאישור המפקד');
      
      reset({
        deviceType: '',
        deviceId: '',
        incidentType: '',
        incidentDate: '',
        description: '',
        photoUrl: '',
        commanderId: '',
      });
      setPhotoUrl('');
      
      setTimeout(() => navigate('/Home'), 1500);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה בהגשת הדוח';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 rtl" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/Home')}
          className="mb-6 gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          חזור לדף הבית
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl mb-4">דיווח על נזק או אובדן ציוד תקשובי</CardTitle>
            <div className="bg-slate-100 p-4 rounded-lg text-sm text-slate-700 space-y-1">
              <p>
                <span className="font-semibold">שם:</span> {user?.full_name || user?.name || '—'}
              </p>
              <p>
                <span className="font-semibold">ת.ז מדווח:</span> {user?.id || '—'}
              </p>
              <p className="text-slate-500">מחוז: מרכז | תחנה: חולון | תפקיד: לוחם אש</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" dir="rtl">
              {/* Device Type */}
              <div>
                <Label className="block text-sm font-semibold text-slate-900 mb-2">
                  סוג מכשיר *
                </Label>
                <Select 
                  onValueChange={(value) => setValue('deviceType', value)}
                  defaultValue=""
                  disabled={loadingCategories}
                >
                  <SelectTrigger className={errors.deviceType ? 'border-red-500' : ''}>
                    <SelectValue placeholder={loadingCategories ? 'טוען...' : 'בחר סוג מכשיר'} />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceCategories.length === 0 ? (
                      <SelectItem value="__none__" disabled>אין קטגוריות זמינות</SelectItem>
                    ) : (
                      deviceCategories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.deviceType && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.deviceType.message}
                  </p>
                )}
              </div>

              {/* Device ID */}
              <div>
                <Label className="block text-sm font-semibold text-slate-900 mb-2">
                  מזהה/מספר מכשיר *
                </Label>
                <Input
                  placeholder="לדוגמה: PC-12345"
                  {...register('deviceId')}
                  className={errors.deviceId ? 'border-red-500' : ''}
                />
                {errors.deviceId && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.deviceId.message}
                  </p>
                )}
              </div>

              {/* Incident Type */}
              <div>
                <Label className="block text-sm font-semibold text-slate-900 mb-2">
                  סוג אירוע *
                </Label>
                <Select 
                  onValueChange={(value) => setValue('incidentType', value)}
                  defaultValue=""
                >
                  <SelectTrigger className={errors.incidentType ? 'border-red-500' : ''}>
                    <SelectValue placeholder="בחר סוג אירוע" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOSS">אובדן</SelectItem>
                    <SelectItem value="DAMAGE">נזק</SelectItem>
                  </SelectContent>
                </Select>
                {errors.incidentType && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.incidentType.message}
                  </p>
                )}
              </div>

              {/* Incident Date */}
              <div>
                <Label className="block text-sm font-semibold text-slate-900 mb-2">
                  תאריך האירוע *
                </Label>
                <Input
                  type="date"
                  {...register('incidentDate')}
                  className={errors.incidentDate ? 'border-red-500' : ''}
                />
                {errors.incidentDate && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.incidentDate.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <Label className="block text-sm font-semibold text-slate-900 mb-2">
                  תיאור האירוע * (מינימום 10 תווים)
                </Label>
                <Textarea
                  placeholder="תאר בפירוט מה קרה למכשיר..."
                  {...register('description')}
                  rows={5}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Photo Upload - Conditional */}
              {incidentType === 'DAMAGE' && (
                <div>
                  <Label className="block text-sm font-semibold text-slate-900 mb-2">
                    צילום הנזק * (חובה לדוחות נזק)
                  </Label>
                  <div className={`border-2 border-dashed rounded-lg p-6 transition ${
                    photoUrl ? 'border-green-400 bg-green-50' : 'border-slate-300 bg-slate-50'
                  } ${errors.photoUrl ? 'border-red-500 bg-red-50' : ''}`}>
                    <label className="flex flex-col items-center gap-2 cursor-pointer">
                      <Upload className={`w-8 h-8 ${photoUrl ? 'text-green-600' : 'text-slate-400'}`} />
                      <span className="text-sm font-medium text-slate-700">
                        {isUploadingPhoto ? 'מעלה תמונה...' : photoUrl ? '✓ תמונה הועלתה בהצלחה' : 'לחץ להעלאת תמונה'}
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
                  {errors.photoUrl && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.photoUrl.message}
                    </p>
                  )}
                </div>
              )}

              {/* Commander Selection */}
              <div>
                <Label className="block text-sm font-semibold text-slate-900 mb-2">
                  בחר מפקד לאישור *
                </Label>
                <Select 
                  onValueChange={(value) => setValue('commanderId', value)}
                  defaultValue=""
                >
                  <SelectTrigger className={errors.commanderId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="בחר מפקד" />
                  </SelectTrigger>
                  <SelectContent>
                    {commanders.length === 0 ? (
                      <SelectItem value="__none__" disabled>אין מפקדים רשומים במערכת</SelectItem>
                    ) : (
                      commanders.map((commander) => (
                        <SelectItem key={commander.id} value={commander.id}>
                          {commander.full_name || commander.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.commanderId && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.commanderId.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-semibold"
              >
                {isSubmitting ? 'שלח דיווח...' : 'שלח דיווח'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}