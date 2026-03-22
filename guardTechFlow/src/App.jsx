import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { MockUserProvider } from './components/MockUserContext';
// Add page imports here
import Home from './pages/Home';
import SubmitReport from './pages/SubmitReport';
import AdminDashboard from './pages/AdminDashboard';
import CommanderApprovals from './pages/CommanderApprovals';
import MyReports from './pages/MyReports';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Add your page Route elements here */}
      <Route path="/" element={<Navigate to="/Home" replace />} />
      <Route path="/AdminDashboard" element={<AdminDashboard />} />
      <Route path="/CommanderApprovals" element={<CommanderApprovals />} />
      <Route path="/MyReports" element={<MyReports />} />
      <Route path="/Home" element={<Home />} />
      <Route path="/SubmitReport" element={<SubmitReport />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <MockUserProvider>
          <Router>
            <AuthenticatedApp />
          </Router>
        </MockUserProvider>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App