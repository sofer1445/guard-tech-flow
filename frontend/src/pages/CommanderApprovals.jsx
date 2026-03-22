import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useMockUser } from '../components/MockUserContext';
import { approveReport, fetchReports } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import DevModeBanner from '../components/DevModeBanner';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Loader, LogOut, FileText, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const STATUS_LABELS = {
  PENDING_COMMANDER: { label: 'ממתין לאישורך', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  PENDING_LOGISTICS: { label: 'ממתין ללוגיסטיקה', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  APPROVED: { label: 'אושר', color: 'bg-green-100 text-green-800 border-green-300' },
  REJECTED: { label: 'נדחה', color: 'bg-red-100 text-red-800 border-red-300' },
};

const DEVICE_TYPE_LABELS = {
  LAPTOP: 'מחשב נייד', DESKTOP: 'מכשיר קשר', MONITOR: 'מסך', PRINTER: 'מדפסת',
  PHONE: 'טלפון', TABLET: 'טאבלט', ROUTER: 'נתב', SERVER: 'שרת', OTHER: 'אחר',
};

const TABS = [
  { key: 'pending', label: 'ממתינים לאישורי' },
  { key: 'history', label: 'היסטוריית אישורים' },
  { key: 'mine', label: 'הדוחות שלי' },
];

export default function CommanderApprovals() {
  const { user, logout } = useAuth();
  const { activeMockUser, switchMockUser } = useMockUser();
  const navigate = useNavigate();

  const [allReports, setAllReports] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedReport, setSelectedReport] = useState(null);
  const [commanderNotes, setCommanderNotes] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const [searchQuery, setSearchQuery] = useState('');

  const currentUser = activeMockUser || user;

  useEffect(() => {
    const role = currentUser?.role?.toLowerCase?.();
    if (role !== 'commander' && role !== 'admin') {
      navigate('/Home');
      return;
    }
    fetchData();
  }, [currentUser?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const allReports = await fetchReports();
      
      const assigned = allReports.filter(r => r.commanderId === currentUser.id);
      const submitted = allReports.filter(r => r.submitterId === currentUser.id);
      
      setAllReports(assigned.sort((a, b) => {
        const order = { PENDING_COMMANDER: 0, PENDING_LOGISTICS: 1, APPROVED: 2, REJECTED: 3 };
        return (order[a.status] ?? 99) - (order[b.status] ?? 99) ||
          new Date(b.incidentDate) - new Date(a.incidentDate);
      }));
      setMyReports(submitted.sort((a, b) => new Date(b.incidentDate) - new Date(a.incidentDate)));
    } catch {
      toast.error('שגיאה בטעינת הדוחות');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setIsActionLoading(true);
    try {
      await approveReport({
        reportId: selectedReport.id,
        approved: true,
        notes: commanderNotes,
      });
      toast.success('הדוח אושר והועבר ללוגיסטיקה');
      setSelectedReport(null);
      setCommanderNotes('');
      setRejectMode(false);
      setRejectNotes('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'שגיאה בעדכון הדוח');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectNotes.trim()) {
      toast.error('חובה לספק נימוק לדחייה');
      return;
    }
    setIsActionLoading(true);
    try {
      await approveReport({
        reportId: selectedReport.id,
        approved: false,
        notes: rejectNotes,
      });
      toast.success('הדוח נדחה');
      setSelectedReport(null);
      setCommanderNotes('');
      setRejectMode(false);
      setRejectNotes('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'שגיאה בעדכון הדוח');
    } finally {
      setIsActionLoading(false);
    }
  };

  const pendingReports = allReports.filter(r => r.status === 'PENDING_COMMANDER');
  const historyReports = allReports.filter(r => r.status !== 'PENDING_COMMANDER');

  const tabReports = activeTab === 'pending' ? pendingReports
    : activeTab === 'history' ? historyReports
    : myReports;

  const pendingCount = pendingReports.length;

  const q = searchQuery.toLowerCase().trim();
  const searchedReports = !q ? tabReports : tabReports.filter(r =>
    r.deviceId?.toLowerCase().includes(q) || r.deviceType?.toLowerCase().includes(q) || r.submitterName?.toLowerCase().includes(q)
  );
  const totalPages = Math.ceil(searchedReports.length / ITEMS_PER_PAGE);
  const paginatedReports = searchedReports.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleTabChange = (key) => { setActiveTab(key); setCurrentPage(1); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 rtl" dir="rtl">
      <DevModeBanner />

      <div className="p-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">מערכת ניהול נזק ציוד תקשובי</h1>
            <p className="text-lg text-slate-600 mb-6">כאן תוכל לראות את כל הדוחות שהגשת או שהוגשו לאישורך בנושא נזק לציוד תקשובי</p>
            <p className="text-slate-600">
              {currentUser?.full_name || currentUser?.name}
              {pendingCount > 0 && (
                <span className="text-amber-700 font-semibold mr-2">• {pendingCount} דוחות ממתינים לאישורך</span>
              )}
            </p>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              <Button onClick={() => navigate('/SubmitReport')} className="bg-blue-600 hover:bg-blue-700 gap-2">
                <FileText className="w-4 h-4" />
                הגש דוח
              </Button>
              <Button variant="outline" onClick={logout} className="gap-2">
                <LogOut className="w-4 h-4" />
                התנתק
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-6 gap-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative ${
                  activeTab === tab.key
                    ? 'bg-white border border-b-white border-slate-200 text-slate-900 -mb-px'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {tab.label}
                {tab.key === 'pending' && pendingCount > 0 && (
                  <span className="mr-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-amber-500 text-white rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
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

          {/* Table */}
          <Card>
            <CardContent className="pt-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <Loader className="w-8 h-8 text-slate-400 animate-spin" />
                  <p className="text-slate-600">טוען דוחות...</p>
                </div>
              ) : tabReports.length === 0 ? (
                <div className="text-center py-14 text-slate-500">
                  <p className="text-lg">אין דוחות להצגה</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {activeTab !== 'mine' && <TableHead>שם מדווח</TableHead>}
                        <TableHead>סוג מכשיר</TableHead>
                        <TableHead>מזהה מכשיר</TableHead>
                        <TableHead>סוג אירוע</TableHead>
                        <TableHead>תאריך</TableHead>
                        <TableHead>סטטוס</TableHead>
                        <TableHead>פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedReports.map(report => {
                        const statusInfo = STATUS_LABELS[report.status] || { label: report.status, color: '' };
                        const isPending = report.status === 'PENDING_COMMANDER';
                        return (
                          <TableRow key={report.id} className={`hover:bg-slate-50 ${isPending ? 'bg-amber-50/40' : ''}`}>
                            {activeTab !== 'mine' && (
                              <TableCell className="font-medium">{report.submitterName}</TableCell>
                            )}
                            <TableCell>{DEVICE_TYPE_LABELS[report.deviceType] || report.deviceType}</TableCell>
                            <TableCell className="text-sm text-slate-600">{report.deviceId}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{report.incidentType === 'DAMAGE' ? 'נזק' : 'אובדן'}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(report.incidentDate).toLocaleDateString('he-IL')}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant={isPending ? 'default' : 'outline'}
                                onClick={() => { setSelectedReport(report); setCommanderNotes(''); }}
                                className={isPending ? 'bg-amber-600 hover:bg-amber-700' : ''}
                              >
                                {isPending ? 'טפל' : 'צפה'}
                              </Button>
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
        </div>
      </div>

      {/* Report Detail / Approval Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" dir="rtl">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <button
                  onClick={() => { setSelectedReport(null); setCommanderNotes(''); setRejectMode(false); setRejectNotes(''); }}
                  className="p-1 rounded hover:bg-slate-100 transition text-slate-500 hover:text-slate-800"
                  aria-label="סגור"
                >
                  <X className="w-5 h-5" />
                </button>
                <CardTitle className="text-right">
                  {selectedReport.status === 'PENDING_COMMANDER' ? 'אישור דוח - החלטת מפקד' : 'פרטי הדוח'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <p className="text-sm text-slate-500">שם מדווח</p>
                  <p className="font-semibold">{selectedReport.submitterName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">אימייל</p>
                  <p className="font-semibold text-sm">{selectedReport.submitterEmail}</p>
                </div>
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
                <div className="col-span-2">
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
                  <p className="text-sm text-slate-500 mb-1">צילום הנזק</p>
                  <img src={selectedReport.photoUrl} alt="damage" className="max-w-full rounded-lg border" />
                </div>
              )}

              {selectedReport.status === 'PENDING_COMMANDER' && (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 space-y-3">
                  <p className="font-semibold text-amber-900">החלטת מפקד</p>

                  {/* Commander approval notes — always shown, optional */}
                  {!rejectMode && (
                    <Textarea
                      placeholder="הערות על הדוח (אופציונלי)"
                      value={commanderNotes}
                      onChange={(e) => setCommanderNotes(e.target.value)}
                      rows={3}
                    />
                  )}

                  {/* Reject reason — revealed only after clicking "דחה דוח" */}
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
                          disabled={isActionLoading}
                          className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                        >
                          {isActionLoading && <Loader className="w-4 h-4 animate-spin" />}
                          <Check className="w-4 h-4" />
                          אשר והעבר ללוגיסטיקה
                        </Button>
                        <Button
                          onClick={() => setRejectMode(true)}
                          disabled={isActionLoading}
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
                          disabled={isActionLoading || !rejectNotes.trim()}
                          variant="destructive"
                          className="flex-1 gap-2"
                        >
                          {isActionLoading && <Loader className="w-4 h-4 animate-spin" />}
                          <X className="w-4 h-4" />
                          אשר דחייה
                        </Button>
                        <Button
                          onClick={() => { setRejectMode(false); setRejectNotes(''); }}
                          disabled={isActionLoading}
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

              {selectedReport.commanderNotes && selectedReport.status !== 'PENDING_COMMANDER' && (
                <div className="bg-slate-50 p-3 rounded border">
                  <p className="text-sm text-slate-500 mb-1">הערות מפקד</p>
                  <p className="text-sm">{selectedReport.commanderNotes}</p>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => { setSelectedReport(null); setCommanderNotes(''); setRejectMode(false); setRejectNotes(''); }}
                className="w-full"
                disabled={isActionLoading}
              >
                סגור
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}