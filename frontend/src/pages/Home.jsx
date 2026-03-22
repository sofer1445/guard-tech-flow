import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useMockUser } from '../components/MockUserContext';
import { fetchReports } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import DevModeBanner from '../components/DevModeBanner';

export default function Home() {
  const { user } = useAuth();
  const { activeMockUser, switchMockUser } = useMockUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentUser = activeMockUser || user;
  const role = currentUser?.role?.toLowerCase();

  useEffect(() => {
    if (!currentUser) return;

    // All roles go directly to their dedicated view
    if (role === 'user') {
      if (location.pathname !== '/MyReports') {
        navigate('/MyReports', { replace: true });
      }
      return;
    }
    if (role === 'commander') {
      if (location.pathname !== '/CommanderApprovals') {
        navigate('/CommanderApprovals', { replace: true });
      }
      return;
    }
    if (role === 'admin') {
      if (location.pathname !== '/AdminDashboard') {
        navigate('/AdminDashboard', { replace: true });
      }
      return;
    }

    // Admin: fetch stats
    const fetchStats = async () => {
      setLoading(true);
      try {
      const reports = await fetchReports();
        setStats({
          total: reports.length,
          approved: reports.filter(r => r.status === 'APPROVED').length,
          rejected: reports.filter(r => r.status === 'REJECTED').length,
          pendingCommander: reports.filter(r => r.status === 'PENDING_COMMANDER').length,
          pendingLogistics: reports.filter(r => r.status === 'PENDING_LOGISTICS').length,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentUser?.id, role, location.pathname, navigate]);

  // Show nothing while redirecting non-admin roles
  if (role === 'user' || role === 'commander') return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 rtl" dir="rtl">
      <DevModeBanner />

      <div className="p-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-1">מערכת ניהול נזק ציוד תקשובי</h1>
              <p className="text-slate-600">
                ברוך הבא, {currentUser?.full_name || currentUser?.name}
                {activeMockUser && <span className="text-amber-600 mr-2">(Mock User)</span>}
              </p>
            </div>

          </div>

          {/* Admin Stats */}
          {!loading && stats && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">סטטוס דיווחים ארצי</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">סה"כ</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold text-slate-900">{stats.total}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-700">ממתין למפקד</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold text-amber-700">{stats.pendingCommander}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-600">ממתין ללוגיסטיקה</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold text-blue-600">{stats.pendingLogistics}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-green-600">אושרו</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold text-green-600">{stats.approved}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-red-600">נדחו</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold text-red-600">{stats.rejected}</p></CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Admin Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  דשבורד ניהולי
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <p className="text-slate-600 flex-1">ניהול ומעקב אחר כל הדוחות והאישורים</p>
                <Link to="/AdminDashboard" className="mt-4 block">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">עבור לדשבורד</Button>
                </Link>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}