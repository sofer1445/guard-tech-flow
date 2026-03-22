import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useMockUser } from '../components/MockUserContext';
import { fetchReports } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Loader, Download, ArrowUpDown, ArrowUp, ArrowDown, Settings, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AdminReportModal from '@/components/AdminReportModal';
import SystemSettingsModal from '@/components/SystemSettingsModal';
import DevModeBanner from '@/components/DevModeBanner';

const statusColors = {
  PENDING_COMMANDER: 'bg-yellow-100 text-yellow-800',
  PENDING_LOGISTICS: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800'
};

const statusLabels = {
  PENDING_COMMANDER: 'ממתין לאישור מפקד',
  PENDING_LOGISTICS: 'ממתין לאישור רע"ן',
  APPROVED: 'אושר',
  REJECTED: 'נדחה'
};

export default function AdminDashboard() {
  const { user: authUser } = useAuth();
  const { activeMockUser } = useMockUser();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filter, setFilter] = useState('all');
  const [dateSortDir, setDateSortDir] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentUser = activeMockUser || authUser;

  useEffect(() => {
    const role = currentUser?.role?.toLowerCase?.();
    if (role !== 'admin') {
      navigate('/Home', { replace: true });
      return;
    }
    fetchReportsData();
  }, [currentUser?.id, currentUser?.role, navigate]);

  const fetchReportsData = async () => {
    try {
      const allReports = await fetchReports();
      setReports(allReports);
    } catch (error) {
      toast.error('שגיאה בטעינת הדוחות');
    } finally {
      setLoading(false);
    }
  };

  const handleModalSuccess = () => {
    fetchReportsData();
  };



  const filteredReports = (() => {
    const q = searchQuery.toLowerCase().trim();
    const base = (filter === 'all' ? reports : reports.filter(r => r.status === filter))
      .filter(r => !q || r.deviceId?.toLowerCase().includes(q) || r.deviceType?.toLowerCase().includes(q) || r.submitterName?.toLowerCase().includes(q));
    if (!dateSortDir) return base;
    return [...base].sort((a, b) => {
      const diff = new Date(a.incidentDate) - new Date(b.incidentDate);
      return dateSortDir === 'asc' ? diff : -diff;
    });
  })();

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedReports = filteredReports.slice(startIdx, startIdx + itemsPerPage);

  const toggleDateSort = () => {
    setDateSortDir(prev => prev === null ? 'asc' : prev === 'asc' ? 'desc' : null);
  };

  const exportToCSV = () => {
    const headers = 'שם מדווח,סוג מכשיר,מזהה מכשיר,סוג אירוע,תאריך אירוע,סטטוס,אופן טיפול,הערות';
    const rows = filteredReports.map(r => [
      r.submitterName,
      r.deviceType,
      r.deviceId,
      r.incidentType === 'DAMAGE' ? 'נזק' : 'אובדן',
      new Date(r.incidentDate).toLocaleDateString('he-IL'),
      statusLabels[r.status] || r.status,
      r.treatmentType || '',
      r.adminNotes || ''
    ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));

    const csv = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'damage_reports.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 md:p-8 rtl" dir="rtl">
      <DevModeBanner />
      <div className="w-full max-w-[95%] mx-auto">

        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">ניהול נזקים לציוד תקשובי - דאשבורד מנהל</h1>
          <Button variant="outline" onClick={() => setShowSystemSettings(true)} className="gap-2">
            <Settings className="w-4 h-4" />
            הגדרות מערכת
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`p-4 md:p-6 rounded-lg border-2 transition ${
              filter === 'all'
                ? 'bg-white border-blue-500 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="text-slate-600 text-sm md:text-lg font-medium">סה"כ</p>
            <p className="text-4xl md:text-5xl font-bold text-slate-900">{reports.length}</p>
          </button>

          <button
            onClick={() => setFilter('PENDING_COMMANDER')}
            className={`p-4 md:p-6 rounded-lg border-2 transition ${
              filter === 'PENDING_COMMANDER'
                ? 'bg-white border-blue-500 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="text-amber-600 text-sm md:text-lg font-medium">ממתין למפקד</p>
            <p className="text-4xl md:text-5xl font-bold text-amber-600">{reports.filter(r => r.status === 'PENDING_COMMANDER').length}</p>
          </button>

          <button
            onClick={() => setFilter('PENDING_LOGISTICS')}
            className={`p-4 md:p-6 rounded-lg border-2 transition ${
              filter === 'PENDING_LOGISTICS'
                ? 'bg-white border-blue-500 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="text-blue-600 text-sm md:text-lg font-medium">ממתין ללוגיסטיקה</p>
            <p className="text-4xl md:text-5xl font-bold text-blue-600">{reports.filter(r => r.status === 'PENDING_LOGISTICS').length}</p>
          </button>

          <button
            onClick={() => setFilter('APPROVED')}
            className={`p-4 md:p-6 rounded-lg border-2 transition ${
              filter === 'APPROVED'
                ? 'bg-white border-blue-500 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="text-green-600 text-sm md:text-lg font-medium">אושר</p>
            <p className="text-4xl md:text-5xl font-bold text-green-600">{reports.filter(r => r.status === 'APPROVED').length}</p>
          </button>

          <button
            onClick={() => setFilter('REJECTED')}
            className={`p-4 md:p-6 rounded-lg border-2 transition ${
              filter === 'REJECTED'
                ? 'bg-white border-blue-500 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="text-red-600 text-sm md:text-lg font-medium">נדחה</p>
            <p className="text-4xl md:text-5xl font-bold text-red-600">{reports.filter(r => r.status === 'REJECTED').length}</p>
          </button>
        </div>

        {/* Reports Table */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="חיפוש לפי שם, סוג מכשיר, מזהה..."
                  className="w-full border border-slate-200 rounded-md py-3 pr-10 pl-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  dir="rtl"
                />
              </div>
              <CardTitle>{filteredReports.length} דוחות</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader className="w-8 h-8 text-slate-400 animate-spin" />
                <p className="text-slate-600 font-medium">טוען דוחות...</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-base font-bold">שם מדווח</TableHead>
                        <TableHead className="text-base font-bold">סוג מכשיר</TableHead>
                        <TableHead className="text-base font-bold">מזהה מכשיר</TableHead>
                        <TableHead className="text-base font-bold">סוג אירוע</TableHead>
                        <TableHead
                          className="text-base font-bold cursor-pointer select-none hover:text-slate-900"
                          onClick={toggleDateSort}
                        >
                          <span className="flex items-center gap-1">
                            תאריך אירוע
                            {dateSortDir === null && <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />}
                            {dateSortDir === 'asc' && <ArrowUp className="w-3.5 h-3.5 text-blue-600" />}
                            {dateSortDir === 'desc' && <ArrowDown className="w-3.5 h-3.5 text-blue-600" />}
                          </span>
                        </TableHead>
                        <TableHead className="text-base font-bold">סטטוס</TableHead>
                        <TableHead className="text-base font-bold">פעולה</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedReports.map(report => (
                        <TableRow key={report.id} className="hover:bg-slate-50">
                           <TableCell className="font-medium text-base py-4">{report.submitterName}</TableCell>
                           <TableCell className="text-base py-4">{report.deviceType}</TableCell>
                           <TableCell className="text-base py-4 text-slate-600">{report.deviceId}</TableCell>
                           <TableCell className="py-4">
                             <Badge variant="outline" className="text-sm px-2 py-1">
                               {report.incidentType === 'DAMAGE' ? 'נזק' : 'אובדן'}
                             </Badge>
                           </TableCell>
                           <TableCell className="text-base py-4">
                             {new Date(report.incidentDate).toLocaleDateString('he-IL')}
                           </TableCell>
                           <TableCell className="py-4">
                             <Badge className={`${statusColors[report.status]} text-sm px-2 py-1`}>
                               {statusLabels[report.status]}
                             </Badge>
                           </TableCell>
                           <TableCell className="py-4">
                             <Button
                               variant="outline"
                               onClick={() => setSelectedReport(report)}
                               className="text-base px-4 py-2"
                             >
                               צפה בפרטים
                             </Button>
                           </TableCell>
                         </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {paginatedReports.map(report => (
                    <div key={report.id} className="bg-white border border-slate-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{report.submitterName}</p>
                          <p className="text-xs text-slate-600">{report.deviceId}</p>
                        </div>
                        <Badge className={statusColors[report.status]} className="text-xs">
                          {statusLabels[report.status]}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3 border-t border-b py-2">
                        <div>
                          <p className="text-slate-500">סוג מכשיר</p>
                          <p className="font-medium">{report.deviceType}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">סוג אירוע</p>
                          <p className="font-medium">{report.incidentType === 'DAMAGE' ? 'נזק' : 'אובדן'}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 mb-3">{new Date(report.incidentDate).toLocaleDateString('he-IL')}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedReport(report)}
                        className="w-full"
                      >
                        צפה בפרטים
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pagination + Export Row */}
            <div className="flex justify-between items-center mt-4 flex-wrap gap-2">
              <Button variant="outline" onClick={exportToCSV} className="gap-2 text-base px-4 py-2">
                <Download className="w-4 h-4" />
                ייצוא לאקסל
              </Button>
              {totalPages > 1 && (
                <div className="flex items-center gap-1 md:gap-2 flex-wrap justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="text-xs md:text-sm"
                  >
                    הקודם
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-7 md:w-8 text-xs"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="text-xs md:text-sm"
                  >
                    הבא
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Settings Modal */}
        {showSystemSettings && (
          <SystemSettingsModal onClose={() => setShowSystemSettings(false)} />
        )}

        {/* Details Modal */}
        <AdminReportModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onSuccess={handleModalSuccess}
        />
      </div>
    </div>
  );
}