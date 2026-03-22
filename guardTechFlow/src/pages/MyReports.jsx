import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useMockUser } from '../components/MockUserContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader, FileText, Edit, X, Search } from 'lucide-react';
import DevModeBanner from '../components/DevModeBanner';
import EditReportModal from '../components/EditReportModal';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const STATUS_LABELS = {
  PENDING_COMMANDER: { label: 'ממתין לאישור מפקד', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  PENDING_LOGISTICS: { label: 'ממתין ללוגיסטיקה', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  APPROVED: { label: 'אושר', color: 'bg-green-100 text-green-800 border-green-300' },
  REJECTED: { label: 'נדחה', color: 'bg-red-100 text-red-800 border-red-300' },
};

const DEVICE_TYPE_LABELS = {
  LAPTOP: 'מחשב נייד', DESKTOP: 'מכשיר קשר', MONITOR: 'מסך', PRINTER: 'מדפסת',
  PHONE: 'טלפון', TABLET: 'טאבלט', ROUTER: 'נתב', SERVER: 'שרת', OTHER: 'אחר',
};

export default function MyReports() {
  const { user } = useAuth();
  const { activeMockUser } = useMockUser();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const [searchQuery, setSearchQuery] = useState('');

  const currentUser = activeMockUser || user;
  const currentUserId = currentUser?.id;

  useEffect(() => {
    if (!currentUserId) return;
    fetchReports();
  }, [currentUserId]);

  const fetchReports = async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      const data = await base44.entities.DamageReport.filter(
        { submitterId: currentUserId },
        '-created_date'
      );
      setReports(data);
    } catch (error) {
      toast.error('שגיאה בטעינת הדוחות');
    } finally {
      setLoading(false);
    }
  };

  const q = searchQuery.toLowerCase().trim();
  const searchedReports = !q ? reports : reports.filter(r =>
    r.deviceId?.toLowerCase().includes(q) || r.deviceType?.toLowerCase().includes(q) || r.submitterName?.toLowerCase().includes(q)
  );
  const totalPages = Math.ceil(searchedReports.length / ITEMS_PER_PAGE);
  const paginatedReports = searchedReports.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 rtl" dir="rtl">
      <DevModeBanner />
      <div className="max-w-6xl mx-auto p-6">

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">מערכת ניהול נזק ציוד תקשובי</h1>
          <p className="text-lg text-slate-600 mb-6">כאן תוכל לראות את כל הדוחות שהגשת בנושא נזק לציוד תקשובי</p>
        </div>

        <div className="flex justify-between items-start mb-8">
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/SubmitReport')} className="bg-blue-600 hover:bg-blue-700">
              הגש דוח
            </Button>
            <p className="text-slate-600 text-sm">כמות הדוחות שהגשת: {reports.length}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="חיפוש לפי שם, סוג מכשיר, מזהה..."
            className="w-full border border-slate-200 rounded-md py-1.5 pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="rtl"
          />
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader className="w-8 h-8 text-slate-400 animate-spin" />
                <p className="text-slate-600">טוען דוחות...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-500">
                <FileText className="w-12 h-12 text-slate-300" />
                <p className="text-lg font-medium">לא הגשת דוחות עדיין</p>
                <Button onClick={() => navigate('/SubmitReport')} className="bg-blue-600 hover:bg-blue-700">
                  הגש דוח ראשון
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>סוג מכשיר</TableHead>
                      <TableHead>מזהה מכשיר</TableHead>
                      <TableHead>סוג אירוע</TableHead>
                      <TableHead>תאריך אירוע</TableHead>
                      <TableHead>עדיפות</TableHead>
                      <TableHead>סטטוס</TableHead>
                      <TableHead>פרטים</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReports.map(report => {
                      const statusInfo = STATUS_LABELS[report.status] || { label: report.status, color: '' };
                      return (
                        <TableRow key={report.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium">
                            {DEVICE_TYPE_LABELS[report.deviceType] || report.deviceType}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">{report.deviceId}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {report.incidentType === 'DAMAGE' ? 'נזק' : 'אובדן'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(report.incidentDate).toLocaleDateString('he-IL')}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium ${
                              report.priority === 'HIGH' ? 'text-red-600' :
                              report.priority === 'MEDIUM' ? 'text-amber-600' : 'text-slate-500'
                            }`}>
                              {report.priority === 'HIGH' ? 'גבוהה' : report.priority === 'MEDIUM' ? 'בינונית' : 'נמוכה'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </TableCell>
                          <TableCell className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSelectedReport(report)}>
                              צפה
                            </Button>
                            {(report.status === 'PENDING_COMMANDER' || report.status === 'PENDING_LOGISTICS') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingReport(report)}
                                className="gap-1"
                              >
                                <Edit className="w-4 h-4" />
                                ערוך
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-1 mt-4 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>הקודם</Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(page)} className="w-8 text-xs">{page}</Button>
                ))}
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>הבא</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" dir="rtl">
            <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="p-1 rounded hover:bg-slate-100 transition text-slate-500 hover:text-slate-800"
                    aria-label="סגור"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <CardTitle className="text-right">פרטי הדוח</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 border-b pb-4">
                  <div>
                    <p className="text-sm text-slate-500">סוג מכשיר</p>
                    <p className="font-semibold">{DEVICE_TYPE_LABELS[selectedReport.deviceType] || selectedReport.deviceType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">מזהה מכשיר</p>
                    <p className="font-semibold">{selectedReport.deviceId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">סוג אירוע</p>
                    <p className="font-semibold">{selectedReport.incidentType === 'DAMAGE' ? 'נזק' : 'אובדן'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">תאריך אירוע</p>
                    <p className="font-semibold">{new Date(selectedReport.incidentDate).toLocaleDateString('he-IL')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">מפקד</p>
                    <p className="font-semibold">{selectedReport.commanderName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">סטטוס</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${STATUS_LABELS[selectedReport.status]?.color}`}>
                      {STATUS_LABELS[selectedReport.status]?.label}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-500 mb-1">תיאור האירוע</p>
                  <p className="bg-slate-50 p-3 rounded border text-sm">{selectedReport.description}</p>
                </div>

                {selectedReport.photoUrl && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">צילום</p>
                    <img src={selectedReport.photoUrl} alt="damage" className="max-w-full rounded-lg border" />
                  </div>
                )}

                {selectedReport.commanderNotes && (
                  <div className="bg-amber-50 p-3 rounded border border-amber-200">
                    <p className="text-sm text-amber-700 font-medium mb-1">הערות מפקד</p>
                    <p className="text-sm">{selectedReport.commanderNotes}</p>
                  </div>
                )}

                {selectedReport.adminNotes && (
                  <div className="bg-purple-50 p-3 rounded border border-purple-200">
                    <p className="text-sm text-purple-700 font-medium mb-1">הערות לוגיסטיקה</p>
                    <p className="text-sm">{selectedReport.adminNotes}</p>
                  </div>
                )}

                {selectedReport.treatmentType && (
                  <div className="bg-green-50 p-3 rounded border border-green-200">
                    <p className="text-sm text-green-700 font-medium mb-1">אופן הטיפול</p>
                    <p className="text-sm">{selectedReport.treatmentType}</p>
                  </div>
                )}

                <Button variant="outline" className="w-full" onClick={() => setSelectedReport(null)}>
                  סגור
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Modal */}
        <EditReportModal
          report={editingReport}
          onClose={() => setEditingReport(null)}
          onSuccess={() => {
            fetchReports();
            setEditingReport(null);
          }}
        />
      </div>
    </div>
  );
}